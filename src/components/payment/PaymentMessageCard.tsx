import {CircleDollarSign, Clock3, ExternalLink} from "lucide-react"

type PaymentMessageCardProps = {
  variant: "admin" | "customer"
  preference: {
    id: string
    amountCents: number
    currency: string
    status: string
    checkoutUrl: string | null
  }
  timestamp: string
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

function getSafeCheckoutUrl(value: string | null) {
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

function getStatusDetails(status: string) {
  switch (status) {
    case "creating":
      return {
        label: "Preparando link",
        className: "bg-orange-secondary text-orange-hover",
      }
    case "active":
    case "pending":
      return {
        label: "Aguardando pagamento",
        className: "bg-orange-secondary text-orange-hover",
      }
    case "approved":
    case "paid":
      return {
        label: "Pagamento confirmado",
        className: "bg-green-secondary text-green-hover",
      }
    case "expired":
      return {
        label: "Link expirado",
        className: "bg-black/8 text-black/55",
      }
    case "superseded":
      return {
        label: "Link substituído",
        className: "bg-black/8 text-black/55",
      }
    case "refunded":
      return {
        label: "Pagamento estornado",
        className: "bg-red-secondary text-red-hover",
      }
    case "failed":
      return {
        label: "Falha ao gerar pagamento",
        className: "bg-red-secondary text-red-hover",
      }
    case "cancelled":
    case "canceled":
      return {
        label: "Pagamento cancelado",
        className: "bg-red-secondary text-red-hover",
      }
    default:
      return {
        label: "Pagamento gerado",
        className: "bg-black/8 text-black/55",
      }
  }
}

export default function PaymentMessageCard({
  variant,
  preference,
  timestamp,
}: PaymentMessageCardProps) {
  const checkoutUrl = getSafeCheckoutUrl(preference.checkoutUrl)
  const statusDetails = getStatusDetails(preference.status)
  const canOpenCheckout =
    checkoutUrl && ["active", "pending"].includes(preference.status)

  return (
    <article
      aria-label={`Pagamento de ${formatCurrency(preference.amountCents, preference.currency)}`}
      className={`max-w-[92%] overflow-hidden rounded-2xl border bg-white shadow-sm sm:max-w-[82%] ${
        variant === "admin"
          ? "ml-auto border-orange/25 rounded-br-md"
          : "mr-auto border-red/15 rounded-bl-md"
      }`}
    >
      <div className="border-b border-red/10 bg-orange-secondary/25 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-red">
            <CircleDollarSign className="size-4 text-orange" aria-hidden="true" />
            Pagamento da obra
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${statusDetails.className}`}>
            {statusDetails.label}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-black/45">
          Valor negociado
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-red">
          {formatCurrency(preference.amountCents, preference.currency)}
        </p>

        {canOpenCheckout ? (
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange ${
              variant === "customer"
                ? "bg-red text-white hover:bg-red-hover"
                : "border border-red/20 text-red hover:bg-red-secondary/35"
            }`}
          >
            {variant === "customer" ? "Pagar com Mercado Pago" : "Abrir checkout"}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : preference.status === "creating" ? (
          <p className="mt-4 rounded-xl bg-green-secondary/45 px-3 py-2.5 text-sm text-green-hover">
            O link de pagamento está sendo preparado.
          </p>
        ) : null}

        <p className="mt-4 flex items-center gap-1.5 text-[0.68rem] text-black/45">
          <Clock3 className="size-3" aria-hidden="true" />
          {timestamp}
        </p>
      </div>
    </article>
  )
}
