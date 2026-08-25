import type { Metadata } from "next"
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Inbox,
  MessageSquareText,
  MessagesSquare,
  Palette,
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import Container from "@/components/ui/Container"
import { isAdmin } from "@/lib/auth"
import { createClient } from "@/sanity/lib/supabase/server"

export const metadata: Metadata = {
  title: "Minhas mensagens",
  description: "Acompanhe suas conversas com Carmem Silva.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function MensagemPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  if (await isAdmin(user)) {
    redirect("/admin/mensagem")
  }

  const nome =
    typeof user.user_metadata.nome === "string"
      ? user.user_metadata.nome.trim()
      : ""
  const primeiroNome = nome.split(/\s+/)[0]

  return (
    <div className="overflow-hidden py-8 sm:py-12 lg:py-16">
      <Container>
        <section className="mx-auto max-w-6xl overflow-hidden rounded-4xl bg-white shadow-[0_24px_70px_rgba(82,20,38,0.18)]">
          <header className="relative overflow-hidden bg-red px-6 py-9 text-white sm:px-10 sm:py-12">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-24 size-64 rounded-full border-[2rem] border-red-secondary/15"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-20 left-1/2 size-48 rounded-full bg-orange/20 blur-2xl"
            />

            <div className="relative">
              <Link
                href="/conta"
                className="inline-flex items-center gap-2 text-sm font-semibold text-red-secondary transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-secondary"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Voltar para minha conta
              </Link>

              <div className="mt-9 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-secondary">
                    Atendimento reservado
                  </p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                    Minhas mensagens
                  </h1>
                  <p className="mt-4 max-w-2xl leading-relaxed text-red-secondary">
                    Acompanhe em um só lugar suas conversas sobre obras, compras e
                    outros assuntos.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  <MessageSquareText className="size-4" aria-hidden="true" />
                  {primeiroNome ? `Olá, ${primeiroNome}` : "Área do cliente"}
                </span>
              </div>
            </div>
          </header>

          <div className="grid min-h-[32rem] md:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.28fr)]">
            <aside className="border-b border-red/10 bg-white md:border-b-0 md:border-r">
              <div className="flex items-end justify-between gap-4 border-b border-red/10 px-5 py-5 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-hover">
                    Caixa de entrada
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-red">Conversas</h2>
                </div>
                <span
                  aria-label="Nenhuma conversa"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-green-secondary text-xs font-semibold text-green-hover"
                >
                  0
                </span>
              </div>

              <div className="flex flex-col items-center px-5 py-12 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-green-secondary text-green-hover">
                  <Inbox className="size-5" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold text-red">Nenhuma conversa</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-black/60">
                  Suas conversas aparecerão aqui quando forem iniciadas.
                </p>
              </div>
            </aside>

            <div className="flex flex-col items-center justify-center bg-green-secondary/30 px-6 py-12 text-center sm:px-10">
              <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-red text-white shadow-sm">
                <MessagesSquare className="size-7" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-green-hover">
                Canal de atendimento
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-red sm:text-3xl">
                Sua conversa começa aqui
              </h2>
              <p className="mt-3 max-w-lg leading-relaxed text-black/65">
                Quando você entrar em contato sobre uma obra, suas mensagens e as
                respostas de atendimento ficarão reunidas neste espaço.
              </p>

              <div className="mt-7 flex w-full max-w-lg flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/venda"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red px-5 text-sm font-semibold text-white transition-colors hover:bg-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                >
                  <Palette className="size-4" aria-hidden="true" />
                  Conhecer obras
                </Link>
                <Link
                  href="/contato"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-red px-5 text-sm font-semibold text-red transition-colors hover:bg-red hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                >
                  Outros canais
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="mt-8 flex max-w-lg items-start gap-3 rounded-2xl bg-white/70 px-4 py-3 text-left text-sm text-black/60">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-green-hover" aria-hidden="true" />
                <p>
                  O atendimento acontece de segunda a sexta, em horário comercial.
                </p>
              </div>
            </div>
          </div>
        </section>
      </Container>
    </div>
  )
}
