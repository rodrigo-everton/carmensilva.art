import type { Metadata } from "next"
import { Inbox, MessageSquareText, MessagesSquare } from "lucide-react"

import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPage"
import { requireAdmin } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Mensagens",
}

export default async function AdminMensagemPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Atendimento"
        title="Mensagens"
        description="Área destinada às conversas e solicitações recebidas pelo site."
        icon={MessageSquareText}
      />

      <section
        aria-labelledby="mensagens-heading"
        className="grid min-h-[30rem] overflow-hidden rounded-2xl border border-red/10 bg-white shadow-sm md:grid-cols-[minmax(14rem,0.75fr)_minmax(0,1.25fr)]"
      >
        <div className="border-b border-red/10 md:border-b-0 md:border-r">
          <div className="border-b border-red/10 px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-hover">
              Caixa de entrada
            </p>
            <h2 id="mensagens-heading" className="mt-1 text-2xl font-semibold text-red">
              Conversas
            </h2>
          </div>
          <AdminEmptyState
            icon={Inbox}
            title="Nenhuma conversa carregada"
            description="As conversas aparecerão nesta lista quando um canal de mensagens for conectado."
          />
        </div>

        <div className="flex min-h-80 items-center justify-center bg-green-secondary/20">
          <AdminEmptyState
            icon={MessagesSquare}
            title="Visualização da conversa"
            description="Selecione uma conversa na caixa de entrada para ler e responder às mensagens."
          />
        </div>
      </section>
    </div>
  )
}
