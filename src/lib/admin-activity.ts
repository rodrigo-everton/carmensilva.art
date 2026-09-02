import "server-only"

import { requireAdmin } from "@/lib/auth"
import { loadCustomerNames } from "@/lib/customer-names"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { sanityFetch } from "@/sanity/lib/live"
import { ADMIN_ACTIVITY_ARTWORKS_QUERY } from "@/sanity/queries/artwork"
import type { ADMIN_ACTIVITY_ARTWORKS_QUERY_RESULT } from "@/sanity/types.generated"

export const ADMIN_RECENT_ACTIVITY_LIMIT = 8
const MESSAGE_PAGE_SIZE = 50
const MAX_MESSAGE_PAGES = 3

type MessageConversationRow = {
  customer_id: string
  artwork_id: string
}

type MessageQueryRow = {
  id: string
  conversation_id: string
  sender_id: string
  created_at: string
  conversation:
    | MessageConversationRow
    | MessageConversationRow[]
    | null
}

type CustomerMessageRow = Omit<MessageQueryRow, "conversation"> & {
  conversation: MessageConversationRow
}

type SaleRow = {
  id: string
  conversation_id: string | null
  artwork_id: string
  customer_id: string
  negotiated_price: number | string
  currency: string
  created_at: string
  updated_at: string
}

type CustomerProfileRow = {
  id: string
  created_at: string
  user_roles: { role: string } | { role: string }[] | null
}

export type AdminActivityWarning =
  | "messages"
  | "sales"
  | "customers"
  | "artworks"

type AdminActivityBase = {
  id: string
  occurredAt: string
  customerName: string | null
  href: string
}

export type AdminMessageActivity = AdminActivityBase & {
  kind: "message"
  artworkTitle: string | null
}

export type AdminSaleActivity = AdminActivityBase & {
  kind: "sale"
  artworkTitle: string | null
  amount: number | null
  currency: string | null
  isNew: boolean
}

export type AdminCustomerActivity = AdminActivityBase & {
  kind: "customer"
}

export type AdminActivity =
  | AdminMessageActivity
  | AdminSaleActivity
  | AdminCustomerActivity

export type AdminRecentActivityResult = {
  activities: AdminActivity[]
  warnings: AdminActivityWarning[]
}

function singleRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

function finitePositiveNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)

  return Number.isFinite(number) && number > 0 ? number : null
}

function normalizedCurrency(value: unknown) {
  const currency = typeof value === "string" ? value.trim().toUpperCase() : ""

  return /^[A-Z]{3}$/.test(currency) ? currency : null
}

function timestamp(value: string) {
  const parsed = Date.parse(value)

  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function addWarning(
  warnings: AdminActivityWarning[],
  warning: AdminActivityWarning,
) {
  if (!warnings.includes(warning)) {
    warnings.push(warning)
  }
}

function logSourceError(source: AdminActivityWarning, reason: unknown) {
  console.error(
    `Não foi possível carregar ${source} para a atividade recente.`,
    reason instanceof Error ? reason.message : reason,
  )
}

async function listRecentCustomerMessages() {
  const supabase = createSupabaseAdminClient()
  const messages: CustomerMessageRow[] = []
  const includedConversationIds = new Set<string>()
  let from = 0
  let pagesRead = 0
  let lastPageWasFull = false

  while (
    messages.length < ADMIN_RECENT_ACTIVITY_LIMIT &&
    pagesRead < MAX_MESSAGE_PAGES
  ) {
    const { data, error } = await supabase
      .from("messages")
      .select(
        "id,conversation_id,sender_id,created_at,conversation:conversations!inner(customer_id,artwork_id)",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + MESSAGE_PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Não foi possível consultar as mensagens: ${error.message}`)
    }

    const pageRows = (data ?? []) as unknown as MessageQueryRow[]

    pagesRead += 1
    lastPageWasFull = pageRows.length === MESSAGE_PAGE_SIZE

    for (const row of pageRows) {
      const conversation = singleRelation(row.conversation)

      if (
        !conversation ||
        row.sender_id !== conversation.customer_id ||
        includedConversationIds.has(row.conversation_id)
      ) {
        continue
      }

      messages.push({ ...row, conversation })
      includedConversationIds.add(row.conversation_id)

      if (messages.length === ADMIN_RECENT_ACTIVITY_LIMIT) {
        break
      }
    }

    from += pageRows.length

    if (pageRows.length < MESSAGE_PAGE_SIZE) {
      break
    }
  }

  return {
    messages,
    truncated:
      messages.length < ADMIN_RECENT_ACTIVITY_LIMIT &&
      pagesRead === MAX_MESSAGE_PAGES &&
      lastPageWasFull,
  }
}

async function listRecentSales() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id,conversation_id,artwork_id,customer_id,negotiated_price,currency,created_at,updated_at",
    )
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(ADMIN_RECENT_ACTIVITY_LIMIT)

  if (error) {
    throw new Error(`Não foi possível consultar as vendas: ${error.message}`)
  }

  return (data ?? []) as SaleRow[]
}

async function listRecentCustomers() {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id,created_at,user_roles!inner(role)")
    .eq("user_roles.role", "customer")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(ADMIN_RECENT_ACTIVITY_LIMIT)

  if (error) {
    throw new Error(`Não foi possível consultar os clientes: ${error.message}`)
  }

  return (data ?? []) as unknown as CustomerProfileRow[]
}

export async function loadAdminRecentActivity(): Promise<AdminRecentActivityResult> {
  await requireAdmin()

  const [messagesResult, salesResult, customersResult] =
    await Promise.allSettled([
      listRecentCustomerMessages(),
      listRecentSales(),
      listRecentCustomers(),
    ])

  const warnings: AdminActivityWarning[] = []

  if (messagesResult.status === "rejected") {
    addWarning(warnings, "messages")
    logSourceError("messages", messagesResult.reason)
  }

  if (salesResult.status === "rejected") {
    addWarning(warnings, "sales")
    logSourceError("sales", salesResult.reason)
  }

  if (customersResult.status === "rejected") {
    addWarning(warnings, "customers")
    logSourceError("customers", customersResult.reason)
  }

  if (
    messagesResult.status === "rejected" &&
    salesResult.status === "rejected" &&
    customersResult.status === "rejected"
  ) {
    throw new Error("Nenhuma fonte de atividade recente está disponível.")
  }

  const messages =
    messagesResult.status === "fulfilled" ? messagesResult.value.messages : []

  if (
    messagesResult.status === "fulfilled" &&
    messagesResult.value.truncated
  ) {
    addWarning(warnings, "messages")
  }
  const sales = salesResult.status === "fulfilled" ? salesResult.value : []
  const customers =
    customersResult.status === "fulfilled" ? customersResult.value : []
  const customerIds = [
    ...new Set([
      ...messages.map(({ conversation }) => conversation.customer_id),
      ...sales.map(({ customer_id }) => customer_id),
      ...customers.map(({ id }) => id),
    ]),
  ]
  const artworkIds = [
    ...new Set([
      ...messages.map(({ conversation }) => conversation.artwork_id),
      ...sales.map(({ artwork_id }) => artwork_id),
    ]),
  ]

  const [customerNamesResult, artworksResult] = await Promise.allSettled([
    loadCustomerNames(customerIds),
    artworkIds.length > 0
      ? sanityFetch({
          query: ADMIN_ACTIVITY_ARTWORKS_QUERY,
          params: { ids: artworkIds },
          perspective: "published",
          stega: false,
        }).then(({ data }) => data)
      : Promise.resolve([] as ADMIN_ACTIVITY_ARTWORKS_QUERY_RESULT),
  ])

  if (customerNamesResult.status === "rejected") {
    addWarning(warnings, "customers")
    logSourceError("customers", customerNamesResult.reason)
  }

  if (artworksResult.status === "rejected") {
    addWarning(warnings, "artworks")
    logSourceError("artworks", artworksResult.reason)
  }

  const customerNames =
    customerNamesResult.status === "fulfilled"
      ? customerNamesResult.value
      : new Map<string, string>()
  const artworks: ADMIN_ACTIVITY_ARTWORKS_QUERY_RESULT =
    artworksResult.status === "fulfilled" ? artworksResult.value : []
  const artworksById = new Map(artworks.map((artwork) => [artwork.id, artwork]))
  const activities: AdminActivity[] = [
    ...messages.map(
      (message): AdminMessageActivity => ({
        id: `message:${message.id}`,
        kind: "message",
        occurredAt: message.created_at,
        customerName:
          customerNames.get(message.conversation.customer_id) ?? null,
        artworkTitle:
          artworksById.get(message.conversation.artwork_id)?.title?.trim() ||
          null,
        href: `/admin/mensagem?conversa=${encodeURIComponent(message.conversation_id)}`,
      }),
    ),
    ...sales.map(
      (sale): AdminSaleActivity => ({
        id: `sale:${sale.id}`,
        kind: "sale",
        occurredAt: sale.updated_at,
        customerName: customerNames.get(sale.customer_id) ?? null,
        artworkTitle:
          artworksById.get(sale.artwork_id)?.title?.trim() || null,
        href: "/admin/venda",
        amount: finitePositiveNumber(sale.negotiated_price),
        currency: normalizedCurrency(sale.currency),
        isNew: sale.created_at === sale.updated_at,
      }),
    ),
    ...customers.map(
      (customer): AdminCustomerActivity => ({
        id: `customer:${customer.id}`,
        kind: "customer",
        occurredAt: customer.created_at,
        customerName: customerNames.get(customer.id) ?? null,
        href: "/admin/cliente",
      }),
    ),
  ]

  activities.sort(
    (left, right) =>
      timestamp(right.occurredAt) - timestamp(left.occurredAt) ||
      left.id.localeCompare(right.id),
  )

  return {
    activities: activities.slice(0, ADMIN_RECENT_ACTIVITY_LIMIT),
    warnings,
  }
}
