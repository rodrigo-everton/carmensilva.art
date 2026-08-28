import type { Metadata } from "next"
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react"
import Link from "next/link"

import Container from "@/components/ui/Container"

import RecuperarSenhaForm from "./RecuperarSenhaForm"

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Solicite um link para criar uma nova senha.",
  robots: {
    index: false,
    follow: false,
  },
}

type RecuperarSenhaPageProps = {
  searchParams: Promise<{ erro?: string | string[] }>
}

export default async function RecuperarSenhaPage({
  searchParams,
}: RecuperarSenhaPageProps) {
  const query = await searchParams
  const errorCode = Array.isArray(query.erro) ? query.erro[0] : query.erro
  const initialError =
    errorCode === "link-invalido"
      ? "O link de redefinição é inválido ou expirou. Solicite um novo."
      : undefined

  return (
    <div className="overflow-hidden py-8 sm:py-12 lg:py-16">
      <Container>
        <section className="mx-auto grid max-w-5xl overflow-hidden rounded-4xl bg-white shadow-[0_24px_70px_rgba(82,20,38,0.18)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden min-h-[35rem] overflow-hidden bg-orange p-12 text-white lg:flex lg:flex-col lg:justify-between">
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
                <KeyRound size={27} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-secondary">
                Acesso à conta
              </p>
              <h1 className="mt-4 text-5xl font-semibold leading-[0.98] tracking-tight">
                Recupere seu acesso com segurança.
              </h1>
              <p className="mt-6 max-w-sm leading-relaxed text-orange-secondary">
                Você receberá as próximas instruções no e-mail cadastrado.
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
                Recuperação segura
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-tight text-red sm:text-5xl">
                Esqueci minha senha
              </h2>
              <p className="mt-3 leading-relaxed text-black/60">
                Informe seu e-mail para receber um link de redefinição.
              </p>

              <RecuperarSenhaForm initialError={initialError} />
            </div>
          </div>
        </section>
      </Container>
    </div>
  )
}
