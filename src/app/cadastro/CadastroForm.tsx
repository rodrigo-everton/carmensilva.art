"use client"

import {
  CircleCheck,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import { useActionState, useState } from "react"

import { cadastrar } from "./actions"

export default function CadastroForm() {
  const [state, formAction, pending] = useActionState(cadastrar, null)
  const [showPassword, setShowPassword] = useState(false)

  if (state?.success) {
    return (
      <div className="mt-8 rounded-2xl border border-green/20 bg-green-secondary/70 p-6 text-green-hover">
        <CircleCheck className="size-9" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-semibold">Confira seu e-mail</h2>
        <p className="mt-2 leading-relaxed opacity-80">
          Enviamos um link de confirmação para
          <strong className="mt-1 block break-all">{state.email}</strong>
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

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="nome" className="mb-2 block text-sm font-semibold text-red">
          Nome completo
        </label>
        <div className="relative">
          <UserRound
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red/45"
          />
          <input
            id="nome"
            name="nome"
            type="text"
            autoComplete="name"
            autoFocus
            required
            minLength={2}
            placeholder="Seu nome"
            className="h-13 w-full rounded-xl border border-red/20 bg-white pl-12 pr-4 text-base text-black outline-none transition placeholder:text-black/35 focus:border-orange focus:ring-3 focus:ring-orange/15"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cadastro-email" className="mb-2 block text-sm font-semibold text-red">
          E-mail
        </label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red/45"
          />
          <input
            id="cadastro-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="seu@email.com"
            className="h-13 w-full rounded-xl border border-red/20 bg-white pl-12 pr-4 text-base text-black outline-none transition placeholder:text-black/35 focus:border-orange focus:ring-3 focus:ring-orange/15"
          />
        </div>
      </div>

      <div>
        <label htmlFor="cadastro-password" className="mb-2 block text-sm font-semibold text-red">
          Senha
        </label>
        <div className="relative">
          <LockKeyhole
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red/45"
          />
          <input
            id="cadastro-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
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
        <p className="mt-2 text-xs text-black/45">Use pelo menos 8 caracteres.</p>
      </div>

      <div>
        <label
          htmlFor="password-confirmation"
          className="mb-2 block text-sm font-semibold text-red"
        >
          Confirmar senha
        </label>
        <div className="relative">
          <LockKeyhole
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red/45"
          />
          <input
            id="password-confirmation"
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
        {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
        {pending ? "Criando conta..." : "Criar conta"}
      </button>
    </form>
  )
}
