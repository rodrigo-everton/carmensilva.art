"use server"

import { redirect } from "next/navigation"

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
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "E-mail ou senha inválidos. Tente novamente." }
  }

  redirect("/conta")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
