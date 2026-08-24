export type Message = {
  id: string

  conversationId: string
  senderId: string

  content: string

  createdAt: string
  readAt: string | null
}