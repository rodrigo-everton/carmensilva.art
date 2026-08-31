import type {LucideIcon} from "lucide-react"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  House,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import Link from "next/link"

import Container from "@/components/ui/Container"

export type PaymentReturnStatus = "success" | "pending" | "failure"

type PaymentReturnPageProps = {
  status: PaymentReturnStatus
  conversationId?: string | string[]
}

type ReturnContent = {
  eyebrow: string
  title: string
  description: string
  statusLabel: string
  statusMessage: string
  messageStatus: "sucesso" | "pendente" | "falha"
  icon: LucideIcon
  iconClassName: string
  noticeClassName: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const RETURN_CONTENT: Record<PaymentReturnStatus, ReturnContent> = {
  success: {
    eyebrow: "Retorno do checkout",
    title: "Pagamento enviado",
    description:
      "Recebemos o retorno do Mercado Pago. A confirmação definitiva aparecerá na sua conversa assim que o pagamento for validado.",
    statusLabel: "Retorno recebido",
    statusMessage: "Não é necessário realizar um novo pagamento.",
    messageStatus: "sucesso",
    icon: CheckCircle2,
    iconClassName: "bg-green text-white",
    noticeClassName: "border-green/20 bg-green-secondary/70 text-green-hover",
  },
  pending: {
    eyebrow: "Retorno do checkout",
    title: "Pagamento em análise",
    description:
      "O processamento ainda não terminou. Você pode voltar à conversa e acompanhar a atualização do pagamento por lá.",
    statusLabel: "Confirmação pendente",
    statusMessage: "Aguarde a validação antes de tentar pagar novamente.",
    messageStatus: "pendente",
    icon: Clock3,
    iconClassName: "bg-orange-secondary text-red",
    noticeClassName: "border-orange/25 bg-orange-secondary/55 text-red",
  },
  failure: {
    eyebrow: "Retorno do checkout",
    title: "Pagamento não concluído",
    description:
      "O checkout não confirmou o pagamento. Volte à conversa para conferir a cobrança e tentar novamente pelo mesmo link.",
    statusLabel: "Não houve confirmação",
    statusMessage: "Nenhum pagamento é considerado concluído por esta página.",
    messageStatus: "falha",
    icon: XCircle,
    iconClassName: "bg-red text-white",
    noticeClassName: "border-red/20 bg-red-secondary/55 text-red-hover",
  },
}

function getConversationHref(
  value: string | string[] | undefined,
  paymentStatus: ReturnContent["messageStatus"],
) {
  const conversationId = Array.isArray(value) ? value[0] : value
  const searchParams = new URLSearchParams({pagamento: paymentStatus})

  if (conversationId && UUID_PATTERN.test(conversationId)) {
    searchParams.set("conversa", conversationId)
  }

  return `/mensagem?${searchParams.toString()}`
}

export default function PaymentReturnPage({
  status,
  conversationId,
}: PaymentReturnPageProps) {
  const content = RETURN_CONTENT[status]
  const Icon = content.icon
  const conversationHref = getConversationHref(
    conversationId,
    content.messageStatus,
  )

  return (
    <div className="overflow-hidden py-10 sm:py-16">
      <Container>
        <section
          aria-labelledby="payment-return-title"
          className="mx-auto max-w-3xl overflow-hidden rounded-4xl bg-white shadow-[0_24px_70px_rgba(82,20,38,0.18)]"
        >
          <header className="relative overflow-hidden bg-red px-6 py-10 text-white sm:px-10 sm:py-12">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 size-56 rounded-full border-[1.75rem] border-red-secondary/15"
            />
            <div className="relative flex items-center gap-4">
              <span
                className={`inline-flex size-14 shrink-0 items-center justify-center rounded-2xl ${content.iconClassName}`}
              >
                <Icon className="size-7" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-secondary">
                  {content.eyebrow}
                </p>
                <h1
                  id="payment-return-title"
                  className="mt-1 text-3xl font-semibold sm:text-4xl"
                >
                  {content.title}
                </h1>
              </div>
            </div>
          </header>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 ${content.noticeClassName}`}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">{content.statusLabel}</p>
                <p className="mt-1 text-sm leading-relaxed opacity-80">
                  {content.statusMessage}
                </p>
              </div>
            </div>

            <p className="mt-7 text-base leading-relaxed text-black/65">
              {content.description}
            </p>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-black/[0.035] p-4 text-sm leading-relaxed text-black/60">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0 text-green-hover"
                aria-hidden="true"
              />
              <p>
                O resultado mostrado no navegador é apenas informativo. A compra
                só é confirmada após a validação segura da notificação do Mercado
                Pago.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={conversationHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red px-6 text-sm font-semibold text-white transition-colors hover:bg-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Voltar à conversa
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-red px-6 text-sm font-semibold text-red transition-colors hover:bg-red-secondary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                <House className="size-4" aria-hidden="true" />
                Ir para o início
              </Link>
            </div>
          </div>
        </section>
      </Container>
    </div>
  )
}
