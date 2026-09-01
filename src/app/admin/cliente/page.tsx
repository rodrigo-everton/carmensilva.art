import type { Metadata } from "next"
import { AlertCircle, ContactRound, UsersRound } from "lucide-react"
import Link from "next/link"

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage"
import {
  loadAdminCustomers,
  type AdminCustomersResult,
  type AdminCustomerWarning,
} from "@/lib/admin-customers"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Clientes",
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
})

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
})

const warningSourceLabels: Record<AdminCustomerWarning, string> = {
  profiles: "perfis e telefones",
  sales: "vendas",
  conversations: "conversas",
  messages: "mensagens",
}

const warningListFormatter = new Intl.ListFormat("pt-BR", {
  style: "long",
  type: "conjunction",
})

function formatDate(value: string, formatter: Intl.DateTimeFormat) {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : formatter.format(date)
}

export default async function AdminClientePage() {
  await requireAdmin()

  let customersResult: AdminCustomersResult | null = null

  try {
    customersResult = await loadAdminCustomers()
  } catch (error) {
    console.error(
      "Não foi possível carregar a lista de clientes.",
      error instanceof Error ? error.message : error,
    )
  }

  const customers = customersResult?.customers ?? []
  const customerCountLabel = `${customers.length} ${
    customers.length === 1 ? "cliente" : "clientes"
  }`
  const warnings = customersResult?.warnings ?? []
  const warningDescription = warningListFormatter.format(
    warnings.map((warning) => warningSourceLabels[warning]),
  )
  const profilesUnavailable = warnings.includes("profiles")
  const salesUnavailable = warnings.includes("sales")
  const activityIsPartial = warnings.some((warning) =>
    ["profiles", "sales", "conversations", "messages"].includes(warning),
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description="Espaço para consultar contatos e acompanhar o relacionamento com cada cliente."
        icon={UsersRound}
      />

      <section
        aria-labelledby="clientes-heading"
        className="overflow-hidden rounded-2xl border border-red/10 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-2 border-b border-red/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-hover">
              Diretório
            </p>
            <h2 id="clientes-heading" className="mt-1 text-2xl font-semibold text-red">
              Lista de clientes
            </h2>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              customersResult
                ? "bg-green-secondary text-green-hover"
                : "bg-red-secondary text-red-hover"
            }`}
          >
            {customersResult ? customerCountLabel : "Indisponível"}
          </span>
        </div>

        {!customersResult ? (
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
                Não foi possível carregar os clientes
              </h3>
              <p className="mt-1 text-black/60">
                Atualize a página ou tente novamente.
              </p>
              <Link
                href="/admin/cliente"
                prefetch={false}
                className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-red px-4 text-sm font-semibold text-white transition-colors hover:bg-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                Tentar novamente
              </Link>
            </div>
          </div>
        ) : customers.length === 0 ? (
          <AdminEmptyState
            icon={ContactRound}
            title="Nenhum cliente cadastrado"
            description="Os clientes aparecerão aqui quando concluírem o cadastro no site."
          />
        ) : (
          <>
            {customersResult.warnings.length > 0 && (
              <div
                id="customers-data-warning"
                role="status"
                className="flex items-start gap-3 border-b border-orange/15 bg-orange-secondary/20 px-5 py-3 text-sm text-black/70 sm:px-6"
              >
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0 text-orange-hover"
                  aria-hidden="true"
                />
                Não foi possível carregar integralmente {warningDescription}.
                Os campos afetados aparecem como indisponíveis ou parciais.
              </div>
            )}

            <div
              role="region"
              aria-label="Diretório de clientes cadastrados"
              tabIndex={0}
              className="overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-orange"
            >
              <table
                aria-describedby={
                  warnings.length > 0 ? "customers-data-warning" : undefined
                }
                className="w-full min-w-[50rem] border-collapse text-left text-sm"
              >
                <caption className="sr-only">
                  Clientes cadastrados, contatos, vendas e última atividade
                </caption>
                <thead className="bg-red-secondary/30 text-xs uppercase tracking-[0.14em] text-red">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      E-mail
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Telefone
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right font-semibold"
                    >
                      Vendas
                    </th>
                    <th scope="col" className="px-6 py-3 font-semibold">
                      Última atividade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red/10">
                  {customers.map((customer) => {
                    const registeredAt = formatDate(
                      customer.registeredAt,
                      dateFormatter,
                    )
                    const lastActivity = customer.lastActivityAt
                      ? formatDate(customer.lastActivityAt, dateTimeFormatter)
                      : null
                    const normalizedPhone = customer.phone?.replace(
                      /[^\d+]/g,
                      "",
                    )
                    const phoneHref =
                      normalizedPhone && /\d/.test(normalizedPhone)
                        ? normalizedPhone
                        : null

                    return (
                      <tr
                        key={customer.id}
                        className="transition-colors hover:bg-green-secondary/15"
                      >
                        <th
                          scope="row"
                          className="px-6 py-4 font-semibold text-red"
                        >
                          {customer.name ??
                            (profilesUnavailable
                              ? "Nome indisponível"
                              : "Nome não informado")}
                          {registeredAt && (
                            <span className="mt-1 block text-xs font-normal text-black/65">
                              Cadastro em{" "}
                              <time dateTime={customer.registeredAt}>
                                {registeredAt}
                              </time>
                            </span>
                          )}
                        </th>
                        <td className="px-6 py-4">
                          {customer.email ? (
                            <>
                              <a
                                href={`mailto:${customer.email}`}
                                className="break-all text-red-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                              >
                                {customer.email}
                              </a>
                              {!customer.emailConfirmed && (
                                <span className="mt-1 block text-xs font-medium text-red-hover">
                                  Confirmação pendente
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-black/65">
                              E-mail não informado
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          {customer.phone && phoneHref ? (
                            <a
                              href={`tel:${phoneHref}`}
                              className="text-red-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                            >
                              {customer.phone}
                            </a>
                          ) : (
                            <span className="text-black/65">
                              {profilesUnavailable
                                ? "Telefone indisponível"
                                : "Telefone não informado"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold tabular-nums text-red">
                          {salesUnavailable || customer.salesCount === null ? (
                            <span className="text-xs font-normal text-black/65">
                              Indisponível
                            </span>
                          ) : (
                            customer.salesCount
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 tabular-nums text-black/70">
                          {lastActivity && customer.lastActivityAt ? (
                            <time dateTime={customer.lastActivityAt}>
                              {lastActivity}
                            </time>
                          ) : (
                            "Sem atividade registrada"
                          )}
                          {activityIsPartial && (
                            <span className="mt-1 block text-xs text-red-hover">
                              Dados parciais
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
