import type {Metadata} from "next"
import {
  AlertCircle,
  Inbox,
  MessageSquareText,
  MessagesSquare,
  UserRound,
} from "lucide-react"
import Link from "next/link"

import {AdminPageHeader} from "@/components/admin/AdminPage"
import MessageComposer from "@/components/message/MessageComposer"
import GeneratePaymentButton from "@/components/payment/GeneratePaymentButton"
import PaymentMessageCard from "@/components/payment/PaymentMessageCard"
import {requireAdmin} from "@/lib/auth"
import {
  loadConversationMessages,
  type ConversationMessageRow,
  type ConversationRow,
} from "@/lib/conversations"
import {sanityFetch} from "@/sanity/lib/live"
import {createClient} from "@/sanity/lib/supabase/server"
import {ARTWORKS_BY_IDS_QUERY} from "@/sanity/queries/artwork"

import {sendAdminMessage} from "./actions"

export const metadata: Metadata = {
  title: "Mensagens",
}

type AdminMensagemPageProps = {
  searchParams: Promise<{
    conversa?: string | string[]
    erro?: string | string[]
  }>
}

type CustomerProfile = {
  id: string
  full_name: string | null
}

type PaymentPreferenceRow = {
  id: string
  amount_cents: number | string
  currency: string
  status: string
  checkout_url: string | null
  expires_at: string | null
}

type PaymentPreferenceView = {
  id: string
  amountCents: number
  currency: string
  status: string
  checkoutUrl: string | null
  expiresAt: string | null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value))
}

function getErrorMessage(errorCode: string | undefined) {
  switch (errorCode) {
    case "mensagem-invalida":
      return "Escreva uma resposta de até 3.000 caracteres."
    case "envio-falhou":
      return "Não foi possível enviar a resposta. Tente novamente."
    case "conversa-invalida":
      return "Essa conversa não está disponível."
    default:
      return null
  }
}

function normalizePaymentPreference(
  value: PaymentPreferenceRow | PaymentPreferenceRow[] | null | undefined,
): PaymentPreferenceView | null {
  const preference = Array.isArray(value) ? value[0] : value

  if (!preference) {
    return null
  }

  const amountCents = Number(preference.amount_cents)

  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return null
  }

  const expirationTimestamp = preference.expires_at
    ? Date.parse(preference.expires_at)
    : Number.NaN
  const expiredByTime =
    ["creating", "active", "pending"].includes(preference.status) &&
    Number.isFinite(expirationTimestamp) &&
    expirationTimestamp <= Date.now()

  return {
    id: preference.id,
    amountCents,
    currency: preference.currency,
    status: expiredByTime ? "expired" : preference.status,
    checkoutUrl: expiredByTime ? null : preference.checkout_url,
    expiresAt: preference.expires_at,
  }
}

export default async function AdminMensagemPage({
  searchParams,
}: AdminMensagemPageProps) {
  await requireAdmin()
  const supabase = await createClient()
  const query = await searchParams
  const requestedConversationId = Array.isArray(query.conversa)
    ? query.conversa[0]
    : query.conversa
  const errorCode = Array.isArray(query.erro) ? query.erro[0] : query.erro
  const feedbackMessage = getErrorMessage(errorCode)

  const {data: conversationData, error: conversationsError} = await supabase
    .from("conversations")
    .select("id,customer_id,artwork_id,status,created_at,updated_at")
    .order("updated_at", {ascending: false})

  const conversations = (conversationData ?? []) as ConversationRow[]
  const activeConversation =
    conversations.find(({id}) => id === requestedConversationId) ??
    conversations[0] ??
    null

  const customerIds = [...new Set(conversations.map(({customer_id}) => customer_id))]
  const artworkIds = [...new Set(conversations.map(({artwork_id}) => artwork_id))]

  const [{data: profileData}, artworksResult] = await Promise.all([
    customerIds.length
      ? supabase.from("profiles").select("id,full_name").in("id", customerIds)
      : Promise.resolve({data: []}),
    artworkIds.length
      ? sanityFetch({
          query: ARTWORKS_BY_IDS_QUERY,
          params: {ids: artworkIds},
          stega: false,
        })
      : Promise.resolve({data: []}),
  ])

  const profilesById = new Map(
    ((profileData ?? []) as CustomerProfile[]).map((profile) => [
      profile.id,
      profile,
    ]),
  )
  const artworksById = new Map(
    artworksResult.data.map((artwork) => [artwork.id, artwork]),
  )

  let messages: ConversationMessageRow[] = []
  let messagesFailed = false
  let activePaymentPreference: PaymentPreferenceView | null = null
  let paymentPreferenceLookupFailed = false

  if (activeConversation) {
    const [messagesResult, paymentPreferenceResult] = await Promise.all([
      loadConversationMessages(activeConversation.id),
      supabase
        .from("payment_preferences")
        .select("id,amount_cents,currency,status,checkout_url,expires_at")
        .eq("conversation_id", activeConversation.id)
        .in("status", ["creating", "active"])
        .order("created_at", {ascending: false})
        .limit(1)
        .maybeSingle(),
    ])

    messages = messagesResult.data
    messagesFailed = Boolean(messagesResult.error)
    activePaymentPreference = normalizePaymentPreference(
      paymentPreferenceResult.data as PaymentPreferenceRow | null,
    )
    if (activePaymentPreference?.status === "expired") {
      activePaymentPreference = null
    }
    paymentPreferenceLookupFailed = Boolean(paymentPreferenceResult.error)
  }

  const activeArtwork = activeConversation
    ? artworksById.get(activeConversation.artwork_id)
    : null
  const activeCustomer = activeConversation
    ? profilesById.get(activeConversation.customer_id)
    : null

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Atendimento"
        title="Mensagens"
        description="Converse com clientes interessados em cada obra do acervo."
        icon={MessageSquareText}
      />

      {feedbackMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red/15 bg-red-secondary/55 px-4 py-3 text-sm font-medium text-red-hover"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {feedbackMessage}
        </div>
      )}

      <section
        aria-labelledby="mensagens-heading"
        className="grid min-h-[34rem] overflow-hidden rounded-2xl border border-red/10 bg-white shadow-sm md:grid-cols-[minmax(15rem,0.75fr)_minmax(0,1.25fr)]"
      >
        <aside className="border-b border-red/10 md:border-b-0 md:border-r">
          <div className="flex items-end justify-between gap-4 border-b border-red/10 px-5 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-hover">
                Caixa de entrada
              </p>
              <h2 id="mensagens-heading" className="mt-1 text-2xl font-semibold text-red">
                Conversas
              </h2>
            </div>
            <span
              aria-label={`${conversations.length} ${conversations.length === 1 ? "conversa" : "conversas"}`}
              className="inline-flex size-8 items-center justify-center rounded-full bg-green-secondary text-xs font-semibold text-green-hover"
            >
              {conversations.length}
            </span>
          </div>

          {conversationsError ? (
            <p className="px-5 py-10 text-center text-sm text-red-hover">
              Não foi possível carregar as conversas.
            </p>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-green-secondary text-green-hover">
                <Inbox className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold text-red">Nenhuma conversa</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-black/60">
                Os interesses enviados pelas páginas das obras aparecerão aqui.
              </p>
            </div>
          ) : (
            <nav aria-label="Conversas com clientes" className="divide-y divide-red/10">
              {conversations.map((conversation) => {
                const customer = profilesById.get(conversation.customer_id)
                const artwork = artworksById.get(conversation.artwork_id)
                const isActive = conversation.id === activeConversation?.id

                return (
                  <Link
                    key={conversation.id}
                    href={`/admin/mensagem?conversa=${encodeURIComponent(conversation.id)}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`block px-5 py-5 transition-colors ${
                      isActive ? "bg-green-secondary/60" : "hover:bg-green-secondary/20"
                    }`}
                  >
                    <p className="truncate font-semibold text-red">
                      {customer?.full_name ?? "Cliente"}
                    </p>
                    <p className="mt-1 truncate text-sm text-black/60">
                      {artwork?.title ?? "Obra do acervo"}
                    </p>
                    <p className="mt-1 text-xs text-black/40">
                      {formatDate(conversation.updated_at)}
                    </p>
                  </Link>
                )
              })}
            </nav>
          )}
        </aside>

        {activeConversation ? (
          <div className="flex min-h-[34rem] flex-col bg-green-secondary/15">
            <header className="border-b border-red/10 bg-white/90 px-5 py-5 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange">
                    {activeArtwork?.title ?? "Obra do acervo"}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-red">
                    {activeCustomer?.full_name ?? "Cliente"}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <GeneratePaymentButton
                    conversationId={activeConversation.id}
                    existingPreference={activePaymentPreference}
                    lookupFailed={paymentPreferenceLookupFailed}
                  />
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-secondary px-3 py-1.5 text-xs font-semibold text-green-hover">
                    <UserRound className="size-3.5" aria-hidden="true" />
                    {activeConversation.status === "open" ? "Conversa aberta" : "Conversa encerrada"}
                  </span>
                </div>
              </div>
            </header>

            <div
              className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto px-5 py-6 sm:px-7"
              aria-live="polite"
            >
              {messagesFailed ? (
                <p className="m-auto text-center text-sm text-red-hover">
                  Não foi possível carregar as mensagens desta conversa.
                </p>
              ) : messages.length === 0 ? (
                <div className="m-auto text-center">
                  <MessagesSquare className="mx-auto size-8 text-red/45" aria-hidden="true" />
                  <p className="mt-3 text-sm text-black/55">Ainda não há mensagens.</p>
                </div>
              ) : (
                messages.map((message) => {
                  const paymentPreference = normalizePaymentPreference(
                    message.paymentPreference,
                  )
                  const isArtist =
                    message.sender_id !== activeConversation.customer_id

                  if (paymentPreference) {
                    return (
                      <PaymentMessageCard
                        key={message.id}
                        variant="admin"
                        preference={paymentPreference}
                        timestamp={formatDate(message.created_at)}
                      />
                    )
                  }

                  return (
                    <article
                      key={message.id}
                      className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[78%] ${
                        isArtist
                          ? "ml-auto rounded-br-md bg-red text-white"
                          : "mr-auto rounded-bl-md bg-white text-black"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                      <p
                        className={`mt-2 text-[0.68rem] ${
                          isArtist ? "text-red-secondary" : "text-black/45"
                        }`}
                      >
                        {isArtist ? "Você" : activeCustomer?.full_name ?? "Cliente"} ·{" "}
                        {formatDate(message.created_at)}
                      </p>
                    </article>
                  )
                })
              )}
            </div>

            <MessageComposer
              action={sendAdminMessage}
              conversationId={activeConversation.id}
              placeholder={`Responder a ${activeCustomer?.full_name ?? "cliente"}...`}
            />
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center bg-green-secondary/20 px-6 text-center">
            <MessagesSquare className="size-9 text-red/40" aria-hidden="true" />
            <h3 className="mt-4 text-xl font-semibold text-red">
              Visualização da conversa
            </h3>
            <p className="mt-2 max-w-sm text-sm text-black/55">
              Selecione uma conversa na caixa de entrada para ler e responder.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
