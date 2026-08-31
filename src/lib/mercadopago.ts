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
  SignatureFailureReason,
  User,
  WebhookSignatureValidator,
} from "mercadopago"

export type MercadoPagoEnvironment = "test" | "production"

type CreatePreferenceInput = {
  paymentPreferenceId: string
  conversationId: string
  artworkId: string
  artworkTitle: string
  adminUserId: string
  amount: number
  payerEmail?: string
  siteUrl: URL
  expiresAt: Date
}

export type MercadoPagoPayment = Awaited<ReturnType<Payment["get"]>>

export type MercadoPagoAccountIdentity = {
  sellerId: string
  environment: MercadoPagoEnvironment
  siteId: string
}

export class MercadoPagoConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MercadoPagoConfigurationError"
  }
}

let configuredAccessToken: string | null = null
let preferenceClient: Preference | null = null
let paymentClient: Payment | null = null
let userClient: User | null = null
let accountIdentityCacheKey: string | null = null
let accountIdentityPromise: Promise<MercadoPagoAccountIdentity> | null = null

const WEBHOOK_SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000
const DEFAULT_PREFERENCE_TTL_HOURS = 24
const MAX_PREFERENCE_TTL_HOURS = 24 * 7

function getClients() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()

  if (!accessToken) {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_ACCESS_TOKEN não está configurado.",
    )
  }

  if (
    !preferenceClient ||
    !paymentClient ||
    !userClient ||
    configuredAccessToken !== accessToken
  ) {
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
    userClient = new User(config)
    accountIdentityCacheKey = null
    accountIdentityPromise = null
  }

  return {
    preferences: preferenceClient,
    payments: paymentClient,
    users: userClient,
  }
}

function getMercadoPagoEnvironment(): MercadoPagoEnvironment {
  const environment = process.env.MERCADOPAGO_ENVIRONMENT?.trim().toLowerCase()

  if (environment !== "test" && environment !== "production") {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_ENVIRONMENT precisa ser 'test' ou 'production'.",
    )
  }

  return environment
}

function getExpectedMercadoPagoSellerId() {
  const sellerId = process.env.MERCADOPAGO_SELLER_ID?.trim()

  if (!sellerId || !/^\d+$/.test(sellerId)) {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_SELLER_ID precisa conter o ID numérico do vendedor.",
    )
  }

  return sellerId
}

function getExpectedMercadoPagoSiteId() {
  const siteId = process.env.MERCADOPAGO_SITE_ID?.trim().toUpperCase()

  if (!siteId || !/^ML[A-Z]$/.test(siteId)) {
    throw new MercadoPagoConfigurationError(
      "MERCADOPAGO_SITE_ID precisa conter o site do vendedor, como MLB.",
    )
  }

  return siteId
}

export function getMercadoPagoPreferenceTtlMs() {
  const configuredTtl = process.env.MERCADOPAGO_PREFERENCE_TTL_HOURS?.trim()
  const ttlHours = configuredTtl
    ? Number(configuredTtl)
    : DEFAULT_PREFERENCE_TTL_HOURS

  if (
    !Number.isInteger(ttlHours) ||
    ttlHours < 1 ||
    ttlHours > MAX_PREFERENCE_TTL_HOURS
  ) {
    throw new MercadoPagoConfigurationError(
      `MERCADOPAGO_PREFERENCE_TTL_HOURS precisa ser um inteiro entre 1 e ${MAX_PREFERENCE_TTL_HOURS}.`,
    )
  }

  return ttlHours * 60 * 60 * 1000
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
  const environment = getMercadoPagoEnvironment()
  const sellerId = getExpectedMercadoPagoSellerId()
  const siteId = getExpectedMercadoPagoSiteId()
  const preferenceTtlMs = getMercadoPagoPreferenceTtlMs()

  getClients()
  getMercadoPagoWebhookSecret()

  return {siteUrl, environment, sellerId, siteId, preferenceTtlMs}
}

export async function getValidatedMercadoPagoAccount() {
  const {environment, sellerId, siteId} = getMercadoPagoCheckoutConfiguration()
  const cacheKey = [configuredAccessToken, environment, sellerId, siteId].join(":")

  if (accountIdentityPromise && accountIdentityCacheKey === cacheKey) {
    return accountIdentityPromise
  }

  const {users} = getClients()
  accountIdentityCacheKey = cacheKey
  accountIdentityPromise = (async () => {
    const account = await users.get()
    const accountId = account.id === undefined ? "" : String(account.id)
    const accountSiteId = account.site_id?.trim().toUpperCase() ?? ""
    const isTestUser = account.tags?.includes("test_user") ?? false

    if (accountId !== sellerId) {
      throw new MercadoPagoConfigurationError(
        "O Access Token não pertence ao MERCADOPAGO_SELLER_ID configurado.",
      )
    }

    if (accountSiteId !== siteId) {
      throw new MercadoPagoConfigurationError(
        "O Access Token pertence a outro site/país do Mercado Pago.",
      )
    }

    if (environment === "test" && !isTestUser) {
      throw new MercadoPagoConfigurationError(
        "O ambiente de teste exige um Access Token de vendedor de teste.",
      )
    }

    if (environment === "production" && isTestUser) {
      throw new MercadoPagoConfigurationError(
        "O ambiente de produção não aceita um vendedor de teste.",
      )
    }

    if (account.status?.sell?.allow === false) {
      throw new MercadoPagoConfigurationError(
        "A conta Mercado Pago configurada não está habilitada para vender.",
      )
    }

    return {sellerId: accountId, environment, siteId}
  })()

  try {
    return await accountIdentityPromise
  } catch (error) {
    accountIdentityCacheKey = null
    accountIdentityPromise = null
    throw error
  }
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
  expiresAt,
}: CreatePreferenceInput) {
  const expirationTimestamp = expiresAt.getTime()

  if (
    !Number.isFinite(expirationTimestamp) ||
    expirationTimestamp <= Date.now()
  ) {
    throw new MercadoPagoConfigurationError(
      "A validade da preferência precisa estar no futuro.",
    )
  }

  const startsAt = new Date()
  const successUrl = new URL("/pagamento/sucesso", siteUrl)
  successUrl.searchParams.set("conversa", conversationId)

  const pendingUrl = new URL("/pagamento/pendente", siteUrl)
  pendingUrl.searchParams.set("conversa", conversationId)

  const failureUrl = new URL("/pagamento/falha", siteUrl)
  failureUrl.searchParams.set("conversa", conversationId)

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
      expires: true,
      expiration_date_from: startsAt.toISOString(),
      expiration_date_to: expiresAt.toISOString(),
    },
    requestOptions: {
      idempotencyKey: paymentPreferenceId,
    },
  })

  const confirmedExpiration = response.expiration_date_to
    ? Date.parse(response.expiration_date_to)
    : Number.NaN

  if (
    !response.id ||
    !response.init_point ||
    response.expires !== true ||
    !Number.isFinite(confirmedExpiration) ||
    Math.abs(confirmedExpiration - expirationTimestamp) > 1_000
  ) {
    throw new Error("O Mercado Pago não devolveu a preferência completa.")
  }

  return {
    id: response.id,
    checkoutUrl: response.init_point,
    expiresAt: new Date(confirmedExpiration).toISOString(),
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
  })

  // Mercado Pago currently sends milliseconds, while older notifications and
  // some SDK examples use seconds. The SDK's optional tolerance assumes
  // seconds only, so validate the signed raw value first and normalize it here.
  let timestamp: string | undefined

  for (const part of input.xSignature?.split(",") ?? []) {
    const separatorIndex = part.indexOf("=")

    if (separatorIndex === -1) continue

    const key = part.slice(0, separatorIndex).trim().toLowerCase()
    const value = part.slice(separatorIndex + 1).trim()

    if (key === "ts" && value) timestamp = value
  }

  if (!timestamp) {
    throw new InvalidWebhookSignatureError(
      SignatureFailureReason.MissingTimestamp,
      input.xRequestId?.trim() || undefined,
    )
  }

  const rawTimestamp = Number(timestamp)

  if (!Number.isSafeInteger(rawTimestamp) || rawTimestamp <= 0) {
    throw new InvalidWebhookSignatureError(
      SignatureFailureReason.MalformedSignatureHeader,
      input.xRequestId?.trim() || undefined,
      timestamp,
    )
  }

  const timestampMs =
    rawTimestamp >= 1_000_000_000_000
      ? rawTimestamp
      : rawTimestamp * 1000

  if (Math.abs(Date.now() - timestampMs) > WEBHOOK_SIGNATURE_TOLERANCE_MS) {
    throw new InvalidWebhookSignatureError(
      SignatureFailureReason.TimestampOutOfTolerance,
      input.xRequestId?.trim() || undefined,
      timestamp,
    )
  }
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
