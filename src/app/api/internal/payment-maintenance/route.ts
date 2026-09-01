import {timingSafeEqual} from "node:crypto"

import {NextResponse} from "next/server"

import {loadAndProcessMercadoPagoArtworkSyncJobs} from "@/lib/payment-artwork-sync"
import {createSupabaseAdminClient} from "@/lib/supabase-admin"
import {
  assertSanityWriteConfigured,
  SanityWriteConfigurationError,
} from "@/sanity/lib/write-client"

export const runtime = "nodejs"

function hasValidAuthorization(authorization: string | null, secret: string) {
  if (!authorization?.startsWith("Bearer ")) return false

  const supplied = Buffer.from(authorization.slice("Bearer ".length), "utf8")
  const expected = Buffer.from(secret, "utf8")

  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim() ?? ""

  if (cronSecret.length < 16) {
    console.error("A manutenção de pagamentos não possui um CRON_SECRET válido.")
    return NextResponse.json({error: "Manutenção não configurada."}, {status: 503})
  }

  if (!hasValidAuthorization(request.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({error: "Não autorizado."}, {status: 401})
  }

  try {
    assertSanityWriteConfigured()
    const supabase = createSupabaseAdminClient()
    const processed = await loadAndProcessMercadoPagoArtworkSyncJobs(supabase, {
      limit: 100,
    })

    return NextResponse.json({ok: true, processed})
  } catch (error) {
    console.error("A manutenção de pagamentos falhou.", error)

    return NextResponse.json(
      {
        error:
          error instanceof SanityWriteConfigurationError
            ? "Sincronização do Sanity não configurada."
            : "Falha na manutenção de pagamentos.",
      },
      {status: error instanceof SanityWriteConfigurationError ? 503 : 500},
    )
  }
}
