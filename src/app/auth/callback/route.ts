import { NextResponse, type NextRequest } from "next/server"

import { getAuthenticatedDestination } from "@/lib/auth"
import {consumePendingArtworkConversation} from "@/lib/conversations"
import { createClient } from "@/sanity/lib/supabase/server"

const passwordResetDestination = "/redefinir-senha"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const requestedDestination = request.nextUrl.searchParams.get("next")
  const isPasswordReset = requestedDestination === passwordResetDestination

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (isPasswordReset) {
        return NextResponse.redirect(
          new URL(passwordResetDestination, request.url),
        )
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

      return NextResponse.redirect(
        new URL(
          destination ?? (await getAuthenticatedDestination(data.user)),
          request.url,
        ),
      )
    }
  }

  if (isPasswordReset) {
    return NextResponse.redirect(
      new URL("/recuperar-senha?erro=link-invalido", request.url),
    )
  }

  return NextResponse.redirect(new URL("/login", request.url))
}
