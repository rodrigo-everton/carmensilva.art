import "server-only"

import type {SupabaseClient} from "@supabase/supabase-js"

import {
  markArtworkAsSold,
  releaseArtworkAfterRefund,
  releaseArtworkReservation,
  reserveArtworkForPayment,
} from "@/sanity/lib/artwork-commerce"

export type MercadoPagoArtworkSyncJob = {
  action: "reserve" | "sell" | "release" | "refund"
  preference_id: string
  sale_id: string
  conversation_id: string
  artwork_id: string
  expires_at: string
  provider_payment_id: string | null
}

type SyncOptions = {
  conversationId?: string
  limit?: number
}

const ACKNOWLEDGEMENT_COLUMN = {
  reserve: "sanity_reserved_at",
  sell: "sanity_sold_at",
  release: "sanity_released_at",
  refund: "sanity_released_at",
} as const

async function acknowledgeJob(
  supabase: SupabaseClient,
  job: MercadoPagoArtworkSyncJob,
) {
  const column = ACKNOWLEDGEMENT_COLUMN[job.action]
  const acknowledgedAt = new Date().toISOString()
  const {data, error} = await supabase
    .from("payment_preferences")
    .update({[column]: acknowledgedAt})
    .eq("id", job.preference_id)
    .eq("sanity_sync_required", true)
    .is(column, null)
    .select(`id,${column}`)
    .maybeSingle()

  if (error) {
    throw new Error(
      `A sincronização da preferência ${job.preference_id} não pôde ser confirmada: ${error.message}`,
    )
  }

  if (data) return

  // Another invocation may have completed the same idempotent job first.
  const {data: currentPreference, error: readError} = await supabase
    .from("payment_preferences")
    .select(`id,${column}`)
    .eq("id", job.preference_id)
    .maybeSingle()

  const currentAcknowledgement = currentPreference
    ? (currentPreference as Record<string, unknown>)[column]
    : null

  if (readError || !currentAcknowledgement) {
    throw new Error(
      `A confirmação da sincronização da preferência ${job.preference_id} não foi persistida.`,
    )
  }
}

export async function processMercadoPagoArtworkSyncJobs(
  supabase: SupabaseClient,
  jobs: MercadoPagoArtworkSyncJob[],
) {
  const processed: Array<{
    action: MercadoPagoArtworkSyncJob["action"]
    preferenceId: string
  }> = []

  for (const job of jobs) {
    const ownership = {
      artworkId: job.artwork_id,
      saleId: job.sale_id,
      paymentPreferenceId: job.preference_id,
    }

    if (job.action === "reserve") {
      await reserveArtworkForPayment({...ownership, expiresAt: job.expires_at})
    } else if (job.action === "sell") {
      if (!job.provider_payment_id) {
        throw new Error(
          `A preferência ${job.preference_id} está paga sem um pagamento aprovado.`,
        )
      }

      await markArtworkAsSold({
        ...ownership,
        providerPaymentId: job.provider_payment_id,
      })
    } else if (job.action === "refund") {
      await releaseArtworkAfterRefund(ownership)
    } else {
      await releaseArtworkReservation(ownership)
    }

    await acknowledgeJob(supabase, job)
    processed.push({action: job.action, preferenceId: job.preference_id})
  }

  return processed
}

export async function loadAndProcessMercadoPagoArtworkSyncJobs(
  supabase: SupabaseClient,
  options: SyncOptions = {},
) {
  const {data, error} = await supabase.rpc(
    "get_mercadopago_artwork_sync_jobs",
    {
      p_conversation_id: options.conversationId ?? null,
      p_limit: options.limit ?? 100,
    },
  )

  if (error) {
    throw new Error(`Não foi possível carregar a sincronização das obras: ${error.message}`)
  }

  return processMercadoPagoArtworkSyncJobs(
    supabase,
    (data ?? []) as MercadoPagoArtworkSyncJob[],
  )
}
