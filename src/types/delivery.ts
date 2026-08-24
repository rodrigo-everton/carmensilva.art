export type DeliveryStatus =
  | "pending"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"

export type Delivery = {
  id: string

  saleId: string

  method: string
  status: DeliveryStatus

  recipientName: string | null

  postalCode: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null

  carrier: string | null
  trackingCode: string | null

  shippedAt: string | null
  deliveredAt: string | null

  createdAt: string
  updatedAt: string
}