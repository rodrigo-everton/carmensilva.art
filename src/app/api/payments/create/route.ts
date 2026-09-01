import {randomUUID} from "node:crypto"

import type {SupabaseClient} from "@supabase/supabase-js"
import {NextResponse} from "next/server"

import {isAdmin} from "@/lib/auth"
import {
  createMercadoPagoPreference,
  getMercadoPagoCheckoutConfiguration,
  getValidatedMercadoPagoAccount,
  isDefinitiveMercadoPagoError,
  MercadoPagoConfigurationError,
} from "@/lib/mercadopago"
import {formatBrlFromCents, parseBrlAmount} from "@/lib/money"
import {loadAndProcessMercadoPagoArtworkSyncJobs} from "@/lib/payment-artwork-sync"
import {createSupabaseAdminClient} from "@/lib/supabase-admin"
import {client as sanityClient} from "@/sanity/lib/client"
import {ArtworkCommerceConflictError} from "@/sanity/lib/artwork-commerce"
import {createClient} from "@/sanity/lib/supabase/server"
import {
  assertSanityWriteConfigured,
  SanityWriteConfigurationError,
} from "@/sanity/lib/write-client"
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
  expires_at: string
  provider_expiration_configured_at: string | null
  environment: string
  seller_id: string | null
  sanity_sync_required: boolean
  sanity_reserved_at: string | null
  sanity_sold_at: string | null
  sanity_released_at: string | null
  creation_lease_token: string | null
  creation_lease_expires_at: string | null
}

const PAYMENT_PREFERENCE_SELECT =
  "id,sale_id,conversation_id,created_by,provider_preference_id,checkout_url,amount_cents,currency,status,message_id,expires_at,provider_expiration_configured_at,environment,seller_id,sanity_sync_required,sanity_reserved_at,sanity_sold_at,sanity_released_at,creation_lease_token,creation_lease_expires_at"

const CREATION_LEASE_MS = 2 * 60 * 1000

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
        expiresAt: preference.expires_at,
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
  const {data, error} = await supabase.rpc(
    "release_mercadopago_sale_if_unreserved",
    {p_sale_id: saleId},
  )

  if (error) {
    console.error("Não foi possível liberar a venda após a falha.", error.message)
    return false
  }

  return data === true
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

  let checkoutConfiguration: ReturnType<
    typeof getMercadoPagoCheckoutConfiguration
  >
  let accountIdentity: Awaited<ReturnType<typeof getValidatedMercadoPagoAccount>>

  try {
    checkoutConfiguration = getMercadoPagoCheckoutConfiguration()
    assertSanityWriteConfigured()
    accountIdentity = await getValidatedMercadoPagoAccount()
  } catch (error) {
    console.error("Configuração do checkout indisponível.", error)

    if (
      error instanceof MercadoPagoConfigurationError ||
      error instanceof SanityWriteConfigurationError
    ) {
      return errorResponse("O checkout ainda não está configurado.", 503)
    }

    return errorResponse(
      "Não foi possível validar a conta do Mercado Pago. Tente novamente.",
      502,
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

  try {
    await loadAndProcessMercadoPagoArtworkSyncJobs(supabase, {
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error("Não foi possível reconciliar cobranças antigas.", error)
    return errorResponse(
      "A disponibilidade da obra ainda está sendo sincronizada. Tente novamente.",
      502,
    )
  }

  let artwork: {
    title: string
    status: string | null
  } | null = null

  try {
    const artworks = await sanityClient.withConfig({
      useCdn: false,
      perspective: "published",
    }).fetch(
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
    .select(PAYMENT_PREFERENCE_SELECT)
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

  if (
    paymentPreference &&
    (paymentPreference.environment !== accountIdentity.environment ||
      paymentPreference.seller_id !== accountIdentity.sellerId)
  ) {
    const {error: supersedeError} = await supabase
      .from("payment_preferences")
      .update({status: "superseded", updated_at: new Date().toISOString()})
      .eq("id", paymentPreference.id)
      .in("status", ["creating", "active"])

    if (supersedeError) {
      console.error(
        "Não foi possível encerrar a cobrança de outro ambiente.",
        supersedeError.message,
      )
      return errorResponse("Não foi possível substituir a cobrança anterior.", 500)
    }

    try {
      await loadAndProcessMercadoPagoArtworkSyncJobs(supabase, {
        conversationId: conversation.id,
      })
    } catch (error) {
      console.error(
        "Não foi possível liberar a reserva da cobrança substituída.",
        error,
      )
      return errorResponse(
        "A cobrança anterior foi encerrada, mas a obra ainda está sendo sincronizada.",
        502,
      )
    }

    paymentPreference = null
  }

  if (paymentPreference?.status === "active" && paymentPreference.checkout_url) {
    if (
      !paymentPreference.provider_expiration_configured_at ||
      Date.parse(paymentPreference.expires_at) <= Date.now()
    ) {
      try {
        await loadAndProcessMercadoPagoArtworkSyncJobs(supabase, {
          conversationId: conversation.id,
        })
      } catch (error) {
        console.error("Não foi possível encerrar a cobrança vencida.", error)
      }

      return errorResponse(
        paymentPreference.provider_expiration_configured_at
          ? "A cobrança anterior venceu. Tente novamente para gerar outra."
          : "A cobrança existente não possui validade confirmada no provedor.",
        paymentPreference.provider_expiration_configured_at ? 409 : 503,
      )
    }

    try {
      await loadAndProcessMercadoPagoArtworkSyncJobs(supabase, {
        conversationId: conversation.id,
      })
      await ensurePaymentMessage(supabase, paymentPreference, artwork.title)
    } catch (error) {
      console.error("Não foi possível reenviar a cobrança existente.", error)
      return errorResponse("O pagamento existe, mas não pôde ser enviado no chat.", 500)
    }

    return preferenceResponse(paymentPreference, true)
  }

  if (!paymentPreference && artwork.status !== "available") {
    return errorResponse(
      "Essa obra já está reservada e não possui uma cobrança ativa desta conversa.",
      409,
    )
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

  let creationLeaseToken: string | null = null

  if (paymentPreference?.status === "creating") {
    const leaseClaimedAt = new Date()
    creationLeaseToken = randomUUID()

    const {data: claimedPreference, error: claimError} = await supabase
      .from("payment_preferences")
      .update({
        creation_lease_token: creationLeaseToken,
        creation_lease_expires_at: new Date(
          leaseClaimedAt.getTime() + CREATION_LEASE_MS,
        ).toISOString(),
        sanity_sync_required: true,
      })
      .eq("id", paymentPreference.id)
      .eq("status", "creating")
      .or(
        `creation_lease_expires_at.is.null,creation_lease_expires_at.lte.${leaseClaimedAt.toISOString()}`,
      )
      .select(PAYMENT_PREFERENCE_SELECT)
      .maybeSingle()

    if (claimError) {
      console.error("Não foi possível assumir a geração do pagamento.", claimError.message)
      return errorResponse("Não foi possível retomar a geração do pagamento.", 500)
    }

    if (!claimedPreference) {
      return errorResponse(
        "Esta cobrança já está sendo gerada. Tente novamente em instantes.",
        409,
      )
    }

    paymentPreference = claimedPreference as PaymentPreferenceRow
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
      const {data: protectedPayment, error: protectedPaymentError} = await supabase
        .from("payments")
        .select("id,status")
        .eq("sale_id", sale.id)
        .in("status", ["pending", "approved"])
        .limit(1)
        .maybeSingle()

      if (protectedPaymentError) {
        console.error(
          "Não foi possível verificar pagamentos em andamento.",
          protectedPaymentError.message,
        )
        return errorResponse("Não foi possível confirmar o estado da venda.", 500)
      }

      if (protectedPayment) {
        return errorResponse(
          "Já existe um pagamento em processamento ou confirmado para esta obra.",
          409,
        )
      }
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

    const expiresAt = new Date(
      Date.now() + checkoutConfiguration.preferenceTtlMs,
    ).toISOString()
    creationLeaseToken = randomUUID()
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
      expires_at: expiresAt,
      environment: accountIdentity.environment,
      seller_id: accountIdentity.sellerId,
      sanity_sync_required: true,
      creation_lease_token: creationLeaseToken,
      creation_lease_expires_at: new Date(
        Date.now() + CREATION_LEASE_MS,
      ).toISOString(),
    }
    const {data: createdPreference, error: createPreferenceError} = await supabase
      .from("payment_preferences")
      .insert(newPreference)
      .select(PAYMENT_PREFERENCE_SELECT)
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

  try {
    await loadAndProcessMercadoPagoArtworkSyncJobs(supabase, {
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error("Não foi possível reservar a obra no Sanity.", error)

    const failedAt = new Date().toISOString()
    const failureUpdate: Record<string, unknown> = {
      status: "failed",
      creation_lease_token: null,
      creation_lease_expires_at: null,
      updated_at: failedAt,
    }

    if (error instanceof ArtworkCommerceConflictError) {
      failureUpdate.sanity_released_at = failedAt
    }

    let failQuery = supabase
      .from("payment_preferences")
      .update(failureUpdate)
      .eq("id", paymentPreference.id)
      .eq("status", "creating")

    if (creationLeaseToken) {
      failQuery = failQuery.eq("creation_lease_token", creationLeaseToken)
    }

    await failQuery

    try {
      await loadAndProcessMercadoPagoArtworkSyncJobs(supabase, {
        conversationId: conversation.id,
      })
    } catch (releaseError) {
      console.error(
        "Não foi possível confirmar a liberação da reserva no Sanity.",
        releaseError,
      )
    }

    return errorResponse(
      error instanceof ArtworkCommerceConflictError
        ? "Essa obra já está reservada por outra negociação."
        : "Não foi possível sincronizar a reserva da obra.",
      error instanceof ArtworkCommerceConflictError ? 409 : 502,
    )
  }

  const {
    data: {user: customer},
    error: customerError,
  } = await supabase.auth.admin.getUserById(conversation.customer_id)

  if (customerError) {
    console.error("Não foi possível pré-preencher o e-mail do cliente.", customerError.message)
  }

  let mercadoPagoPreference: {
    id: string
    checkoutUrl: string
    expiresAt: string
  }

  try {
    mercadoPagoPreference = await createMercadoPagoPreference({
      paymentPreferenceId: paymentPreference.id,
      conversationId: conversation.id,
      artworkId: conversation.artwork_id,
      artworkTitle: artwork.title,
      adminUserId: paymentPreference.created_by,
      amount: paymentPreference.amount_cents / 100,
      payerEmail: customer?.email,
      siteUrl: checkoutConfiguration.siteUrl,
      expiresAt: new Date(paymentPreference.expires_at),
    })
  } catch (error) {
    console.error("Não foi possível criar a preferência no Mercado Pago.", error)

    if (isDefinitiveMercadoPagoError(error)) {
      let failPreferenceQuery = supabase
        .from("payment_preferences")
        .update({
          status: "failed",
          creation_lease_token: null,
          creation_lease_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentPreference.id)
        .eq("status", "creating")

      if (creationLeaseToken) {
        failPreferenceQuery = failPreferenceQuery.eq(
          "creation_lease_token",
          creationLeaseToken,
        )
      }

      await failPreferenceQuery

      try {
        await loadAndProcessMercadoPagoArtworkSyncJobs(supabase, {
          conversationId: conversation.id,
        })
      } catch (releaseError) {
        console.error(
          "Não foi possível liberar a obra após a falha definitiva.",
          releaseError,
        )
      }
    }

    return errorResponse(
      error instanceof MercadoPagoConfigurationError
        ? "O Mercado Pago ainda não está configurado."
        : "O Mercado Pago não conseguiu gerar o link. Tente novamente.",
      error instanceof MercadoPagoConfigurationError ? 503 : 502,
    )
  }

  const activatedAt = new Date().toISOString()
  const activationValues = {
    provider_preference_id: mercadoPagoPreference.id,
    checkout_url: mercadoPagoPreference.checkoutUrl,
    status: "active",
    expires_at: mercadoPagoPreference.expiresAt,
    provider_expiration_configured_at: activatedAt,
    creation_lease_token: null,
    creation_lease_expires_at: null,
    updated_at: activatedAt,
  }
  let activationQuery = supabase
    .from("payment_preferences")
    .update(activationValues)
    .eq("id", paymentPreference.id)
    .eq("status", "creating")
    .gt("expires_at", new Date().toISOString())

  if (creationLeaseToken) {
    activationQuery = activationQuery.eq(
      "creation_lease_token",
      creationLeaseToken,
    )
  }

  const {data: activatedPreference, error: activateError} = await activationQuery
    .select(PAYMENT_PREFERENCE_SELECT)
    .maybeSingle()

  if (activateError) {
    console.error("Não foi possível salvar o link de pagamento.", activateError?.message)
    return errorResponse(
      "O link foi criado, mas não pôde ser salvo. Tente novamente para recuperá-lo.",
      500,
    )
  }

  if (activatedPreference) {
    paymentPreference = activatedPreference as PaymentPreferenceRow
  } else {
    const {data: currentPreference, error: currentPreferenceError} = await supabase
      .from("payment_preferences")
      .select(PAYMENT_PREFERENCE_SELECT)
      .eq("id", paymentPreference.id)
      .maybeSingle()

    if (
      currentPreferenceError ||
      !currentPreference ||
      !["active", "paid"].includes(currentPreference.status) ||
      (currentPreference.provider_preference_id &&
        currentPreference.provider_preference_id !== mercadoPagoPreference.id)
    ) {
      console.error("O link criado perdeu a posse da preferência local.", {
        preferenceId: paymentPreference.id,
        error: currentPreferenceError?.message,
      })
      return errorResponse(
        "O link foi criado, mas não pôde ser salvo. Tente novamente para recuperá-lo.",
        500,
      )
    }

    const {status: currentStatus} = currentPreference
    const {data: recoveredPreference, error: recoverError} = await supabase
      .from("payment_preferences")
      .update({...activationValues, status: currentStatus})
      .eq("id", paymentPreference.id)
      .eq("status", currentStatus)
      .select(PAYMENT_PREFERENCE_SELECT)
      .maybeSingle()

    if (recoverError || !recoveredPreference) {
      console.error("Não foi possível recuperar o link já criado.", recoverError?.message)
      return errorResponse(
        "O link foi criado, mas não pôde ser salvo. Tente novamente para recuperá-lo.",
        500,
      )
    }

    paymentPreference = recoveredPreference as PaymentPreferenceRow
  }

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
