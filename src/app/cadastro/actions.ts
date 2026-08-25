"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getAuthenticatedDestination } from "@/lib/auth"
import { createClient } from "@/sanity/lib/supabase/server"

export type CadastroState = {
  error?: string
  success?: boolean
  email?: string
} | null

export async function cadastrar(
  _previousState: CadastroState,
  formData: FormData,
): Promise<CadastroState> {
  const nome = String(formData.get("nome") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const passwordConfirmation = String(
    formData.get("passwordConfirmation") ?? "",
  )

  if (nome.length < 2) {
    return { error: "Digite seu nome completo." }
  }

  if (!email || !email.includes("@")) {
    return { error: "Digite um e-mail válido." }
  }

  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." }
  }

  if (password !== passwordConfirmation) {
    return { error: "As senhas não coincidem." }
  }

  const requestOrigin = (await headers()).get("origin")
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const rawOrigin = requestOrigin ?? configuredOrigin
  const origin = rawOrigin
    ? rawOrigin.includes("://")
      ? rawOrigin
      : `https://${rawOrigin}`
    : undefined
  const emailRedirectTo = origin
    ? new URL("/auth/callback", origin).toString()
    : undefined

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome },
      emailRedirectTo,
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Já existe uma conta cadastrada com este e-mail." }
    }

    if (error.message.toLowerCase().includes("password")) {
      return { error: "A senha não atende aos requisitos de segurança." }
    }

    return { error: "Não foi possível criar a conta. Tente novamente." }
  }

  if (data.session) {
    redirect(await getAuthenticatedDestination(data.user))
  }

  return { success: true, email }
}
