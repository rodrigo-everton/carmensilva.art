export type SaleStatus =
    | "negotiating"
    | "awaiting_payment"
    | "paid"
    | "preparing_delivery"
    | "shipped"
    | "delivered"
    | "completed"
    | "cancelled"

export type Sale = {
  id: string

  artworkId: string
  customerId: string
  conversationId: string | null

  negotiatedPrice: string
  currency: string

  saleStatus: SaleStatus

  createdAt: string
  updatedAt: string
}