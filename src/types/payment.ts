export type PaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "refunded"

export type Payment = {
  id: string

  saleId: string

  provider: string
  providerPaymentId: string | null

  amount: string
  currency: string

  paymentMethod: string | null
  status: PaymentStatus

  createdAt: string
  updatedAt: string
  paidAt: string | null
}