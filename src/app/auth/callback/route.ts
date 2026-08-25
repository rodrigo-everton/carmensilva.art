import { NextResponse, type NextRequest } from "next/server"

import { getAuthenticatedDestination } from "@/lib/auth"
import {consumePendingArtworkConversation} from "@/lib/conversations"
import { createClient } from "@/sanity/lib/supabase/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
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

  return NextResponse.redirect(new URL("/login", request.url))
}
