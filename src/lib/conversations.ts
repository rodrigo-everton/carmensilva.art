import "server-only"

import {cookies} from "next/headers"

import {client as sanityClient} from "@/sanity/lib/client"
import {createClient} from "@/sanity/lib/supabase/server"
import {ARTWORK_INTEREST_QUERY} from "@/sanity/queries/artwork"

import {isAdmin} from "./auth"

export const pendingArtworkCookie = "carmem-pending-artwork"

export type ConversationRow = {
  id: string
  customer_id: string
  artwork_id: string
  status: "open" | "closed" | "archived"
  created_at: string
  updated_at: string
}

export type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

export type OpenArtworkConversationResult =
  | {status: "ready"; conversationId: string}
  | {status: "unauthenticated"}
  | {status: "admin"}
  | {status: "unavailable"}

export async function openArtworkConversation(
  artworkId: string,
): Promise<OpenArtworkConversationResult> {
  const normalizedArtworkId = artworkId.trim()

  if (!normalizedArtworkId || normalizedArtworkId.length > 200) {
    return {status: "unavailable"}
  }

  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    return {status: "unauthenticated"}
  }

  if (await isAdmin(user)) {
    return {status: "admin"}
  }

  // Availability affects a sale, so bypass the CDN for this validation.
  const artwork = await sanityClient.withConfig({useCdn: false}).fetch(
    ARTWORK_INTEREST_QUERY,
    {id: normalizedArtworkId},
  )

  if (!artwork) {
    return {status: "unavailable"}
  }

  const {data: existingConversation, error: existingError} = await supabase
    .from("conversations")
    .select("id,status")
    .eq("customer_id", user.id)
    .eq("artwork_id", artwork.id)
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Não foi possível localizar a conversa: ${existingError.message}`)
  }

  if (existingConversation) {
    if (existingConversation.status !== "open") {
      const {error: reopenError} = await supabase
        .from("conversations")
        .update({status: "open", updated_at: new Date().toISOString()})
        .eq("id", existingConversation.id)
        .eq("customer_id", user.id)

      if (reopenError) {
        throw new Error(`Não foi possível reabrir a conversa: ${reopenError.message}`)
      }
    }

    return {status: "ready", conversationId: existingConversation.id}
  }

  const {data: conversation, error: conversationError} = await supabase
    .from("conversations")
    .insert({
      customer_id: user.id,
      artwork_id: artwork.id,
      status: "open",
    })
    .select("id")
    .single()

  if (conversationError || !conversation) {
    throw new Error(
      `Não foi possível criar a conversa: ${conversationError?.message ?? "erro desconhecido"}`,
    )
  }

  const {error: messageError} = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: user.id,
    content: `Tenho interesse na obra “${artwork.title}” e gostaria de saber mais detalhes.`,
  })

  if (messageError) {
    // The conversation remains available so the customer can still write from
    // the message screen if the automatic opening message cannot be stored.
    console.error("Não foi possível registrar a mensagem inicial.", messageError.message)
  }

  return {status: "ready", conversationId: conversation.id}
}

export async function consumePendingArtworkConversation() {
  const cookieStore = await cookies()
  const artworkId = cookieStore.get(pendingArtworkCookie)?.value

  if (!artworkId) {
    return null
  }

  const result = await openArtworkConversation(artworkId)

  if (result.status !== "unauthenticated") {
    cookieStore.delete(pendingArtworkCookie)
  }

  switch (result.status) {
    case "ready":
      return `/mensagem?conversa=${encodeURIComponent(result.conversationId)}`
    case "admin":
      return "/admin/mensagem"
    case "unavailable":
      return "/venda?interesse=indisponivel"
    default:
      return null
  }
}
