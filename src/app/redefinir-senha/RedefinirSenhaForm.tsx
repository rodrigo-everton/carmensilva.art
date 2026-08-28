"use client"

import {
  CircleCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react"
import Link from "next/link"
import { useActionState, useState } from "react"

import { redefinirSenha } from "./actions"

export default function RedefinirSenhaForm() {
  const [state, formAction, pending] = useActionState(redefinirSenha, null)
  const [showPassword, setShowPassword] = useState(false)

  if (state?.success) {
    return (
      <div className="mt-8 rounded-2xl border border-green/20 bg-green-secondary/70 p-6 text-green-hover">
        <CircleCheck className="size-9" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold">Senha atualizada</h2>
        <p className="mt-2 leading-relaxed opacity-80">
          Sua nova senha já está ativa. Você pode continuar usando sua conta.
        </p>
        <Link
          href="/conta"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-red px-5 text-sm font-semibold text-white transition-colors hover:bg-red-hover"
        >
          Ir para minha conta
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="new-password"
          className="mb-2 block text-sm font-semibold text-red"
        >
          Nova senha
        </label>
        <div className="relative">
          <LockKeyhole
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red/45"
          />
          <input
            id="new-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            required
            minLength={8}
            placeholder="Mínimo de 8 caracteres"
            className="h-13 w-full rounded-xl border border-red/20 bg-white pl-12 pr-12 text-base text-black outline-none transition placeholder:text-black/35 focus:border-orange focus:ring-3 focus:ring-orange/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-red/55 transition-colors hover:bg-red-secondary/50 hover:text-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
            aria-label={showPassword ? "Ocultar senhas" : "Mostrar senhas"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <p className="mt-2 text-xs text-black/45">
          Use pelo menos 8 caracteres.
        </p>
      </div>

      <div>
        <label
          htmlFor="new-password-confirmation"
          className="mb-2 block text-sm font-semibold text-red"
        >
          Confirmar nova senha
        </label>
        <div className="relative">
          <LockKeyhole
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red/45"
          />
          <input
            id="new-password-confirmation"
            name="passwordConfirmation"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Digite a senha novamente"
            className="h-13 w-full rounded-xl border border-red/20 bg-white pl-12 pr-4 text-base text-black outline-none transition placeholder:text-black/35 focus:border-orange focus:ring-3 focus:ring-orange/15"
          />
        </div>
      </div>

      {state?.error && (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-red/15 bg-red-secondary/55 px-4 py-3 text-sm font-medium text-red-hover"
        >
          {state.error}
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
        {pending ? "Atualizando senha..." : "Criar nova senha"}
      </button>
    </form>
  )
}
