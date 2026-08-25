import { NextResponse, type NextRequest } from "next/server"

import { getAuthenticatedDestination } from "@/lib/auth"
import { createClient } from "@/sanity/lib/supabase/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(
        new URL(await getAuthenticatedDestination(data.user), request.url),
      )
    }
  }

  return NextResponse.redirect(new URL("/login", request.url))
}
