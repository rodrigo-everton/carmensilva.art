"use server"

import { redirect } from "next/navigation"

import { getAuthenticatedDestination } from "@/lib/auth"
import {consumePendingArtworkConversation} from "@/lib/conversations"
import { createClient } from "@/sanity/lib/supabase/server"

export type LoginState = {
  error?: string
} | null

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

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
