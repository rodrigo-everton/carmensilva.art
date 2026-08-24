"use client"

import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react"
import { useActionState, useState } from "react"

import { login } from "./actions"

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-red">
          E-mail
        </label>
        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red/45"
          />
          <input
            id="email"
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

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-red">
          Senha
        </label>
        <div className="relative">
          <LockKeyhole
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-red/45"
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Digite sua senha"
            className="h-13 w-full rounded-xl border border-red/20 bg-white pl-12 pr-12 text-base text-black outline-none transition placeholder:text-black/35 focus:border-orange focus:ring-3 focus:ring-orange/15"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-red/55 transition-colors hover:bg-red-secondary/50 hover:text-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
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
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  )
}
