import "server-only"

import type { SupabaseClient, User } from "@supabase/supabase-js"

import { requireAdmin } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"

const SUPABASE_PAGE_SIZE = 1000
const ID_BATCH_SIZE = 100
const COMPLETED_SALE_STATUSES = new Set([
  "paid",
  "preparing_delivery",
  "shipped",
  "delivered",
  "completed",
])

type ProfileRow = {
  id: string
  full_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

type SaleRow = {
  id: string
  customer_id: string
  sale_status: string
  created_at: string
  updated_at: string
}

type ConversationRow = {
  id: string
  customer_id: string
  created_at: string
  updated_at: string
}

type MessageRow = {
  id: string
  conversation_id: string
  created_at: string
}

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
  count: number | null
}

export type AdminCustomerWarning =
  | "profiles"
  | "sales"
  | "conversations"
  | "messages"

export type AdminCustomer = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  emailConfirmed: boolean
  registeredAt: string
  salesCount: number | null
  lastActivityAt: string | null
}

export type AdminCustomersResult = {
  customers: AdminCustomer[]
  warnings: AdminCustomerWarning[]
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null
}

function splitIntoBatches<T>(values: T[], batchSize: number) {
  const batches: T[][] = []

  for (let index = 0; index < values.length; index += batchSize) {
    batches.push(values.slice(index, index + batchSize))
  }

  return batches
}

async function collectPages<T>(
  loadPage: (from: number, to: number) => Promise<PageResult<T>>,
  errorMessage: string,
) {
  const rows: T[] = []
  let from = 0

  while (true) {
    const { data, error, count } = await loadPage(
      from,
      from + SUPABASE_PAGE_SIZE - 1,
    )

    if (error) {
      throw new Error(`${errorMessage}: ${error.message}`)
    }

    const pageRows = data ?? []

    rows.push(...pageRows)
    from += pageRows.length

    if (
      pageRows.length === 0 ||
      (count !== null && from >= count) ||
      (count === null && pageRows.length < SUPABASE_PAGE_SIZE)
    ) {
      break
    }
  }

  return rows
}

async function listCustomerIds(supabase: SupabaseClient) {
  const roles = await collectPages<{ user_id: string }>(
    async (from, to) => {
      const { data, error, count } = await supabase
        .from("user_roles")
        .select("user_id", { count: "exact" })
        .eq("role", "customer")
        .order("user_id", { ascending: true })
        .range(from, to)

      return { data, error, count }
    },
    "Não foi possível consultar os papéis dos clientes",
  )

  return [...new Set(roles.map(({ user_id }) => user_id).filter(Boolean))]
}

async function listAllAuthUsers(supabase: SupabaseClient) {
  const users: User[] = []

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: SUPABASE_PAGE_SIZE,
    })

    if (error) {
      throw new Error(`Não foi possível consultar os usuários: ${error.message}`)
    }

    users.push(...data.users)

    if (
      data.users.length === 0 ||
      (data.total > 0 && users.length >= data.total) ||
      (data.total === 0 && data.users.length < SUPABASE_PAGE_SIZE)
    ) {
      break
    }
  }

  return users
}

async function listProfiles(supabase: SupabaseClient, customerIds: string[]) {
  const pages = await Promise.all(
    splitIntoBatches(customerIds, ID_BATCH_SIZE).map((customerIdBatch) =>
      collectPages<ProfileRow>(
        async (from, to) => {
          const { data, error, count } = await supabase
            .from("profiles")
            .select("id,full_name,phone,created_at,updated_at", {
              count: "exact",
            })
            .in("id", customerIdBatch)
            .order("id", { ascending: true })
            .range(from, to)

          return { data: data as ProfileRow[] | null, error, count }
        },
        "Não foi possível consultar os perfis dos clientes",
      ),
    ),
  )

  return pages.flat()
}

async function listSales(supabase: SupabaseClient, customerIds: string[]) {
  const pages = await Promise.all(
    splitIntoBatches(customerIds, ID_BATCH_SIZE).map((customerIdBatch) =>
      collectPages<SaleRow>(
        async (from, to) => {
          const { data, error, count } = await supabase
            .from("sales")
            .select("id,customer_id,sale_status,created_at,updated_at", {
              count: "exact",
            })
            .in("customer_id", customerIdBatch)
            .order("id", { ascending: true })
            .range(from, to)

          return { data: data as SaleRow[] | null, error, count }
        },
        "Não foi possível consultar as vendas dos clientes",
      ),
    ),
  )

  return pages.flat()
}

async function listConversations(
  supabase: SupabaseClient,
  customerIds: string[],
) {
  const pages = await Promise.all(
    splitIntoBatches(customerIds, ID_BATCH_SIZE).map((customerIdBatch) =>
      collectPages<ConversationRow>(
        async (from, to) => {
          const { data, error, count } = await supabase
            .from("conversations")
            .select("id,customer_id,created_at,updated_at", { count: "exact" })
            .in("customer_id", customerIdBatch)
            .order("id", { ascending: true })
            .range(from, to)

          return { data: data as ConversationRow[] | null, error, count }
        },
        "Não foi possível consultar as conversas dos clientes",
      ),
    ),
  )

  return pages.flat()
}

async function listMessages(
  supabase: SupabaseClient,
  conversationIds: string[],
) {
  if (conversationIds.length === 0) {
    return []
  }

  const pages = await Promise.all(
    splitIntoBatches(conversationIds, ID_BATCH_SIZE).map(
      (conversationIdBatch) =>
        collectPages<MessageRow>(
          async (from, to) => {
            const { data, error, count } = await supabase
              .from("messages")
              .select("id,conversation_id,created_at", { count: "exact" })
              .in("conversation_id", conversationIdBatch)
              .order("id", { ascending: true })
              .range(from, to)

            return { data: data as MessageRow[] | null, error, count }
          },
          "Não foi possível consultar as mensagens dos clientes",
        ),
    ),
  )

  return pages.flat()
}

function latestDate(...values: (string | null | undefined)[]) {
  let latestValue: string | null = null
  let latestTimestamp = Number.NEGATIVE_INFINITY

  for (const value of values) {
    if (!value) {
      continue
    }

    const timestamp = Date.parse(value)

    if (Number.isFinite(timestamp) && timestamp > latestTimestamp) {
      latestValue = value
      latestTimestamp = timestamp
    }
  }

  return latestValue
}

function updateLatestActivity(
  activityByCustomerId: Map<string, string>,
  customerId: string,
  ...values: (string | null | undefined)[]
) {
  const latest = latestDate(activityByCustomerId.get(customerId), ...values)

  if (latest) {
    activityByCustomerId.set(customerId, latest)
  }
}

function logEnrichmentError(source: AdminCustomerWarning, reason: unknown) {
  console.error(
    `Não foi possível carregar dados de ${source} dos clientes.`,
    reason instanceof Error ? reason.message : reason,
  )
}

export async function loadAdminCustomers(): Promise<AdminCustomersResult> {
  await requireAdmin()

  const supabase = createSupabaseAdminClient()
  const customerIds = await listCustomerIds(supabase)

  if (customerIds.length === 0) {
    return { customers: [], warnings: [] }
  }

  const users = await listAllAuthUsers(supabase)
  const customerIdSet = new Set(customerIds)
  const customerUsers = users.filter(({ id }) => customerIdSet.has(id))

  if (customerUsers.length !== customerIds.length) {
    throw new Error(
      "A relação de clientes contém usuários que não foram encontrados na autenticação.",
    )
  }

  const [profilesResult, salesResult, conversationsResult] =
    await Promise.allSettled([
      listProfiles(supabase, customerIds),
      listSales(supabase, customerIds),
      listConversations(supabase, customerIds),
    ])

  const [messagesResult] =
    conversationsResult.status === "fulfilled"
      ? await Promise.allSettled([
          listMessages(
            supabase,
            conversationsResult.value.map(({ id }) => id),
          ),
        ])
      : ([{ status: "fulfilled", value: [] }] as const)

  const warnings: AdminCustomerWarning[] = []

  if (profilesResult.status === "rejected") {
    warnings.push("profiles")
    logEnrichmentError("profiles", profilesResult.reason)
  }

  if (salesResult.status === "rejected") {
    warnings.push("sales")
    logEnrichmentError("sales", salesResult.reason)
  }

  if (conversationsResult.status === "rejected") {
    warnings.push("conversations")
    logEnrichmentError("conversations", conversationsResult.reason)
  }

  if (messagesResult.status === "rejected") {
    warnings.push("messages")
    logEnrichmentError("messages", messagesResult.reason)
  }

  const profiles =
    profilesResult.status === "fulfilled" ? profilesResult.value : []
  const sales = salesResult.status === "fulfilled" ? salesResult.value : []
  const conversations =
    conversationsResult.status === "fulfilled" ? conversationsResult.value : []
  const messages =
    messagesResult.status === "fulfilled" ? messagesResult.value : []
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const customerIdByConversationId = new Map(
    conversations.map((conversation) => [
      conversation.id,
      conversation.customer_id,
    ]),
  )
  const salesCountByCustomerId = new Map<string, number>()
  const activityByCustomerId = new Map<string, string>()

  for (const sale of sales) {
    if (COMPLETED_SALE_STATUSES.has(sale.sale_status)) {
      salesCountByCustomerId.set(
        sale.customer_id,
        (salesCountByCustomerId.get(sale.customer_id) ?? 0) + 1,
      )
    }

    updateLatestActivity(
      activityByCustomerId,
      sale.customer_id,
      sale.created_at,
      sale.updated_at,
    )
  }

  for (const conversation of conversations) {
    updateLatestActivity(
      activityByCustomerId,
      conversation.customer_id,
      conversation.created_at,
      conversation.updated_at,
    )
  }

  for (const message of messages) {
    const customerId = customerIdByConversationId.get(message.conversation_id)

    if (customerId) {
      updateLatestActivity(
        activityByCustomerId,
        customerId,
        message.created_at,
      )
    }
  }

  const customers = customerUsers.map((user): AdminCustomer => {
    const profile = profilesById.get(user.id)
    const name =
      cleanText(profile?.full_name) ??
      cleanText(user.user_metadata.nome) ??
      cleanText(user.user_metadata.full_name)
    const phone = cleanText(profile?.phone) ?? cleanText(user.phone)
    const lastActivityAt = latestDate(
      user.created_at,
      user.updated_at,
      user.last_sign_in_at,
      profile?.updated_at,
      activityByCustomerId.get(user.id),
    )

    return {
      id: user.id,
      name,
      email: cleanText(user.email)?.toLowerCase() ?? null,
      phone,
      emailConfirmed: Boolean(user.email_confirmed_at ?? user.confirmed_at),
      registeredAt: user.created_at,
      salesCount:
        salesResult.status === "fulfilled"
          ? salesCountByCustomerId.get(user.id) ?? 0
          : null,
      lastActivityAt,
    }
  })

  const collator = new Intl.Collator("pt-BR", { sensitivity: "base" })

  customers.sort((left, right) => {
    const activityDifference =
      Date.parse(right.lastActivityAt ?? "") -
      Date.parse(left.lastActivityAt ?? "")

    if (Number.isFinite(activityDifference) && activityDifference !== 0) {
      return activityDifference
    }

    return collator.compare(left.name ?? "", right.name ?? "")
  })

  return { customers, warnings }
}
