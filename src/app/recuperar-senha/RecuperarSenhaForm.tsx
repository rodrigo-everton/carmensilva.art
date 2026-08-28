"use client"

import { CircleCheck, LoaderCircle, Mail } from "lucide-react"
import Link from "next/link"
import { useActionState } from "react"

import { requestPasswordReset } from "@/app/login/actions"

type RecuperarSenhaFormProps = {
  initialError?: string
}

export default function RecuperarSenhaForm({
  initialError,
}: RecuperarSenhaFormProps) {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    null,
  )

  if (state?.success) {
    return (
      <div className="mt-8 rounded-2xl border border-green/20 bg-green-secondary/70 p-6 text-green-hover">
        <CircleCheck className="size-9" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold">Confira seu e-mail</h2>
        <p className="mt-2 leading-relaxed opacity-80">
          Se existir uma conta com esse e-mail, enviaremos um link para criar
          uma nova senha.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-red px-5 text-sm font-semibold text-white transition-colors hover:bg-red-hover"
        >
          Voltar para o login
        </Link>
      </div>
    )
  }

  const errorMessage = state?.error ?? initialError

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="recovery-email"
          className="mb-2 block text-sm font-semibold text-red"
        >
          E-mail
        </label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red/45"
          />
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            placeholder="seu@email.com"
            className="h-13 w-full rounded-xl border border-red/20 bg-white pl-12 pr-4 text-base text-black outline-none transition placeholder:text-black/35 focus:border-orange focus:ring-3 focus:ring-orange/15"
          />
        </div>
      </div>

      {errorMessage && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-red/15 bg-red-secondary/55 px-4 py-3 text-sm font-medium text-red-hover"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-red px-5 font-semibold text-white transition-colors hover:bg-red-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-wait disabled:opacity-65"
      >
        {pending && (
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        )}
        {pending ? "Enviando link..." : "Enviar link de recuperação"}
      </button>
    </form>
  )
}
