"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getAuthenticatedDestination } from "@/lib/auth"
import {consumePendingArtworkConversation} from "@/lib/conversations"
import { createClient } from "@/sanity/lib/supabase/server"

export type LoginState = {
  error?: string
} | null

export type PasswordRecoveryState = {
  error?: string
  success?: boolean
} | null

const passwordResetDestination = "/redefinir-senha"

async function getRequestOrigin() {
  const requestOrigin = (await headers()).get("origin")?.trim()
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const rawOrigin = configuredOrigin || requestOrigin

  if (!rawOrigin) {
    return null
  }

  try {
    const url = new URL(
      rawOrigin.includes("://") ? rawOrigin : `https://${rawOrigin}`,
    )

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!email || !email.includes("@")) {
    return { error: "Digite um e-mail válido." }
  }

  if (!password) {
    return { error: "Digite sua senha." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: "E-mail ou senha inválidos. Tente novamente." }
  }

  let destination: string | null = null

  try {
    destination = await consumePendingArtworkConversation()
  } catch (pendingConversationError) {
    console.error(
      "Não foi possível concluir o interesse pendente.",
      pendingConversationError,
    )
    destination = "/mensagem?erro=envio-falhou"
  }

  redirect(destination ?? (await getAuthenticatedDestination(data.user)))
}

export async function requestPasswordReset(
  _previousState: PasswordRecoveryState,
  formData: FormData,
): Promise<PasswordRecoveryState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()

  if (!email || !email.includes("@")) {
    return { error: "Digite um e-mail válido." }
  }

  const origin = await getRequestOrigin()

  if (!origin) {
    return {
      error: "Não foi possível preparar o link de recuperação. Tente novamente.",
    }
  }

  const callbackUrl = new URL("/auth/callback", origin)
  callbackUrl.searchParams.set("next", passwordResetDestination)

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl.toString(),
  })

  if (error) {
    console.error("Não foi possível solicitar a redefinição de senha.", error.message)
    return {
      error: "Não foi possível enviar o link agora. Tente novamente em alguns minutos.",
    }
  }

  // Supabase intentionally returns the same successful response when the
  // address is not registered, preventing account enumeration.
  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
