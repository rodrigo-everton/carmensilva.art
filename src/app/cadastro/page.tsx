import type { Metadata } from "next"
import { ArrowLeft, Palette, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import Container from "@/components/ui/Container"
import { createClient } from "@/sanity/lib/supabase/server"

import CadastroForm from "./CadastroForm"

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta no site de Carmem Silva.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function CadastroPage() {
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
        <section className="grid overflow-hidden rounded-4xl bg-white shadow-[0_24px_70px_rgba(82,20,38,0.18)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden min-h-[48rem] overflow-hidden bg-orange p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-24 size-80 rounded-full border-[2.5rem] border-orange-secondary/25"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-28 -left-24 size-72 rounded-full bg-red/85"
            />

            <Link
              href="/login"
              className="relative inline-flex w-fit items-center gap-2 text-sm font-semibold text-orange-secondary transition-colors hover:text-white"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Voltar ao login
            </Link>

            <div className="relative max-w-md">
              <span className="mb-7 inline-flex size-14 items-center justify-center rounded-2xl bg-red text-white">
                <Palette size={27} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-secondary">
                Faça parte
              </p>
              <h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-tight">
                Uma nova forma de se aproximar da arte.
              </h1>
              <p className="mt-6 max-w-sm leading-relaxed text-white/80">
                Cadastre-se para acessar sua área reservada e acompanhar as
                próximas experiências do site.
              </p>
            </div>
          </div>

          <div className="flex items-center px-6 py-12 sm:px-12 lg:px-16">
            <div className="mx-auto w-full max-w-md">
              <Link
                href="/login"
                className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-red/65 transition-colors hover:text-red lg:hidden"
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Voltar ao login
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full bg-green-secondary px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-green-hover">
                <ShieldCheck size={16} aria-hidden="true" />
                Cadastro seguro
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-red sm:text-5xl">
                Criar conta
              </h2>
              <p className="mt-3 leading-relaxed text-black/60">
                Preencha seus dados para começar.
              </p>

              <CadastroForm />

              <p className="mt-6 text-center text-sm text-black/55">
                Já tem uma conta?{" "}
                <Link href="/login" className="font-semibold text-red hover:text-red-hover">
                  Entrar
                </Link>
              </p>
            </div>
          </div>
        </section>
      </Container>
    </div>
  )
}
