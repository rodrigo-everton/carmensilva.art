"use server"

import {revalidatePath} from "next/cache"
import {redirect} from "next/navigation"

import {requireAdmin} from "@/lib/auth"
import {createClient} from "@/sanity/lib/supabase/server"

function adminConversationHref(conversationId: string, error?: string) {
  const params = new URLSearchParams({conversa: conversationId})

  if (error) {
    params.set("erro", error)
  }

  return `/admin/mensagem?${params.toString()}`
}

export async function sendAdminMessage(formData: FormData) {
  const admin = await requireAdmin()
  const conversationId = String(formData.get("conversationId") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()

  if (!conversationId) {
    redirect("/admin/mensagem?erro=conversa-invalida")
  }

  if (!content || content.length > 3000) {
    redirect(adminConversationHref(conversationId, "mensagem-invalida"))
  }

  const supabase = await createClient()
  const {data: conversation, error: conversationError} = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle()

  if (conversationError || !conversation) {
    redirect("/admin/mensagem?erro=conversa-invalida")
  }

  const now = new Date().toISOString()
  const {error: messageError} = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    sender_id: admin.id,
    content,
  })

  if (messageError) {
    console.error("Não foi possível enviar a resposta.", messageError.message)
    redirect(adminConversationHref(conversation.id, "envio-falhou"))
  }

  const {error: updateError} = await supabase
    .from("conversations")
    .update({status: "open", updated_at: now})
    .eq("id", conversation.id)

  if (updateError) {
    console.error("Não foi possível atualizar a conversa.", updateError.message)
  }

  revalidatePath("/admin/mensagem")
  revalidatePath("/mensagem")
  redirect(adminConversationHref(conversation.id))
}
