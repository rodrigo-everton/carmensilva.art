"use server"

import {cookies} from "next/headers"
import {revalidatePath} from "next/cache"
import {redirect} from "next/navigation"

import {
  openArtworkConversation,
  pendingArtworkCookie,
} from "@/lib/conversations"
import {isAdmin} from "@/lib/auth"
import {createClient} from "@/sanity/lib/supabase/server"

function conversationHref(conversationId: string, error?: string) {
  const params = new URLSearchParams({conversa: conversationId})

  if (error) {
    params.set("erro", error)
  }

  return `/mensagem?${params.toString()}`
}

export async function startArtworkConversation(formData: FormData) {
  const artworkId = String(formData.get("artworkId") ?? "")
  let result: Awaited<ReturnType<typeof openArtworkConversation>>

  try {
    result = await openArtworkConversation(artworkId)
  } catch (conversationError) {
    console.error("Não foi possível iniciar a conversa.", conversationError)
    redirect("/venda?interesse=erro")
  }

  if (result.status === "unauthenticated") {
    const cookieStore = await cookies()
    cookieStore.set(pendingArtworkCookie, artworkId, {
      httpOnly: true,
      maxAge: 60 * 15,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
    redirect("/login?interesse=1")
  }

  if (result.status === "admin") {
    redirect("/admin/mensagem")
  }

  if (result.status === "unavailable") {
    redirect("/venda?interesse=indisponivel")
  }

  redirect(conversationHref(result.conversationId))
}

export async function sendCustomerMessage(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()

  if (!conversationId) {
    redirect("/mensagem?erro=conversa-invalida")
  }

  if (!content || content.length > 3000) {
    redirect(conversationHref(conversationId, "mensagem-invalida"))
  }

  const supabase = await createClient()
  const {
    data: {user},
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  if (await isAdmin(user)) {
    redirect("/admin/mensagem")
  }

  const {data: conversation, error: conversationError} = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("customer_id", user.id)
    .maybeSingle()

  if (conversationError || !conversation) {
    redirect("/mensagem?erro=conversa-invalida")
  }

  const now = new Date().toISOString()
  const {error: messageError} = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: user.id,
    content,
  })

  if (messageError) {
    console.error("Não foi possível enviar a mensagem.", messageError.message)
    redirect(conversationHref(conversation.id, "envio-falhou"))
  }

  const {error: updateError} = await supabase
    .from("conversations")
    .update({status: "open", updated_at: now})
    .eq("id", conversation.id)
    .eq("customer_id", user.id)

  if (updateError) {
    console.error("Não foi possível atualizar a conversa.", updateError.message)
  }

  revalidatePath("/mensagem")
  revalidatePath("/admin/mensagem")
  redirect(conversationHref(conversation.id))
}
