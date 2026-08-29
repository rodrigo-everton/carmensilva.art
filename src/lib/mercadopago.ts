import "server-only"

import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  MPAuthenticationError,
  MPBadRequestError,
  MPForbiddenError,
  MPValidationError,
  Payment,
  Preference,
  WebhookSignatureValidator,
} from "mercadopago"

type CreatePreferenceInput = {
  paymentPreferenceId: string
  conversationId: string
  artworkId: string
  artworkTitle: string
  adminUserId: string
  amount: number
  payerEmail?: string
  siteUrl: URL
}

export type MercadoPagoPayment = Awaited<ReturnType<Payment["get"]>>

export class MercadoPagoConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MercadoPagoConfigurationError"
  }
}

let configuredAccessToken: string | null = null
let preferenceClient: Preference | null = null
let paymentClient: Payment | null = null

function getClients() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()

  if (!accessToken) {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_ACCESS_TOKEN não está configurado.",
    )
  }

  if (!preferenceClient || !paymentClient || configuredAccessToken !== accessToken) {
    const config = new MercadoPagoConfig({
      accessToken,
      options: {
        timeout: 10_000,
        maxRetries: 2,
      },
    })

    configuredAccessToken = accessToken
    preferenceClient = new Preference(config)
    paymentClient = new Payment(config)
  }

  return {
    preferences: preferenceClient,
    payments: paymentClient,
  }
}

export function getMercadoPagoWebhookSecret() {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()

  if (!secret) {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_WEBHOOK_SECRET não está configurado.",
    )
  }

  return secret
}

export function getPublicSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!configuredUrl) {
    throw new MercadoPagoConfigurationError(
      "NEXT_PUBLIC_SITE_URL não está configurado.",
    )
  }

  let siteUrl: URL

  try {
    siteUrl = new URL(configuredUrl)
  } catch {
    throw new MercadoPagoConfigurationError(
      "NEXT_PUBLIC_SITE_URL precisa ser uma URL válida.",
    )
  }

  if (siteUrl.protocol !== "https:") {
    throw new MercadoPagoConfigurationError(
      "NEXT_PUBLIC_SITE_URL precisa usar HTTPS para o Checkout Pro.",
    )
  }

  siteUrl.pathname = "/"
  siteUrl.search = ""
  siteUrl.hash = ""

  return siteUrl
}

export function getMercadoPagoCheckoutConfiguration() {
  const siteUrl = getPublicSiteUrl()

  getClients()
  getMercadoPagoWebhookSecret()

  return {siteUrl}
}

export async function createMercadoPagoPreference({
  paymentPreferenceId,
  conversationId,
  artworkId,
  artworkTitle,
  adminUserId,
  amount,
  payerEmail,
  siteUrl,
}: CreatePreferenceInput) {
  const returnUrl = new URL("/mensagem", siteUrl)
  returnUrl.searchParams.set("conversa", conversationId)

  const successUrl = new URL(returnUrl)
  successUrl.searchParams.set("pagamento", "sucesso")

  const pendingUrl = new URL(returnUrl)
  pendingUrl.searchParams.set("pagamento", "pendente")

  const failureUrl = new URL(returnUrl)
  failureUrl.searchParams.set("pagamento", "falha")

  const notificationUrl = new URL("/api/webhooks/mercadopago", siteUrl)
  notificationUrl.searchParams.set("source_news", "webhooks")

  const {preferences} = getClients()
  const response = await preferences.create({
    body: {
      items: [
        {
          id: artworkId,
          title: `Obra: ${artworkTitle}`.slice(0, 256),
          category_id: "art",
          quantity: 1,
          currency_id: "BRL",
          unit_price: amount,
        },
      ],
      payer: payerEmail ? {email: payerEmail} : undefined,
      external_reference: paymentPreferenceId,
      metadata: {
        payment_preference_id: paymentPreferenceId,
        conversation_id: conversationId,
        artwork_id: artworkId,
        created_by: adminUserId,
      },
      back_urls: {
        success: successUrl.toString(),
        pending: pendingUrl.toString(),
        failure: failureUrl.toString(),
      },
      auto_return: "approved",
      notification_url: notificationUrl.toString(),
      statement_descriptor: "CARMEM SILVA",
    },
    requestOptions: {
      idempotencyKey: paymentPreferenceId,
    },
  })

  if (!response.id || !response.init_point) {
    throw new Error("O Mercado Pago não devolveu a preferência completa.")
  }

  return {
    id: response.id,
    checkoutUrl: response.init_point,
  }
}

export async function getMercadoPagoPayment(paymentId: string) {
  const {payments} = getClients()
  return payments.get({id: paymentId})
}

export function validateMercadoPagoWebhookSignature(input: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}) {
  WebhookSignatureValidator.validate({
    ...input,
    secret: getMercadoPagoWebhookSecret(),
    toleranceSeconds: 300,
  })
}

export {InvalidWebhookSignatureError}

export function isDefinitiveMercadoPagoError(error: unknown) {
  return (
    error instanceof MercadoPagoConfigurationError ||
    error instanceof MPAuthenticationError ||
    error instanceof MPBadRequestError ||
    error instanceof MPForbiddenError ||
    error instanceof MPValidationError
  )
}
