export type SaleStatus =
    | "negotiating"
    | "awaiting_payment"
    | "paid"
    | "preparing_delivery"
    | "shipped"
    | "delivered"
    | "completed"
    | "cancelled"

export type PaymentStatus =
    | "not_created"
    | "pending"
    | "approved"
    | "rejected"
    | "refunded"

export type Sale = {
  id: string
  artworkId: string
  customerId: string

  negotiatedPrice: string

  paymentMethod: string
  paymentStatus: PaymentStatus

  deliveryMethod: string
  deliveryStatus: string

  saleStatus: SaleStatus

  createdAt: string
}