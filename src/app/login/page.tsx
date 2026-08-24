import type { Metadata } from "next"
import { ArrowLeft, Brush, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import Container from "@/components/ui/Container"
import { createClient } from "@/sanity/lib/supabase/server"

import LoginForm from "./LoginForm"

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta no site de Carmem Silva.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/conta")
  }

  return (
    <div className="overflow-hidden py-8 sm:py-12 lg:py-16">
      <Container>
        <section className="grid min-h-[38rem] overflow-hidden rounded-4xl bg-white shadow-[0_24px_70px_rgba(82,20,38,0.18)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden overflow-hidden bg-red p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 size-80 rounded-full border-[2.5rem] border-red-secondary/15"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-28 -left-24 size-72 rounded-full bg-orange/75"
            />

            <Link
              href="/"
              className="relative inline-flex w-fit items-center gap-2 text-sm font-semibold text-red-secondary transition-colors hover:text-white"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Voltar ao site
            </Link>

            <div className="relative max-w-md">
              <span className="mb-7 inline-flex size-14 items-center justify-center rounded-2xl bg-orange text-white">
                <Brush size={27} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-secondary">
                Área reservada
              </p>
              <h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-tight">
                Arte, acervo e histórias em um só lugar.
              </h1>
              <p className="mt-6 max-w-sm leading-relaxed text-red-secondary">
                Entre com seus dados para acessar sua conta com segurança.
              </p>
            </div>
          </div>

          <div className="flex items-center px-6 py-12 sm:px-12 lg:px-16">
            <div className="mx-auto w-full max-w-md">
              <Link
                href="/"
                className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-red/65 transition-colors hover:text-red lg:hidden"
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Voltar ao site
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full bg-green-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-green-hover">
                <ShieldCheck size={16} aria-hidden="true" />
                Acesso seguro
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-red sm:text-5xl">
                Boas-vindas
              </h2>
              <p className="mt-3 leading-relaxed text-black/60">
                Use o e-mail e a senha cadastrados para continuar.
              </p>

              <LoginForm />

              <div className="mt-8 border-t border-red/10 pt-7 text-center">
                <p className="text-sm text-black/55">Ainda não tem uma conta?</p>
                <Link
                  href="/cadastro"
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border-2 border-red px-5 text-sm font-semibold text-red transition-colors hover:bg-red hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                >
                  Criar minha conta
                </Link>
              </div>

              <p className="mt-5 text-center text-xs leading-relaxed text-black/45">
                Sua sessão é protegida pelo Supabase Auth.
              </p>
            </div>
          </div>
        </section>
      </Container>
    </div>
  )
}
