import type { Metadata } from "next"
import {
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  MessageSquareText,
  ShoppingBag,
  UsersRound,
} from "lucide-react"
import Link from "next/link"

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Visão geral",
}

const adminAreas = [
  {
    href: "/admin/venda",
    title: "Vendas",
    description: "Acompanhe os registros e as etapas de cada venda.",
    action: "Abrir vendas",
    icon: ShoppingBag,
    iconClassName: "bg-orange-secondary text-orange-hover",
  },
  {
    href: "/admin/mensagem",
    title: "Mensagens",
    description: "Organize as conversas recebidas pelos canais do site.",
    action: "Abrir mensagens",
    icon: MessageSquareText,
    iconClassName: "bg-red-secondary text-red-hover",
  },
  {
    href: "/admin/cliente",
    title: "Clientes",
    description: "Consulte os contatos e o histórico de relacionamento.",
    action: "Abrir clientes",
    icon: UsersRound,
    iconClassName: "bg-green-secondary text-green-hover",
  },
]

export default async function AdminPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Área restrita"
        title="Visão geral"
        description="Acesse os módulos usados para organizar vendas, mensagens e clientes."
        icon={LayoutDashboard}
      />

      <section aria-labelledby="areas-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green-hover">
              Navegação rápida
            </p>
            <h2 id="areas-heading" className="mt-1 text-2xl font-semibold text-red">
              Áreas do painel
            </h2>
          </div>
          <span className="hidden h-px flex-1 bg-red/15 sm:block" aria-hidden="true" />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {adminAreas.map(
            ({ href, title, description, action, icon: Icon, iconClassName }) => (
              <Link
                key={href}
                href={href}
                className="group flex min-h-56 flex-col rounded-2xl border border-red/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red/20 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                <span
                  className={`inline-flex size-11 items-center justify-center rounded-xl ${iconClassName}`}
                >
                  <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-semibold text-red">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-black/65">{description}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-red">
                  {action}
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-red/10 bg-white shadow-sm">
        <div className="border-b border-red/10 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-hover">
            Resumo
          </p>
          <h2 className="mt-1 text-xl font-semibold text-red">Atividade recente</h2>
        </div>
        <AdminEmptyState
          icon={ClipboardList}
          title="Nenhuma atividade carregada"
          description="Os registros dos módulos aparecerão aqui quando uma fonte de dados for conectada ao painel."
        />
      </section>
    </div>
  )
}
