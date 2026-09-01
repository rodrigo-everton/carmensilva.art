import type { Metadata } from "next"
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  ReceiptText,
  ShoppingBag,
} from "lucide-react"
import Link from "next/link"

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage"
import {
  loadAdminSales,
  type AdminDeliveryStatus,
  type AdminPaymentStatus,
  type AdminSalesResult,
  type AdminSaleStatus,
  type AdminSaleWarning,
} from "@/lib/admin-sales"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Vendas",
}

type StatusTone = "success" | "warning" | "danger" | "neutral"

type StatusDetails = {
  label: string
  tone: StatusTone
}

const saleStatusDetails: Record<AdminSaleStatus, StatusDetails> = {
  negotiating: { label: "Em negociação", tone: "neutral" },
  awaiting_payment: { label: "Aguardando pagamento", tone: "warning" },
  paid: { label: "Paga", tone: "success" },
  preparing_delivery: { label: "Preparando entrega", tone: "warning" },
  shipped: { label: "Enviada", tone: "warning" },
  delivered: { label: "Entregue", tone: "success" },
  completed: { label: "Concluída", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
  unknown: { label: "Status indisponível", tone: "neutral" },
}

const paymentStatusDetails: Record<AdminPaymentStatus, StatusDetails> = {
  not_started: { label: "Não iniciado", tone: "neutral" },
  creating: { label: "Preparando link", tone: "warning" },
  active: { label: "Aguardando pagamento", tone: "warning" },
  pending: { label: "Aguardando pagamento", tone: "warning" },
  approved: { label: "Pago", tone: "success" },
  paid: { label: "Pago", tone: "success" },
  rejected: { label: "Recusado", tone: "danger" },
  refunded: { label: "Estornado", tone: "danger" },
  superseded: { label: "Link substituído", tone: "neutral" },
  expired: { label: "Link expirado", tone: "neutral" },
  failed: { label: "Falha no pagamento", tone: "danger" },
  unknown: { label: "Status indisponível", tone: "neutral" },
}

const deliveryStatusDetails: Record<AdminDeliveryStatus, StatusDetails> = {
  not_started: { label: "Não iniciada", tone: "neutral" },
  not_registered: { label: "Não cadastrada", tone: "danger" },
  pending: { label: "Pendente", tone: "warning" },
  preparing: { label: "Em preparação", tone: "warning" },
  shipped: { label: "Enviada", tone: "warning" },
  delivered: { label: "Entregue", tone: "success" },
  cancelled: { label: "Cancelada", tone: "danger" },
  unknown: { label: "Status indisponível", tone: "neutral" },
}

const statusToneClasses: Record<StatusTone, string> = {
  success: "bg-green-secondary text-green-hover",
  warning: "bg-orange-secondary text-red-hover",
  danger: "bg-red-secondary text-red-hover",
  neutral: "bg-black/8 text-black/70",
}

const warningSourceLabels: Record<AdminSaleWarning, string> = {
  customers: "nomes dos clientes",
  artworks: "dados das obras",
  payments: "pagamentos",
  payment_preferences: "links de pagamento",
  deliveries: "entregas",
}

const warningListFormatter = new Intl.ListFormat("pt-BR", {
  style: "long",
  type: "conjunction",
})

const saleDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
})

function StatusBadge({ details }: { details: StatusDetails }) {
  return (
    <span
      className={`inline-flex w-fit whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusToneClasses[details.tone]}`}
    >
      {details.label}
    </span>
  )
}

function formatDate(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : saleDateFormatter.format(date)
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount === null || !currency) {
    return null
  }

  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(amount)
  } catch {
    return null
  }
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase()
}

export default async function AdminVendaPage() {
  await requireAdmin()

  let salesResult: AdminSalesResult | null = null

  try {
    salesResult = await loadAdminSales()
  } catch (error) {
    console.error(
      "Não foi possível carregar a lista de vendas.",
      error instanceof Error ? error.message : error,
    )
  }

  const sales = salesResult?.sales ?? []
  const warnings = salesResult?.warnings ?? []
  const conflicts = sales.filter(({ hasPaymentConflict }) => hasPaymentConflict)
  const recordCountLabel = `${sales.length} ${
    sales.length === 1 ? "registro" : "registros"
  }`
  const warningDescription = warningListFormatter.format(
    warnings.map((warning) => warningSourceLabels[warning]),
  )
  const artworksUnavailable = warnings.includes("artworks")
  const customersUnavailable = warnings.includes("customers")
  const paymentsArePartial = warnings.some((warning) =>
    ["payments", "payment_preferences"].includes(warning),
  )
  const deliveriesArePartial = warnings.includes("deliveries")
  const tableDescriptionIds = [
    warnings.length > 0 ? "sales-data-warning" : null,
    conflicts.length > 0 ? "sales-conflict-warning" : null,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operação"
        title="Vendas"
        description="Acompanhe pedidos, pagamentos e entregas das obras."
        icon={ShoppingBag}
      />

      <section
        aria-labelledby="vendas-heading"
        className="overflow-hidden rounded-2xl border border-red/10 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-2 border-b border-red/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-hover">
              Registros
            </p>
            <h2 id="vendas-heading" className="mt-1 text-2xl font-semibold text-red">
              Lista de vendas
            </h2>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              salesResult
                ? "bg-green-secondary text-green-hover"
                : "bg-red-secondary text-red-hover"
            }`}
          >
            {salesResult ? recordCountLabel : "Indisponível"}
          </span>
        </div>

        {!salesResult ? (
          <div
            role="alert"
            className="flex items-start gap-3 px-5 py-10 text-sm sm:px-6"
          >
            <AlertCircle
              className="mt-0.5 size-5 shrink-0 text-red-hover"
              aria-hidden="true"
            />
            <div>
              <h3 className="font-semibold text-red">
                Não foi possível carregar as vendas
              </h3>
              <p className="mt-1 text-black/65">
                Atualize a página ou tente novamente.
              </p>
              <Link
                href="/admin/venda"
                prefetch={false}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-red px-4 text-sm font-semibold text-white transition-colors hover:bg-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                Tentar novamente
              </Link>
            </div>
          </div>
        ) : sales.length === 0 ? (
          <AdminEmptyState
            icon={ReceiptText}
            title="Nenhuma venda registrada"
            description="As vendas aparecerão aqui quando forem iniciadas nas conversas com clientes."
          />
        ) : (
          <>
            {conflicts.length > 0 && (
              <div
                id="sales-conflict-warning"
                role="alert"
                className="flex items-start gap-3 border-b border-red/15 bg-red-secondary/45 px-5 py-3 text-sm text-red-hover sm:px-6"
              >
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <strong>
                    {conflicts.length}{" "}
                    {conflicts.length === 1
                      ? "venda precisa"
                      : "vendas precisam"}{" "}
                    de revisão.
                  </strong>{" "}
                  Há divergência de status, valor, moeda ou ambiente entre os
                  registros.
                </span>
              </div>
            )}

            {warnings.length > 0 && (
              <div
                id="sales-data-warning"
                role="status"
                className="flex items-start gap-3 border-b border-orange/15 bg-orange-secondary/25 px-5 py-3 text-sm text-black/70 sm:px-6"
              >
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0 text-red"
                  aria-hidden="true"
                />
                Não foi possível carregar integralmente {warningDescription}.
                Os campos afetados aparecem como indisponíveis ou parciais.
              </div>
            )}

            <div
              role="region"
              aria-label="Tabela de vendas registradas"
              tabIndex={0}
              className="overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-orange"
            >
              <table
                aria-describedby={tableDescriptionIds || undefined}
                className="w-full min-w-[52rem] border-collapse text-left text-sm"
              >
                <caption className="sr-only">
                  Vendas registradas, clientes, pagamentos, entregas e totais
                </caption>
                <thead className="bg-red-secondary/30 text-xs uppercase tracking-[0.14em] text-red">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Venda
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Pagamento
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Entrega
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right font-semibold"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red/10">
                  {sales.map((sale) => {
                    const createdAt = formatDate(sale.createdAt)
                    const total = formatCurrency(sale.amount, sale.currency)
                    const artworkLabel =
                      sale.artworkTitle ??
                      (artworksUnavailable
                        ? "Obra indisponível"
                        : "Obra não publicada")
                    const customerLabel =
                      sale.customerName ??
                      (customersUnavailable
                        ? "Cliente indisponível"
                        : "Nome não informado")

                    return (
                      <tr
                        key={sale.id}
                        className="transition-colors hover:bg-green-secondary/15"
                      >
                        <th
                          scope="row"
                          className="px-6 py-4 align-top font-semibold text-red"
                        >
                          {sale.artworkSlug && sale.artworkTitle ? (
                            <Link
                              href={`/obra/${encodeURIComponent(sale.artworkSlug)}`}
                              prefetch={false}
                              className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                            >
                              {artworkLabel}
                            </Link>
                          ) : (
                            artworkLabel
                          )}
                          <span className="mt-1 block text-xs font-normal text-black/65">
                            #{shortId(sale.id)}
                            {createdAt && (
                              <>
                                {" "}·{" "}
                                <time dateTime={sale.createdAt}>{createdAt}</time>
                              </>
                            )}
                          </span>
                          {!sale.artworkTitle && (
                            <span className="mt-1 block text-xs font-normal text-black/65">
                              Obra #{shortId(sale.artworkId)}
                            </span>
                          )}
                          <span className="mt-2 block">
                            <StatusBadge
                              details={saleStatusDetails[sale.saleStatus]}
                            />
                          </span>
                        </th>
                        <td className="px-6 py-4 align-top">
                          <span className="font-medium text-black/80">
                            {customerLabel}
                          </span>
                          {sale.conversationId && (
                            <Link
                              href={`/admin/mensagem?conversa=${encodeURIComponent(sale.conversationId)}`}
                              prefetch={false}
                              className="mt-2 flex w-fit items-center gap-1 text-xs font-semibold text-red-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                            >
                              Abrir conversa
                              <ArrowUpRight
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            </Link>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <StatusBadge
                            details={
                              paymentStatusDetails[sale.paymentStatus]
                            }
                          />
                          {sale.paymentEnvironment === "test" && (
                            <span className="mt-2 block text-xs font-medium text-red-hover">
                              Ambiente de teste
                            </span>
                          )}
                          {sale.paymentEnvironment === "unclassified" && (
                            <span className="mt-2 block text-xs text-black/65">
                              Ambiente não identificado
                            </span>
                          )}
                          {sale.hasPaymentConflict && (
                            <span className="mt-2 block text-xs font-semibold text-red-hover">
                              Revisar divergência
                            </span>
                          )}
                          {paymentsArePartial && (
                            <span className="mt-2 block text-xs text-black/65">
                              Dados parciais
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <StatusBadge
                            details={
                              deliveryStatusDetails[sale.deliveryStatus]
                            }
                          />
                          {deliveriesArePartial && (
                            <span className="mt-2 block text-xs text-black/65">
                              Dados parciais
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right align-top font-semibold tabular-nums text-red">
                          {total ?? (
                            <span className="text-xs font-normal text-black/65">
                              Indisponível
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
