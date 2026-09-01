import {revalidatePath} from "next/cache"
import type {NextRequest} from "next/server"
import {NextResponse} from "next/server"
import type {SupabaseClient} from "@supabase/supabase-js"

import {
  getMercadoPagoPayment,
  getValidatedMercadoPagoAccount,
  InvalidWebhookSignatureError,
  MercadoPagoConfigurationError,
  validateMercadoPagoWebhookSignature,
} from "@/lib/mercadopago"
import {numberToCents} from "@/lib/money"
import {loadAndProcessMercadoPagoArtworkSyncJobs} from "@/lib/payment-artwork-sync"
import {createSupabaseAdminClient} from "@/lib/supabase-admin"
import type {PaymentStatus} from "@/types/payment"

export const runtime = "nodejs"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type WebhookBody = {
  type?: unknown
  action?: unknown
  data?: {
    id?: unknown
  }
}

type PaymentPreferenceRow = {
  id: string
  sale_id: string
  conversation_id: string
  amount_cents: number
  currency: string
  status: string
  provider_preference_id: string | null
  created_by: string
  environment: string
  seller_id: string | null
}

type SaleRow = {
  id: string
  artwork_id: string
  sale_status: string
}

function normalizedPaymentStatus(providerStatus: string): PaymentStatus {
  switch (providerStatus) {
    case "approved":
      return "approved"
    case "rejected":
    case "cancelled":
      return "rejected"
    case "refunded":
    case "charged_back":
      return "refunded"
    default:
      return "pending"
  }
}

function metadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === "string" ? value : null
}

function ignoredResponse(reason: string) {
  return NextResponse.json({received: true, processed: false, reason})
}

function reconciliationConflict(reason: string) {
  return NextResponse.json(
    {received: true, processed: false, reason},
    {status: 409},
  )
}

export async function POST(request: NextRequest) {
  const dataId = request.nextUrl.searchParams.get("data.id")
  const requestId = request.headers.get("x-request-id")

  try {
    validateMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: requestId,
      dataId,
    })
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.warn("Webhook do Mercado Pago com assinatura inválida.", {
        reason: error.reason,
        requestId: error.requestId,
      })
      return NextResponse.json({error: "Assinatura inválida."}, {status: 401})
    }

    if (error instanceof MercadoPagoConfigurationError) {
      console.error("Webhook do Mercado Pago não configurado.", error.message)
      return NextResponse.json({error: "Webhook não configurado."}, {status: 503})
    }

    console.error("Não foi possível validar o webhook do Mercado Pago.", error)
    return NextResponse.json({error: "Não foi possível validar o webhook."}, {status: 500})
  }

  let body: WebhookBody = {}

  try {
    body = (await request.json()) as WebhookBody
  } catch {
    // Mercado Pago also sends the canonical resource ID in the signed query.
  }

  const queryType = request.nextUrl.searchParams.get("type")
  const bodyType = typeof body.type === "string" ? body.type : null
  const notificationType = queryType ?? bodyType

  if (notificationType && notificationType !== "payment") {
    return ignoredResponse("unsupported_notification_type")
  }

  if (!dataId || !/^\d+$/.test(dataId)) {
    return NextResponse.json({error: "Identificador de pagamento inválido."}, {status: 400})
  }

  const bodyDataId =
    typeof body.data?.id === "string" || typeof body.data?.id === "number"
      ? String(body.data.id)
      : null

  if (bodyDataId && bodyDataId !== dataId) {
    return NextResponse.json(
      {error: "O identificador assinado difere do corpo da notificação."},
      {status: 400},
    )
  }

  let payment: Awaited<ReturnType<typeof getMercadoPagoPayment>>
  let accountIdentity: Awaited<ReturnType<typeof getValidatedMercadoPagoAccount>>

  try {
    const canonicalResources = await Promise.all([
      getMercadoPagoPayment(dataId),
      getValidatedMercadoPagoAccount(),
    ])
    payment = canonicalResources[0]
    accountIdentity = canonicalResources[1]
  } catch (error) {
    console.error("Não foi possível consultar o pagamento no Mercado Pago.", {
      paymentId: dataId,
      requestId,
      error,
    })
    return NextResponse.json(
      {
        error:
          error instanceof MercadoPagoConfigurationError
            ? "Mercado Pago não configurado."
            : "Não foi possível consultar o pagamento.",
      },
      {status: error instanceof MercadoPagoConfigurationError ? 503 : 502},
    )
  }

  const externalReference = payment.external_reference?.trim()

  if (!externalReference || !UUID_PATTERN.test(externalReference)) {
    return ignoredResponse("unknown_external_reference")
  }

  let supabase: SupabaseClient

  try {
    supabase = createSupabaseAdminClient()
  } catch (error) {
    console.error("Supabase indisponível no webhook.", error)
    return NextResponse.json({error: "Persistência não configurada."}, {status: 503})
  }

  const {data: preferenceData, error: preferenceError} = await supabase
    .from("payment_preferences")
    .select(
      "id,sale_id,conversation_id,amount_cents,currency,status,provider_preference_id,created_by,environment,seller_id",
    )
    .eq("id", externalReference)
    .maybeSingle()

  if (preferenceError) {
    console.error("Não foi possível conciliar a preferência.", preferenceError.message)
    return NextResponse.json({error: "Falha ao conciliar o pagamento."}, {status: 500})
  }

  if (!preferenceData) {
    return ignoredResponse("unknown_payment_preference")
  }

  const preference = preferenceData as PaymentPreferenceRow
  const collectorId =
    payment.collector_id === undefined || payment.collector_id === null
      ? null
      : String(payment.collector_id)

  if (
    preference.environment !== accountIdentity.environment ||
    preference.seller_id !== accountIdentity.sellerId
  ) {
    console.warn("Pagamento recebido para outro ambiente ou vendedor.", {
      paymentId: dataId,
      requestId,
      preferenceId: preference.id,
    })
    return reconciliationConflict("mismatched_preference_environment")
  }

  if (collectorId !== accountIdentity.sellerId) {
    console.warn("O coletor do pagamento não é o vendedor configurado.", {
      paymentId: dataId,
      requestId,
      preferenceId: preference.id,
    })
    return reconciliationConflict("mismatched_payment_collector")
  }

  const expectedLiveMode = accountIdentity.environment === "production"

  if (payment.live_mode !== expectedLiveMode) {
    console.warn("O modo do pagamento diverge do ambiente configurado.", {
      paymentId: dataId,
      requestId,
      preferenceId: preference.id,
    })
    return reconciliationConflict("mismatched_payment_environment")
  }

  const {data: saleData, error: saleError} = await supabase
    .from("sales")
    .select("id,artwork_id,sale_status")
    .eq("id", preference.sale_id)
    .maybeSingle()

  if (saleError || !saleData) {
    console.error("Não foi possível localizar a venda do pagamento.", {
      paymentId: dataId,
      requestId,
      error: saleError?.message,
    })
    return NextResponse.json({error: "Falha ao conciliar a venda."}, {status: 500})
  }

  const sale = saleData as SaleRow
  const metadataPreferenceId = metadataString(
    payment.metadata,
    "payment_preference_id",
  )
  const metadataConversationId = metadataString(payment.metadata, "conversation_id")
  const metadataArtworkId = metadataString(payment.metadata, "artwork_id")
  const metadataCreatedBy = metadataString(payment.metadata, "created_by")

  if (metadataPreferenceId !== preference.id) {
    console.warn("Metadata divergente no pagamento do Mercado Pago.", {
      paymentId: dataId,
      requestId,
    })
    return reconciliationConflict("mismatched_preference_metadata")
  }

  if (metadataConversationId !== preference.conversation_id) {
    console.warn("Conversa divergente no pagamento do Mercado Pago.", {
      paymentId: dataId,
      requestId,
    })
    return reconciliationConflict("mismatched_conversation_metadata")
  }

  if (metadataArtworkId !== sale.artwork_id) {
    console.warn("Obra divergente no pagamento do Mercado Pago.", {
      paymentId: dataId,
      requestId,
    })
    return reconciliationConflict("mismatched_artwork_metadata")
  }

  if (metadataCreatedBy !== preference.created_by) {
    console.warn("Criador divergente no pagamento do Mercado Pago.", {
      paymentId: dataId,
      requestId,
    })
    return reconciliationConflict("mismatched_creator_metadata")
  }

  const amountCents = numberToCents(payment.transaction_amount)

  if (
    amountCents !== preference.amount_cents ||
    payment.currency_id !== preference.currency
  ) {
    console.error("Valor ou moeda divergente no pagamento do Mercado Pago.", {
      paymentId: dataId,
      requestId,
      preferenceId: preference.id,
    })
    return reconciliationConflict("mismatched_amount_or_currency")
  }

  if (payment.id === undefined || payment.id === null) {
    return ignoredResponse("missing_canonical_payment_id")
  }

  const providerStatus = payment.status ?? "unknown"
  const paidAt =
    payment.date_approved && !Number.isNaN(Date.parse(payment.date_approved))
      ? payment.date_approved
      : null

  const {error: recordError} = await supabase.rpc(
    "record_mercadopago_payment",
    {
      p_preference_id: preference.id,
      p_provider_payment_id: String(payment.id),
      p_amount: payment.transaction_amount,
      p_currency: payment.currency_id,
      p_payment_method:
        payment.payment_method_id ??
        payment.payment_method?.id ??
        payment.payment_type_id ??
        null,
      p_status: normalizedPaymentStatus(providerStatus),
      p_provider_status: providerStatus,
      p_status_detail: payment.status_detail ?? null,
      p_live_mode: payment.live_mode ?? null,
      p_paid_at: paidAt,
    },
  )

  if (recordError) {
    console.error("Não foi possível registrar o pagamento confirmado.", {
      paymentId: dataId,
      requestId,
      error: recordError.message,
    })
    return NextResponse.json({error: "Falha ao registrar o pagamento."}, {status: 500})
  }

  try {
    await loadAndProcessMercadoPagoArtworkSyncJobs(supabase, {
      conversationId: preference.conversation_id,
    })
  } catch (error) {
    console.error("Pagamento salvo, mas a obra não foi sincronizada no Sanity.", {
      paymentId: dataId,
      requestId,
      preferenceId: preference.id,
      error,
    })
    return NextResponse.json(
      {error: "Falha ao sincronizar a disponibilidade da obra."},
      {status: 500},
    )
  }

  revalidatePath("/admin/venda")
  revalidatePath("/admin/mensagem")
  revalidatePath("/mensagem")

  return NextResponse.json({received: true, processed: true})
}
