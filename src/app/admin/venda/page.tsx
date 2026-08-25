import type { Metadata } from "next"
import { ReceiptText, ShoppingBag } from "lucide-react"

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Vendas",
}

export default async function AdminVendaPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operação"
        title="Vendas"
        description="Espaço para acompanhar pedidos, pagamentos e entregas das obras."
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
          <span className="w-fit rounded-full bg-green-secondary px-3 py-1 text-xs font-semibold text-green-hover">
            Sem dados carregados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <thead className="bg-red-secondary/30 text-xs uppercase tracking-[0.14em] text-red/65">
              <tr>
                <th scope="col" className="px-6 py-3 font-semibold">Venda</th>
                <th scope="col" className="px-6 py-3 font-semibold">Cliente</th>
                <th scope="col" className="px-6 py-3 font-semibold">Pagamento</th>
                <th scope="col" className="px-6 py-3 font-semibold">Entrega</th>
                <th scope="col" className="px-6 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5}>
                  <AdminEmptyState
                    icon={ReceiptText}
                    title="Nenhuma venda para exibir"
                    description="Ainda não há uma fonte de vendas conectada a esta página."
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
