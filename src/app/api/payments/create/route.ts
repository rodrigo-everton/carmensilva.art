import {randomUUID} from "node:crypto"

import type {SupabaseClient} from "@supabase/supabase-js"
import {NextResponse} from "next/server"

import {isAdmin} from "@/lib/auth"
import {
  createMercadoPagoPreference,
  getPublicSiteUrl,
  isDefinitiveMercadoPagoError,
  MercadoPagoConfigurationError,
} from "@/lib/mercadopago"
import {formatBrlFromCents, parseBrlAmount} from "@/lib/money"
import {createSupabaseAdminClient} from "@/lib/supabase-admin"
import {client as sanityClient} from "@/sanity/lib/client"
import {createClient} from "@/sanity/lib/supabase/server"
import {ARTWORKS_BY_IDS_QUERY} from "@/sanity/queries/artwork"

export const runtime = "nodejs"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type SaleRow = {
  id: string
  conversation_id: string | null
  artwork_id: string
  customer_id: string
  negotiated_price: string | number
  currency: string
  sale_status: string
}

type PaymentPreferenceRow = {
  id: string
  sale_id: string
  conversation_id: string
  created_by: string
  provider_preference_id: string | null
  checkout_url: string | null
  amount_cents: number
  currency: string
  status: string
  message_id: string
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({error: message}, {status})
}

function preferenceResponse(
  preference: PaymentPreferenceRow,
  existing: boolean,
) {
  if (!preference.checkout_url) {
    throw new Error("A preferência ainda não possui uma URL de pagamento.")
  }

  return NextResponse.json(
    {
      preference: {
        id: preference.id,
        amountCents: preference.amount_cents,
        currency: preference.currency,
        status: preference.status,
        checkoutUrl: preference.checkout_url,
      },
      existing,
    },
    {status: existing ? 200 : 201},
  )
}

async function ensurePaymentMessage(
  supabase: SupabaseClient,
  preference: PaymentPreferenceRow,
  artworkTitle: string,
) {
  if (!preference.checkout_url) {
    throw new Error("Não há link de pagamento para enviar.")
  }

  const {error: messageError} = await supabase.from("messages").insert({
    id: preference.message_id,
    conversation_id: preference.conversation_id,
    sender_id: preference.created_by,
    content: `Solicitação de pagamento para a obra “${artworkTitle}” no valor de ${formatBrlFromCents(preference.amount_cents)}.`,
    payment_preference_id: preference.id,
  })

  if (messageError && messageError.code !== "23505") {
    throw new Error(`Não foi possível enviar a cobrança: ${messageError.message}`)
  }

  const {error: conversationError} = await supabase
    .from("conversations")
    .update({status: "open", updated_at: new Date().toISOString()})
    .eq("id", preference.conversation_id)

  if (conversationError) {
    console.error(
      "Não foi possível atualizar a conversa após gerar o pagamento.",
      conversationError.message,
    )
  }
}

async function releaseSaleAfterFailure(
  supabase: SupabaseClient,
  saleId: string,
) {
  const {error} = await supabase
    .from("sales")
    .update({sale_status: "negotiating", updated_at: new Date().toISOString()})
    .eq("id", saleId)
    .eq("sale_status", "awaiting_payment")

  if (error) {
    console.error("Não foi possível liberar a venda após a falha.", error.message)
  }
}

export async function POST(request: Request) {
  const sessionClient = await createClient()
  const {
    data: {user},
  } = await sessionClient.auth.getUser()

  if (!user) {
    return errorResponse("Faça login para continuar.", 401)
  }

  if (!(await isAdmin(user))) {
    return errorResponse("Você não tem permissão para gerar pagamentos.", 403)
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse("Envie uma solicitação JSON válida.", 400)
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Dados do pagamento inválidos.", 400)
  }

  const input = body as Record<string, unknown>
  const conversationId =
    typeof input.conversationId === "string" ? input.conversationId.trim() : ""
  const amount = parseBrlAmount(input.amount)

  if (!UUID_PATTERN.test(conversationId)) {
    return errorResponse("A conversa informada é inválida.", 400)
  }

  if (!amount) {
    return errorResponse(
      "Informe um valor em reais maior que zero, com no máximo duas casas decimais.",
      400,
    )
  }

  let supabase: SupabaseClient

  try {
    supabase = createSupabaseAdminClient()
  } catch (error) {
    console.error("Configuração do Supabase indisponível.", error)
    return errorResponse("O serviço de pagamentos não está configurado.", 503)
  }

  const {data: conversation, error: conversationError} = await supabase
    .from("conversations")
    .select("id,customer_id,artwork_id,status")
    .eq("id", conversationId)
    .maybeSingle()

  if (conversationError) {
    console.error("Não foi possível consultar a conversa.", conversationError.message)
    return errorResponse("Não foi possível consultar essa conversa.", 500)
  }

  if (!conversation) {
    return errorResponse("Essa conversa não está disponível.", 404)
  }

  let artwork: {
    title: string
    status: string | null
  } | null = null

  try {
    const artworks = await sanityClient.withConfig({useCdn: false}).fetch(
      ARTWORKS_BY_IDS_QUERY,
      {ids: [conversation.artwork_id]},
    )
    artwork = artworks[0] ?? null
  } catch (error) {
    console.error("Não foi possível consultar a obra no Sanity.", error)
    return errorResponse("Não foi possível confirmar a disponibilidade da obra.", 502)
  }
  if (!artwork || !["available", "reserved"].includes(artwork.status ?? "")) {
    return errorResponse("Essa obra não está disponível para pagamento.", 409)
  }

  const {data: activePreferenceData, error: activePreferenceError} = await supabase
    .from("payment_preferences")
    .select(
      "id,sale_id,conversation_id,created_by,provider_preference_id,checkout_url,amount_cents,currency,status,message_id",
    )
    .eq("conversation_id", conversation.id)
    .in("status", ["creating", "active"])
    .order("created_at", {ascending: false})
    .limit(1)
    .maybeSingle()

  if (activePreferenceError) {
    console.error(
      "Não foi possível consultar cobranças existentes.",
      activePreferenceError.message,
    )
    return errorResponse("A estrutura de pagamentos ainda não está disponível.", 503)
  }

  let paymentPreference =
    (activePreferenceData as PaymentPreferenceRow | null) ?? null

  if (paymentPreference?.status === "active" && paymentPreference.checkout_url) {
    try {
      await ensurePaymentMessage(supabase, paymentPreference, artwork.title)
    } catch (error) {
      console.error("Não foi possível reenviar a cobrança existente.", error)
      return errorResponse("O pagamento existe, mas não pôde ser enviado no chat.", 500)
    }

    return preferenceResponse(paymentPreference, true)
  }

  if (
    paymentPreference?.status === "creating" &&
    paymentPreference.amount_cents !== amount.cents
  ) {
    return errorResponse(
      "Já existe uma geração em andamento com outro valor. Tente novamente em instantes.",
      409,
    )
  }

  let sale: SaleRow | null = null

  if (paymentPreference) {
    const {data, error} = await supabase
      .from("sales")
      .select(
        "id,conversation_id,artwork_id,customer_id,negotiated_price,currency,sale_status",
      )
      .eq("id", paymentPreference.sale_id)
      .maybeSingle()

    if (error || !data) {
      console.error("Não foi possível retomar a venda.", error?.message)
      return errorResponse("Não foi possível retomar a geração do pagamento.", 500)
    }

    sale = data as SaleRow
  } else {
    const {data, error} = await supabase
      .from("sales")
      .select(
        "id,conversation_id,artwork_id,customer_id,negotiated_price,currency,sale_status",
      )
      .eq("conversation_id", conversation.id)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("Não foi possível consultar a venda.", error.message)
      return errorResponse("Não foi possível preparar a venda.", 500)
    }

    sale = (data as SaleRow | null) ?? null

    if (
      sale &&
      ["paid", "preparing_delivery", "shipped", "delivered", "completed"].includes(
        sale.sale_status,
      )
    ) {
      return errorResponse("Essa obra já possui uma venda confirmada.", 409)
    }

    if (sale) {
      const {data: updatedSale, error: updateSaleError} = await supabase
        .from("sales")
        .update({
          negotiated_price: amount.decimal,
          currency: "BRL",
          sale_status: "awaiting_payment",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sale.id)
        .select(
          "id,conversation_id,artwork_id,customer_id,negotiated_price,currency,sale_status",
        )
        .single()

      if (updateSaleError || !updatedSale) {
        const conflict = updateSaleError?.code === "23505"
        console.error("Não foi possível reservar a venda.", updateSaleError?.message)
        return errorResponse(
          conflict
            ? "Essa obra já possui outra cobrança ou venda ativa."
            : "Não foi possível preparar a venda.",
          conflict ? 409 : 500,
        )
      }

      sale = updatedSale as SaleRow
    } else {
      const {data: createdSale, error: createSaleError} = await supabase
        .from("sales")
        .insert({
          conversation_id: conversation.id,
          artwork_id: conversation.artwork_id,
          customer_id: conversation.customer_id,
          negotiated_price: amount.decimal,
          currency: "BRL",
          sale_status: "awaiting_payment",
        })
        .select(
          "id,conversation_id,artwork_id,customer_id,negotiated_price,currency,sale_status",
        )
        .single()

      if (createSaleError || !createdSale) {
        const conflict = createSaleError?.code === "23505"
        console.error("Não foi possível criar a venda.", createSaleError?.message)
        return errorResponse(
          conflict
            ? "Essa obra já possui outra cobrança ou venda ativa."
            : "Não foi possível preparar a venda.",
          conflict ? 409 : 500,
        )
      }

      sale = createdSale as SaleRow
    }

    const newPreference = {
      id: randomUUID(),
      sale_id: sale.id,
      conversation_id: conversation.id,
      created_by: user.id,
      provider: "mercadopago",
      amount_cents: amount.cents,
      currency: "BRL",
      status: "creating",
      message_id: randomUUID(),
    }
    const {data: createdPreference, error: createPreferenceError} = await supabase
      .from("payment_preferences")
      .insert(newPreference)
      .select(
        "id,sale_id,conversation_id,created_by,provider_preference_id,checkout_url,amount_cents,currency,status,message_id",
      )
      .single()

    if (createPreferenceError || !createdPreference) {
      const conflict = createPreferenceError?.code === "23505"
      console.error(
        "Não foi possível registrar a preferência.",
        createPreferenceError?.message,
      )
      await releaseSaleAfterFailure(supabase, sale.id)
      return errorResponse(
        conflict
          ? "Já existe uma cobrança sendo gerada para esta conversa."
          : "Não foi possível registrar o pagamento.",
        conflict ? 409 : 500,
      )
    }

    paymentPreference = createdPreference as PaymentPreferenceRow
  }

  if (!sale || !paymentPreference) {
    return errorResponse("Não foi possível preparar o pagamento.", 500)
  }

  const {
    data: {user: customer},
    error: customerError,
  } = await supabase.auth.admin.getUserById(conversation.customer_id)

  if (customerError) {
    console.error("Não foi possível pré-preencher o e-mail do cliente.", customerError.message)
  }

  let mercadoPagoPreference: {id: string; checkoutUrl: string}

  try {
    mercadoPagoPreference = await createMercadoPagoPreference({
      paymentPreferenceId: paymentPreference.id,
      conversationId: conversation.id,
      artworkId: conversation.artwork_id,
      artworkTitle: artwork.title,
      adminUserId: paymentPreference.created_by,
      amount: paymentPreference.amount_cents / 100,
      payerEmail: customer?.email,
      siteUrl: getPublicSiteUrl(),
    })
  } catch (error) {
    console.error("Não foi possível criar a preferência no Mercado Pago.", error)

    if (isDefinitiveMercadoPagoError(error)) {
      await supabase
        .from("payment_preferences")
        .update({status: "failed", updated_at: new Date().toISOString()})
        .eq("id", paymentPreference.id)
        .eq("status", "creating")
      await releaseSaleAfterFailure(supabase, sale.id)
    }

    return errorResponse(
      error instanceof MercadoPagoConfigurationError
        ? "O Mercado Pago ainda não está configurado."
        : "O Mercado Pago não conseguiu gerar o link. Tente novamente.",
      error instanceof MercadoPagoConfigurationError ? 503 : 502,
    )
  }

  const {data: activatedPreference, error: activateError} = await supabase
    .from("payment_preferences")
    .update({
      provider_preference_id: mercadoPagoPreference.id,
      checkout_url: mercadoPagoPreference.checkoutUrl,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentPreference.id)
    .select(
      "id,sale_id,conversation_id,created_by,provider_preference_id,checkout_url,amount_cents,currency,status,message_id",
    )
    .single()

  if (activateError || !activatedPreference) {
    console.error("Não foi possível salvar o link de pagamento.", activateError?.message)
    return errorResponse(
      "O link foi criado, mas não pôde ser salvo. Tente novamente para recuperá-lo.",
      500,
    )
  }

  paymentPreference = activatedPreference as PaymentPreferenceRow

  try {
    await ensurePaymentMessage(supabase, paymentPreference, artwork.title)
  } catch (error) {
    console.error("Não foi possível enviar a cobrança no chat.", error)
    return errorResponse(
      "O link foi criado, mas não pôde ser enviado no chat. Tente novamente.",
      500,
    )
  }

  return preferenceResponse(paymentPreference, false)
}
