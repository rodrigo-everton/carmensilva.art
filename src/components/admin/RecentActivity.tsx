import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  ArrowUpRight,
  ClipboardList,
  MessageSquareText,
  ShoppingBag,
  UserPlus,
} from "lucide-react"
import Link from "next/link"

import {
  ADMIN_RECENT_ACTIVITY_LIMIT,
  loadAdminRecentActivity,
  type AdminActivity,
  type AdminActivityWarning,
} from "@/lib/admin-activity"

const activityDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
})

const warningLabels: Record<AdminActivityWarning, string> = {
  messages: "as mensagens",
  sales: "as vendas",
  customers: "os clientes",
  artworks: "os dados das obras",
}

const warningListFormatter = new Intl.ListFormat("pt-BR", {
  style: "long",
  type: "conjunction",
})

type ActivityPresentation = {
  title: string
  description: string
  icon: LucideIcon
  iconClassName: string
}

function formatDate(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? null
    : activityDateFormatter.format(date)
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

function activityPresentation(
  activity: AdminActivity,
): ActivityPresentation {
  switch (activity.kind) {
    case "message":
      return {
        title: `${activity.customerName ?? "Um cliente"} enviou uma mensagem`,
        description: `Sobre “${activity.artworkTitle ?? "Obra do acervo"}”`,
        icon: MessageSquareText,
        iconClassName: "bg-red-secondary text-red-hover",
      }
    case "sale": {
      const total = formatCurrency(activity.amount, activity.currency)
      const details = [
        activity.artworkTitle ?? "Obra do acervo",
        activity.customerName ?? "Cliente não identificado",
        total,
      ].filter(Boolean)

      return {
        title: activity.isNew ? "Nova venda registrada" : "Venda atualizada",
        description: details.join(" · "),
        icon: ShoppingBag,
        iconClassName: "bg-orange-secondary text-orange-hover",
      }
    }
    case "customer":
      return {
        title: activity.customerName
          ? `${activity.customerName}: perfil de cliente criado`
          : "Perfil de cliente criado",
        description: "Perfil disponível na área administrativa.",
        icon: UserPlus,
        iconClassName: "bg-green-secondary text-green-hover",
      }
  }
}

function ActivityHeader({
  countLabel,
  unavailable = false,
}: {
  countLabel: string
  unavailable?: boolean
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-red/10 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-hover">
          Resumo
        </p>
        <h2 id="atividade-heading" className="mt-1 text-xl font-semibold text-red">
          Atividade recente
        </h2>
      </div>
      <span
        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
          unavailable
            ? "bg-red-secondary text-red-hover"
            : "bg-green-secondary text-green-hover"
        }`}
      >
        {countLabel}
      </span>
    </div>
  )
}

function ActivityError() {
  return (
    <section
      aria-labelledby="atividade-heading"
      className="overflow-hidden rounded-2xl border border-red/10 bg-white shadow-sm"
    >
      <ActivityHeader countLabel="Indisponível" unavailable />
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
            Não foi possível carregar a atividade recente
          </h3>
          <p className="mt-1 text-black/65">
            Atualize a página ou tente novamente.
          </p>
          <Link
            href="/admin"
            prefetch={false}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-red px-4 text-sm font-semibold text-white transition-colors hover:bg-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
          >
            Tentar novamente
          </Link>
        </div>
      </div>
    </section>
  )
}

export function RecentActivityLoading() {
  return (
    <section
      aria-labelledby="atividade-heading"
      aria-busy="true"
      className="overflow-hidden rounded-2xl border border-red/10 bg-white shadow-sm"
    >
      <ActivityHeader countLabel="Carregando" />
      <div role="status" aria-live="polite">
        <span className="sr-only">Carregando atividade recente...</span>
        <div className="divide-y divide-red/10" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 px-5 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem] sm:items-center sm:px-6"
            >
              <span className="size-10 motion-safe:animate-pulse rounded-xl bg-green-secondary/70" />
              <span className="space-y-2">
                <span className="block h-4 w-2/5 motion-safe:animate-pulse rounded bg-red-secondary/65" />
                <span className="block h-3 w-3/4 motion-safe:animate-pulse rounded bg-black/10" />
              </span>
              <span className="hidden h-3 motion-safe:animate-pulse rounded bg-black/10 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export async function RecentActivity() {
  let result

  try {
    result = await loadAdminRecentActivity()
  } catch (error) {
    console.error(
      "Não foi possível carregar a atividade recente do painel.",
      error instanceof Error ? error.message : error,
    )
    return <ActivityError />
  }

  const { activities, warnings } = result
  const warningDescription = warningListFormatter.format(
    warnings.map((warning) => warningLabels[warning]),
  )
  const countLabel = `${activities.length} ${
    activities.length === 1 ? "movimentação" : "movimentações"
  }`
  const visibleCountLabel =
    activities.length === ADMIN_RECENT_ACTIVITY_LIMIT
      ? `${activities.length} mais recentes`
      : countLabel

  return (
    <section
      aria-labelledby="atividade-heading"
      className="overflow-hidden rounded-2xl border border-red/10 bg-white shadow-sm"
    >
      <ActivityHeader countLabel={visibleCountLabel} />

      {warnings.length > 0 && (
        <div
          id="activity-data-warning"
          role="status"
          className="flex items-start gap-3 border-b border-orange/15 bg-orange-secondary/25 px-5 py-3 text-sm text-black/70 sm:px-6"
        >
          <AlertCircle
            className="mt-0.5 size-4 shrink-0 text-red"
            aria-hidden="true"
          />
          A atividade recente está parcial. Algumas movimentações ou detalhes
          podem não aparecer porque não foi possível consultar integralmente{" "}
          {warningDescription}.
        </div>
      )}

      {activities.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-14 text-center sm:py-16">
          <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-green-secondary text-green-hover">
            <ClipboardList
              className="size-6"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </span>
          <h3 className="mt-5 text-xl font-semibold text-red">
            {warnings.length > 0
              ? "Nenhuma atividade nos dados disponíveis"
              : "Nenhuma atividade registrada"}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-black/65">
            {warnings.length > 0
              ? "Atualize a página para consultar as demais fontes do painel."
              : "Novos cadastros, mensagens e vendas aparecerão aqui."}
          </p>
        </div>
      ) : (
        <ol
          aria-describedby={
            warnings.length > 0 ? "activity-data-warning" : undefined
          }
          aria-label="Lista de atividades recentes"
          tabIndex={0}
          className="max-h-[26rem] divide-y divide-red/10 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-orange sm:max-h-[21rem] [scrollbar-gutter:stable]"
        >
          {activities.map((activity) => {
            const presentation = activityPresentation(activity)
            const occurredAt = formatDate(activity.occurredAt)
            const Icon = presentation.icon

            return (
              <li key={activity.id}>
                <Link
                  href={activity.href}
                  prefetch={false}
                  className="group grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-5 py-4 transition-colors hover:bg-green-secondary/20 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-orange sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                >
                  <span
                    className={`row-span-2 inline-flex size-10 items-center justify-center rounded-xl sm:row-span-1 ${presentation.iconClassName}`}
                  >
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-red">
                      {presentation.title}
                    </span>
                    <span className="mt-1 block break-words text-sm leading-relaxed text-black/65">
                      {presentation.description}
                    </span>
                  </span>
                  <span className="col-start-2 flex items-center gap-1.5 text-xs tabular-nums text-black/55 sm:col-start-3 sm:row-start-1 sm:justify-self-end">
                    {occurredAt ? (
                      <time dateTime={activity.occurredAt}>{occurredAt}</time>
                    ) : (
                      "Data indisponível"
                    )}
                    <ArrowUpRight
                      className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
