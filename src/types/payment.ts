export type PaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "refunded"

export type PaymentPreferenceStatus =
  | "creating"
  | "active"
  | "paid"
  | "superseded"
  | "expired"
  | "refunded"
  | "failed"

export type PaymentPreferenceRow = {
  id: string
  sale_id: string
  conversation_id: string
  created_by: string
  provider: string
  provider_preference_id: string | null
  checkout_url: string | null
  amount_cents: number
  currency: string
  status: PaymentPreferenceStatus
  message_id: string | null
  expires_at: string
  provider_expiration_configured_at: string | null
  environment: "test" | "production" | "unclassified"
  seller_id: string | null
  created_at: string
  updated_at: string
}

export type PaymentPreference = {
  id: string
  saleId: string
  conversationId: string
  createdBy: string
  provider: string
  providerPreferenceId: string | null
  checkoutUrl: string | null
  amountCents: number
  currency: string
  status: PaymentPreferenceStatus
  messageId: string | null
  expiresAt: string
  providerExpirationConfiguredAt: string | null
  environment: "test" | "production" | "unclassified"
  sellerId: string | null
  createdAt: string
  updatedAt: string
}

export type Payment = {
  id: string

  saleId: string

  provider: string
  providerPaymentId: string | null

  amount: string
  currency: string

  paymentMethod: string | null
  status: PaymentStatus
  providerStatus: string | null
  statusDetail: string | null
  liveMode: boolean | null

  createdAt: string
  updatedAt: string
  paidAt: string | null
}
