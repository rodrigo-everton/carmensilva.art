export type ConversationStatus =
  | "open"
  | "closed"
  | "archived"

export type Conversation = {
  id: string

  customerId: string
  artworkId: string

  status: ConversationStatus

  createdAt: string
  updatedAt: string
}