import type { Metadata } from "next"
import { LogOut, ShieldCheck, UserRound } from "lucide-react"
import { redirect } from "next/navigation"

import Container from "@/components/ui/Container"
import { createClient } from "@/sanity/lib/supabase/server"

import { logout } from "../login/actions"

export const metadata: Metadata = {
  title: "Minha conta",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ContaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const nome =
    typeof user.user_metadata.nome === "string"
      ? user.user_metadata.nome
      : undefined

  return (
    <div className="py-10 sm:py-16">
      <Container>
        <section className="mx-auto max-w-3xl overflow-hidden rounded-4xl bg-white shadow-[0_24px_70px_rgba(82,20,38,0.16)]">
          <div className="relative overflow-hidden bg-red px-6 py-10 text-white sm:px-10">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 size-56 rounded-full border-[1.75rem] border-red-secondary/15"
            />
            <div className="relative flex items-center gap-4">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-orange">
                <UserRound size={26} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-secondary">
                  Área reservada
                </p>
                <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">Minha conta</h1>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex items-start gap-3 rounded-2xl bg-green-secondary/75 p-4 text-green-hover">
              <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Sessão autenticada</p>
                {nome && <p className="mt-1 text-sm font-semibold">{nome}</p>}
                <p className="mt-1 break-all text-sm opacity-75">{user.email}</p>
              </div>
            </div>

            <p className="mt-8 leading-relaxed text-black/60">
              Você entrou com sucesso. Este espaço está protegido e só pode ser
              acessado por usuários autenticados.
            </p>

            <form action={logout} className="mt-8">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-red px-5 text-sm font-semibold text-red transition-colors hover:bg-red hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
              >
                <LogOut size={18} aria-hidden="true" />
                Sair da conta
              </button>
            </form>
          </div>
        </section>
      </Container>
    </div>
  )
}
