import { LoaderCircle, UsersRound } from "lucide-react"

import { AdminPageHeader } from "@/components/admin/AdminPage"

export default function AdminClienteLoading() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Relacionamento"
        title="Clientes"
        description="Espaço para consultar contatos e acompanhar o relacionamento com cada cliente."
        icon={UsersRound}
      />

      <section className="overflow-hidden rounded-2xl border border-red/10 bg-white shadow-sm">
        <div className="border-b border-red/10 px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-hover">
            Diretório
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-red">
            Lista de clientes
          </h2>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="flex min-h-48 items-center justify-center gap-3 px-5 py-12 text-sm font-medium text-black/70"
        >
          <LoaderCircle
            className="size-5 motion-safe:animate-spin text-red"
            aria-hidden="true"
          />
          Carregando clientes...
        </div>
      </section>
    </div>
  )
}
