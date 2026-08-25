import type {Metadata} from "next"
import {
  AlertCircle,
  ArrowLeft,
  Clock3,
  Inbox,
  MessageSquareText,
  MessagesSquare,
  Palette,
} from "lucide-react"
import Link from "next/link"
import {redirect} from "next/navigation"

import MessageComposer from "@/components/message/MessageComposer"
import Container from "@/components/ui/Container"
import {isAdmin} from "@/lib/auth"
import type {ConversationRow, MessageRow} from "@/lib/conversations"
import {sanityFetch} from "@/sanity/lib/live"
import {createClient} from "@/sanity/lib/supabase/server"
import {ARTWORKS_BY_IDS_QUERY} from "@/sanity/queries/artwork"

import {sendCustomerMessage} from "./actions"

export const metadata: Metadata = {
  title: "Minhas mensagens",
  description: "Acompanhe suas conversas com Carmem Silva.",
  robots: {
    index: false,
    follow: false,
  },
}

type MensagemPageProps = {
  searchParams: Promise<{
    conversa?: string | string[]
    erro?: string | string[]
  }>
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
      return "Escreva uma mensagem de até 3.000 caracteres."
    case "envio-falhou":
      return "Não foi possível enviar a mensagem. Tente novamente."
    case "conversa-invalida":
      return "Essa conversa não está disponível."
    default:
      return null
  }
}

export default async function MensagemPage({searchParams}: MensagemPageProps) {
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

  const query = await searchParams
  const requestedConversationId = Array.isArray(query.conversa)
    ? query.conversa[0]
    : query.conversa
  const errorCode = Array.isArray(query.erro) ? query.erro[0] : query.erro
  const feedbackMessage = getErrorMessage(errorCode)

  const {data: conversationData, error: conversationsError} = await supabase
    .from("conversations")
    .select("id,customer_id,artwork_id,status,created_at,updated_at")
    .eq("customer_id", user.id)
    .order("updated_at", {ascending: false})

  const conversations = (conversationData ?? []) as ConversationRow[]
  const activeConversation =
    conversations.find(({id}) => id === requestedConversationId) ??
    conversations[0] ??
    null

  const artworkIds = [...new Set(conversations.map(({artwork_id}) => artwork_id))]
  const artworksResult = artworkIds.length
    ? await sanityFetch({
        query: ARTWORKS_BY_IDS_QUERY,
        params: {ids: artworkIds},
        stega: false,
      })
    : {data: []}
  const artworksById = new Map(
    artworksResult.data.map((artwork) => [artwork.id, artwork]),
  )

  let messages: MessageRow[] = []
  let messagesFailed = false

  if (activeConversation) {
    const {data, error} = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,content,created_at,read_at")
      .eq("conversation_id", activeConversation.id)
      .order("created_at", {ascending: true})

    messages = (data ?? []) as MessageRow[]
    messagesFailed = Boolean(error)
  }

  const nome =
    typeof user.user_metadata.nome === "string"
      ? user.user_metadata.nome.trim()
      : ""
  const primeiroNome = nome.split(/\s+/)[0]
  const activeArtwork = activeConversation
    ? artworksById.get(activeConversation.artwork_id)
    : null

  return (
    <div className="overflow-hidden py-8 sm:py-12 lg:py-16">
      <Container>
        <section className="mx-auto max-w-6xl overflow-hidden rounded-4xl bg-white shadow-[0_24px_70px_rgba(82,20,38,0.18)]">
          <header className="relative overflow-hidden bg-red px-6 py-9 text-white sm:px-10 sm:py-12">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-24 size-64 rounded-full border-[2rem] border-red-secondary/15"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-20 left-1/2 size-48 rounded-full bg-orange/20 blur-2xl"
            />

            <div className="relative">
              <Link
                href="/conta"
                className="inline-flex items-center gap-2 text-sm font-semibold text-red-secondary transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-secondary"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Voltar para minha conta
              </Link>

              <div className="mt-9 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-secondary">
                    Atendimento reservado
                  </p>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                    Minhas mensagens
                  </h1>
                  <p className="mt-4 max-w-2xl leading-relaxed text-red-secondary">
                    Converse diretamente com Carmem sobre as obras que despertaram
                    seu interesse.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                  <MessageSquareText className="size-4" aria-hidden="true" />
                  {primeiroNome ? `Olá, ${primeiroNome}` : "Área do cliente"}
                </span>
              </div>
            </div>
          </header>

          {feedbackMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 border-b border-red/15 bg-red-secondary/45 px-6 py-4 text-sm font-medium text-red-hover"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {feedbackMessage}
            </div>
          )}

          <div className="grid min-h-[34rem] md:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.28fr)]">
            <aside className="border-b border-red/10 bg-white md:border-b-0 md:border-r">
              <div className="flex items-end justify-between gap-4 border-b border-red/10 px-5 py-5 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-hover">
                    Caixa de entrada
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-red">Conversas</h2>
                </div>
                <span
                  aria-label={`${conversations.length} ${conversations.length === 1 ? "conversa" : "conversas"}`}
                  className="inline-flex size-8 items-center justify-center rounded-full bg-green-secondary text-xs font-semibold text-green-hover"
                >
                  {conversations.length}
                </span>
              </div>

              {conversationsError ? (
                <div className="px-5 py-10 text-center text-sm text-red-hover">
                  Não foi possível carregar suas conversas.
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-12 text-center">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-green-secondary text-green-hover">
                    <Inbox className="size-5" strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-semibold text-red">Nenhuma conversa</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-black/60">
                    Escolha uma obra à venda e clique em “Tenho interesse”.
                  </p>
                  <Link
                    href="/venda"
                    className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red px-4 text-sm font-semibold text-white transition-colors hover:bg-red-hover"
                  >
                    <Palette className="size-4" aria-hidden="true" />
                    Conhecer obras
                  </Link>
                </div>
              ) : (
                <nav aria-label="Suas conversas" className="divide-y divide-red/10">
                  {conversations.map((conversation) => {
                    const artwork = artworksById.get(conversation.artwork_id)
                    const isActive = conversation.id === activeConversation?.id

                    return (
                      <Link
                        key={conversation.id}
                        href={`/mensagem?conversa=${encodeURIComponent(conversation.id)}`}
                        aria-current={isActive ? "page" : undefined}
                        className={`block px-5 py-5 transition-colors sm:px-6 ${
                          isActive
                            ? "bg-green-secondary/65"
                            : "hover:bg-green-secondary/25"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-red">
                              {artwork?.title ?? "Obra do acervo"}
                            </p>
                            <p className="mt-1 text-xs text-black/50">
                              {formatDate(conversation.updated_at)}
                            </p>
                          </div>
                          <span
                            className={`mt-1 size-2 shrink-0 rounded-full ${
                              conversation.status === "open" ? "bg-orange" : "bg-black/25"
                            }`}
                            aria-label={conversation.status === "open" ? "Aberta" : "Encerrada"}
                          />
                        </div>
                      </Link>
                    )
                  })}
                </nav>
              )}
            </aside>

            {activeConversation ? (
              <div className="flex min-h-[34rem] flex-col bg-green-secondary/20">
                <div className="border-b border-red/10 bg-white/85 px-5 py-5 sm:px-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange">
                    Interesse em uma obra
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-2xl font-semibold text-red">
                      {activeArtwork?.title ?? "Obra do acervo"}
                    </h2>
                    {activeArtwork?.catalogNumber && (
                      <span className="text-xs uppercase tracking-[0.14em] text-red/45">
                        Cat. {activeArtwork.catalogNumber}
                      </span>
                    )}
                  </div>
                  {(activeArtwork?.technique || activeArtwork?.year) && (
                    <p className="mt-1 text-sm text-black/55">
                      {[activeArtwork.technique, activeArtwork.year]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>

                <div
                  className="flex flex-1 flex-col justify-end gap-3 overflow-y-auto px-5 py-6 sm:px-7"
                  aria-live="polite"
                >
                  {messagesFailed ? (
                    <p className="m-auto text-center text-sm text-red-hover">
                      Não foi possível carregar as mensagens desta conversa.
                    </p>
                  ) : messages.length === 0 ? (
                    <div className="m-auto max-w-md text-center">
                      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-red text-white">
                        <MessagesSquare className="size-6" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-xl font-semibold text-red">
                        Conte o que gostaria de saber
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-black/60">
                        Pergunte sobre valor, dimensões, disponibilidade ou entrega.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isCustomer = message.sender_id === user.id

                      return (
                        <article
                          key={message.id}
                          className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[78%] ${
                            isCustomer
                              ? "ml-auto rounded-br-md bg-red text-white"
                              : "mr-auto rounded-bl-md bg-white text-black"
                          }`}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </p>
                          <p
                            className={`mt-2 text-[0.68rem] ${
                              isCustomer ? "text-red-secondary" : "text-black/45"
                            }`}
                          >
                            {isCustomer ? "Você" : "Carmem"} · {formatDate(message.created_at)}
                          </p>
                        </article>
                      )
                    })
                  )}
                </div>

                <MessageComposer
                  action={sendCustomerMessage}
                  conversationId={activeConversation.id}
                  placeholder={`Escreva para Carmem sobre ${activeArtwork?.title ?? "esta obra"}...`}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center bg-green-secondary/30 px-6 py-12 text-center sm:px-10">
                <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-red text-white shadow-sm">
                  <MessagesSquare className="size-7" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-green-hover">
                  Canal de atendimento
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-red sm:text-3xl">
                  Sua conversa começa na obra
                </h2>
                <p className="mt-3 max-w-lg leading-relaxed text-black/65">
                  Ao clicar em “Tenho interesse”, uma conversa reservada sobre a
                  peça será aberta aqui.
                </p>
                <div className="mt-8 flex max-w-lg items-start gap-3 rounded-2xl bg-white/70 px-4 py-3 text-left text-sm text-black/60">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-green-hover" aria-hidden="true" />
                  <p>O atendimento acontece de segunda a sexta, em horário comercial.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </Container>
    </div>
  )
}
