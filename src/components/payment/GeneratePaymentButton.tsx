"use client"

import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  X,
} from "lucide-react"
import {useRouter} from "next/navigation"
import {useId, useRef, useState} from "react"
import type {FormEvent} from "react"

export type ExistingPaymentPreference = {
  id: string
  amountCents: number
  currency: string
  status: string
  checkoutUrl: string | null
}

type GeneratePaymentButtonProps = {
  conversationId: string
  existingPreference?: ExistingPaymentPreference | null
  lookupFailed?: boolean
}

type CreatePaymentResponse = {
  preference?: ExistingPaymentPreference
  existing?: boolean
}

type ParsedAmount = {
  amount: string
  amountCents: number
}

function parseAmount(value: string): ParsedAmount | null {
  const compactValue = value
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "")

  if (!compactValue) {
    return null
  }

  let normalizedValue: string

  if (compactValue.includes(",")) {
    const isBrazilianAmount =
      /^\d+(?:,\d{1,2})?$/.test(compactValue) ||
      /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(compactValue)

    if (!isBrazilianAmount) {
      return null
    }

    normalizedValue = compactValue.replace(/\./g, "").replace(",", ".")
  } else {
    if (!/^\d+(?:\.\d{1,2})?$/.test(compactValue)) {
      return null
    }

    normalizedValue = compactValue
  }

  const [wholePart, fractionPart = ""] = normalizedValue.split(".")

  const wholeAmount = Number(wholePart)
  const fractionalAmount = Number(fractionPart.padEnd(2, "0"))
  const amountCents = wholeAmount * 100 + fractionalAmount

  if (
    !Number.isSafeInteger(wholeAmount) ||
    !Number.isSafeInteger(fractionalAmount) ||
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0
  ) {
    return null
  }

  return {
    amount: `${wholeAmount}.${fractionPart.padEnd(2, "0")}`,
    amountCents,
  }
}

function formatCurrency(amountCents: number, currency: string) {
  const normalizedCurrency = /^[A-Z]{3}$/.test(currency.toUpperCase())
    ? currency.toUpperCase()
    : "BRL"

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amountCents / 100)
  } catch {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountCents / 100)
  }
}

function getSafeCheckoutUrl(value: string | null | undefined) {
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "creating":
      return "Preparando link"
    case "active":
      return "Aguardando pagamento"
    case "approved":
    case "paid":
      return "Pagamento confirmado"
    case "expired":
      return "Link expirado"
    case "cancelled":
    case "canceled":
      return "Pagamento cancelado"
    default:
      return "Pagamento gerado"
  }
}

function getRequestErrorMessage(status: number) {
  if (status === 400) {
    return "Confira o valor informado e tente novamente."
  }

  if (status === 401 || status === 403) {
    return "Sua sessão não permite gerar este pagamento. Atualize a página e entre novamente."
  }

  if (status === 404) {
    return "Esta conversa não está mais disponível."
  }

  return "Não foi possível gerar o pagamento agora. Tente novamente em instantes."
}

export default function GeneratePaymentButton({
  conversationId,
  existingPreference,
  lookupFailed = false,
}: GeneratePaymentButtonProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [amountInput, setAmountInput] = useState("")
  const [createdPreference, setCreatedPreference] =
    useState<ExistingPaymentPreference | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle")

  const preference = createdPreference ?? existingPreference ?? null
  const checkoutUrl = getSafeCheckoutUrl(preference?.checkoutUrl)

  function openDialog() {
    setErrorMessage(null)
    setSuccessMessage(null)
    setCopyState("idle")
    dialogRef.current?.showModal()
  }

  function closeDialog() {
    dialogRef.current?.close()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (preference || lookupFailed || isSubmitting) {
      return
    }

    const parsedAmount = parseAmount(amountInput)

    if (!parsedAmount) {
      setErrorMessage("Informe um valor válido e maior que zero. Ex.: 1.500,00.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setCopyState("idle")

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          amount: parsedAmount.amount,
        }),
      })

      let responseBody: CreatePaymentResponse | null = null

      try {
        responseBody = (await response.json()) as CreatePaymentResponse
      } catch {
        responseBody = null
      }

      if (!response.ok) {
        setErrorMessage(getRequestErrorMessage(response.status))
        return
      }

      const nextPreference = responseBody?.preference

      if (
        !nextPreference ||
        typeof nextPreference.id !== "string" ||
        !Number.isSafeInteger(nextPreference.amountCents) ||
        nextPreference.amountCents <= 0 ||
        typeof nextPreference.currency !== "string" ||
        typeof nextPreference.status !== "string" ||
        (nextPreference.checkoutUrl !== null &&
          typeof nextPreference.checkoutUrl !== "string")
      ) {
        setErrorMessage(
          "O pagamento foi processado, mas a resposta não pôde ser exibida. Atualize a página.",
        )
        router.refresh()
        return
      }

      setCreatedPreference(nextPreference)
      setSuccessMessage(
        responseBody?.existing
          ? "Esta conversa já tinha um pagamento disponível."
          : "Pagamento gerado e compartilhado nesta conversa.",
      )
      router.refresh()
    } catch {
      setErrorMessage("Não foi possível conectar ao serviço de pagamento. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function copyCheckoutUrl() {
    if (!checkoutUrl) {
      return
    }

    try {
      await navigator.clipboard.writeText(checkoutUrl)
      setCopyState("copied")
    } catch {
      setCopyState("error")
    }
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={openDialog}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-orange px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
      >
        <CreditCard className="size-4" aria-hidden="true" />
        Gerar pagamento
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSubmitting) {
            closeDialog()
          }
        }}
        className="m-auto w-[min(92vw,32rem)] rounded-3xl border border-red/10 bg-white p-0 text-black shadow-[0_24px_80px_rgba(23,23,23,0.28)] backdrop:bg-black/55"
      >
        <div className="border-b border-red/10 bg-red px-5 py-5 text-white sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-secondary">
                Mercado Pago
              </p>
              <h2 id={titleId} className="mt-1 text-2xl font-semibold">
                {preference ? "Pagamento da conversa" : "Gerar pagamento"}
              </h2>
              <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-red-secondary">
                {preference
                  ? "Consulte o valor negociado e compartilhe o checkout já criado."
                  : "Informe o valor final combinado com o cliente para criar o checkout."}
              </p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              disabled={isSubmitting}
              aria-label="Fechar"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-red-secondary transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-secondary disabled:cursor-wait disabled:opacity-50"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {lookupFailed ? (
            <div role="alert" className="rounded-2xl bg-red-secondary/45 px-4 py-4 text-sm text-red-hover">
              Não foi possível verificar se esta conversa já possui um pagamento. Atualize a
              página antes de tentar novamente.
            </div>
          ) : preference ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-orange/20 bg-orange-secondary/35 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-hover">
                    {getStatusLabel(preference.status)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red shadow-sm">
                    {preference.currency.toUpperCase()}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight text-red">
                  {formatCurrency(preference.amountCents, preference.currency)}
                </p>
              </div>

              {successMessage && (
                <p role="status" className="flex items-start gap-2 rounded-xl bg-green-secondary/65 px-4 py-3 text-sm font-medium text-green-hover">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {successMessage}
                </p>
              )}

              {checkoutUrl ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={copyCheckoutUrl}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red/20 px-4 text-sm font-semibold text-red transition-colors hover:bg-red-secondary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                  >
                    {copyState === "copied" ? (
                      <Check className="size-4" aria-hidden="true" />
                    ) : (
                      <Copy className="size-4" aria-hidden="true" />
                    )}
                    {copyState === "copied" ? "Link copiado" : "Copiar link"}
                  </button>
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red px-4 text-sm font-semibold text-white transition-colors hover:bg-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                  >
                    Abrir checkout
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </div>
              ) : (
                <div className="rounded-xl bg-green-secondary/55 px-4 py-3 text-sm text-green-hover">
                  O link ainda está sendo preparado. Atualize a conversa em alguns instantes.
                </div>
              )}

              {copyState === "error" && (
                <p role="alert" className="text-sm font-medium text-red-hover">
                  Não foi possível copiar o link. Abra o checkout e copie o endereço do navegador.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor={`${titleId}-amount`} className="text-sm font-semibold text-red">
                  Valor negociado
                </label>
                <div className="mt-2 flex min-h-12 items-center rounded-xl border border-red/20 bg-white transition focus-within:border-orange focus-within:ring-3 focus-within:ring-orange/15">
                  <span className="border-r border-red/10 px-4 text-sm font-semibold text-red/65">
                    R$
                  </span>
                  <input
                    id={`${titleId}-amount`}
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoFocus
                    required
                    maxLength={24}
                    value={amountInput}
                    onChange={(event) => {
                      setAmountInput(event.target.value)
                      setErrorMessage(null)
                    }}
                    placeholder="1.500,00"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-base text-black outline-none placeholder:text-black/30"
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-black/50">
                  Use o valor final acordado com o cliente. A cobrança será criada em reais.
                </p>
              </div>

              {errorMessage && (
                <p role="alert" className="rounded-xl bg-red-secondary/45 px-4 py-3 text-sm font-medium text-red-hover">
                  {errorMessage}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-red transition-colors hover:bg-red-secondary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-wait disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-orange px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-wait disabled:opacity-65"
                >
                  {isSubmitting ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CreditCard className="size-4" aria-hidden="true" />
                  )}
                  {isSubmitting ? "Gerando..." : "Confirmar valor"}
                </button>
              </div>
            </form>
          )}

          {(lookupFailed || (preference && !checkoutUrl)) && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red transition-colors hover:bg-red-secondary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Atualizar conversa
            </button>
          )}
        </div>
      </dialog>
    </>
  )
}
