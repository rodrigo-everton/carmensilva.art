import type { Metadata } from "next"
import { KeyRound, ShieldCheck } from "lucide-react"
import { redirect } from "next/navigation"

import Container from "@/components/ui/Container"
import { createClient } from "@/sanity/lib/supabase/server"

import RedefinirSenhaForm from "./RedefinirSenhaForm"

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Crie uma nova senha para sua conta.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function RedefinirSenhaPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/recuperar-senha?erro=link-invalido")
  }

  return (
    <div className="py-10 sm:py-16">
      <Container>
        <section className="mx-auto max-w-2xl overflow-hidden rounded-4xl bg-white shadow-[0_24px_70px_rgba(82,20,38,0.16)]">
          <div className="relative overflow-hidden bg-red px-6 py-10 text-white sm:px-10">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 size-56 rounded-full border-[1.75rem] border-red-secondary/15"
            />
            <div className="relative flex items-center gap-4">
              <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-orange">
                <KeyRound size={26} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-secondary">
                  Acesso protegido
                </p>
                <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
                  Criar nova senha
                </h1>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex items-start gap-3 rounded-2xl bg-green-secondary/75 p-4 text-green-hover">
              <ShieldCheck
                className="mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Link verificado</p>
                <p className="mt-1 text-sm opacity-75">
                  Escolha uma senha nova para proteger sua conta.
                </p>
              </div>
            </div>

            <RedefinirSenhaForm />
          </div>
        </section>
      </Container>
    </div>
  )
}
