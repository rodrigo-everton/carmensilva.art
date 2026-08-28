"use server"

import { createClient } from "@/sanity/lib/supabase/server"

export type RedefinirSenhaState = {
  error?: string
  success?: boolean
} | null

export async function redefinirSenha(
  _previousState: RedefinirSenhaState,
  formData: FormData,
): Promise<RedefinirSenhaState> {
  const password = String(formData.get("password") ?? "")
  const passwordConfirmation = String(
    formData.get("passwordConfirmation") ?? "",
  )

  if (password.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." }
  }

  if (password !== passwordConfirmation) {
    return { error: "As senhas não coincidem." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      error: "Sua sessão de recuperação expirou. Solicite um novo link.",
    }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    const errorMessage = error.message.toLowerCase()

    if (errorMessage.includes("different") || errorMessage.includes("same")) {
      return { error: "Escolha uma senha diferente da senha atual." }
    }

    if (errorMessage.includes("password")) {
      return { error: "A nova senha não atende aos requisitos de segurança." }
    }

    return { error: "Não foi possível atualizar a senha. Solicite um novo link." }
  }

  return { success: true }
}
