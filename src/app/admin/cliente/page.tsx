import type { Metadata } from "next"
import { ContactRound, UsersRound } from "lucide-react"

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Clientes",
}

export default async function AdminClientePage() {
  await requireAdmin()

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
          <span className="w-fit rounded-full bg-green-secondary px-3 py-1 text-xs font-semibold text-green-hover">
            Sem dados carregados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <thead className="bg-red-secondary/30 text-xs uppercase tracking-[0.14em] text-red/65">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">Cliente</th>
                <th scope="col" className="px-6 py-3 font-semibold">Contato</th>
                <th scope="col" className="px-6 py-3 font-semibold">Vendas</th>
                <th scope="col" className="px-6 py-3 font-semibold">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4}>
                  <AdminEmptyState
                    icon={ContactRound}
                    title="Nenhum cliente para exibir"
                    description="Ainda não há uma fonte de clientes conectada a esta página."
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
