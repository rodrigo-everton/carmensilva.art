import {revalidatePath} from "next/cache"
import type {NextRequest} from "next/server"
import {NextResponse} from "next/server"
import type {SupabaseClient} from "@supabase/supabase-js"

import {
  getMercadoPagoPayment,
  InvalidWebhookSignatureError,
  MercadoPagoConfigurationError,
  validateMercadoPagoWebhookSignature,
} from "@/lib/mercadopago"
import {numberToCents} from "@/lib/money"
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

  try {
    payment = await getMercadoPagoPayment(dataId)
  } catch (error) {
    console.error("Não foi possível consultar o pagamento no Mercado Pago.", {
      paymentId: dataId,
      requestId,
      error,
    })
    return NextResponse.json(
      {error: "Não foi possível consultar o pagamento."},
      {status: 502},
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
    .select("id,sale_id,conversation_id,amount_cents,currency,status")
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
  const metadataPreferenceId = metadataString(
    payment.metadata,
    "payment_preference_id",
  )
  const metadataConversationId = metadataString(payment.metadata, "conversation_id")

  if (metadataPreferenceId && metadataPreferenceId !== preference.id) {
    console.warn("Metadata divergente no pagamento do Mercado Pago.", {
      paymentId: dataId,
      requestId,
    })
    return ignoredResponse("mismatched_preference_metadata")
  }

  if (metadataConversationId && metadataConversationId !== preference.conversation_id) {
    console.warn("Conversa divergente no pagamento do Mercado Pago.", {
      paymentId: dataId,
      requestId,
    })
    return ignoredResponse("mismatched_conversation_metadata")
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
    return ignoredResponse("mismatched_amount_or_currency")
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

  revalidatePath("/admin/venda")
  revalidatePath("/admin/mensagem")
  revalidatePath("/mensagem")

  return NextResponse.json({received: true, processed: true})
}
