import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { requireAdmin } from "@/lib/auth"
import { loadCustomerNames } from "@/lib/customer-names"
import { createSupabaseAdminClient } from "@/lib/supabase-admin"
import { sanityFetch } from "@/sanity/lib/live"
import { ADMIN_SALE_ARTWORKS_QUERY } from "@/sanity/queries/artwork"
import type { ADMIN_SALE_ARTWORKS_QUERY_RESULT } from "@/sanity/types.generated"
import type { DeliveryStatus } from "@/types/delivery"
import type { PaymentPreferenceStatus, PaymentStatus } from "@/types/payment"
import type { SaleStatus } from "@/types/sale"

const SUPABASE_PAGE_SIZE = 1000
const ID_BATCH_SIZE = 100

const SALE_STATUSES: readonly SaleStatus[] = [
  "negotiating",
  "awaiting_payment",
  "paid",
  "preparing_delivery",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
]

const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "pending",
  "approved",
  "rejected",
  "refunded",
]

const PAYMENT_PREFERENCE_STATUSES: readonly PaymentPreferenceStatus[] = [
  "creating",
  "active",
  "paid",
  "superseded",
  "expired",
  "refunded",
  "failed",
]

const DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  "pending",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
]

const SALE_STATUSES_REQUIRING_PAYMENT = new Set<SaleStatus>([
  "paid",
  "preparing_delivery",
  "shipped",
  "delivered",
  "completed",
])

type SaleRow = {
  id: string
  conversation_id: string | null
  artwork_id: string
  customer_id: string
  negotiated_price: number | string
  currency: string
  sale_status: string
  created_at: string
  updated_at: string
}

type PaymentRow = {
  id: string
  sale_id: string
  amount: number | string
  currency: string
  status: string
  live_mode: boolean | null
  created_at: string
  updated_at: string
}

type PaymentPreferenceRow = {
  id: string
  sale_id: string
  amount_cents: number | string
  currency: string
  status: string
  environment: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

type DeliveryRow = {
  id: string
  sale_id: string
  status: string
  created_at: string
  updated_at: string
}

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
  count: number | null
}

type TimestampedRow = {
  id: string
  created_at: string
  updated_at: string
}

type PaymentStateSource = "payment" | "preference" | "sale"

type ResolvedPaymentState = {
  status: AdminPaymentStatus
  payment: PaymentRow | null
  preference: PaymentPreferenceRow | null
  source: PaymentStateSource
}

export type AdminSaleWarning =
  | "customers"
  | "artworks"
  | "payments"
  | "payment_preferences"
  | "deliveries"

export type AdminSaleStatus = SaleStatus | "unknown"

export type AdminPaymentStatus =
  | PaymentStatus
  | PaymentPreferenceStatus
  | "not_started"
  | "unknown"

export type AdminDeliveryStatus =
  | DeliveryStatus
  | "not_started"
  | "not_registered"
  | "unknown"

export type AdminPaymentEnvironment =
  | "test"
  | "production"
  | "unclassified"
  | null

export type AdminSale = {
  id: string
  conversationId: string | null
  artworkId: string
  artworkTitle: string | null
  artworkSlug: string | null
  customerName: string | null
  amount: number | null
  currency: string | null
  saleStatus: AdminSaleStatus
  paymentStatus: AdminPaymentStatus
  paymentEnvironment: AdminPaymentEnvironment
  deliveryStatus: AdminDeliveryStatus
  hasPaymentConflict: boolean
  createdAt: string
  updatedAt: string
}

export type AdminSalesResult = {
  sales: AdminSale[]
  warnings: AdminSaleWarning[]
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

async function listSales(supabase: SupabaseClient) {
  return collectPages<SaleRow>(
    async (from, to) => {
      const { data, error, count } = await supabase
        .from("sales")
        .select(
          "id,conversation_id,artwork_id,customer_id,negotiated_price,currency,sale_status,created_at,updated_at",
          { count: "exact" },
        )
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to)

      return { data: data as SaleRow[] | null, error, count }
    },
    "Não foi possível consultar as vendas",
  )
}

async function listRowsForSaleIds<T>(
  supabase: SupabaseClient,
  saleIds: string[],
  table: string,
  columns: string,
  errorMessage: string,
) {
  const pages = await Promise.all(
    splitIntoBatches(saleIds, ID_BATCH_SIZE).map((saleIdBatch) =>
      collectPages<T>(
        async (from, to) => {
          const { data, error, count } = await supabase
            .from(table)
            .select(columns, { count: "exact" })
            .in("sale_id", saleIdBatch)
            .order("id", { ascending: true })
            .range(from, to)

          return { data: data as T[] | null, error, count }
        },
        errorMessage,
      ),
    ),
  )

  return pages.flat()
}

function rowTimestamp(row: TimestampedRow) {
  const timestamp = Date.parse(row.updated_at || row.created_at)

  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

function latestRow<T extends TimestampedRow>(
  rows: T[],
  getTimestamp: (row: T) => number = rowTimestamp,
) {
  let latest: T | null = null
  let latestTimestamp = Number.NEGATIVE_INFINITY

  for (const row of rows) {
    const timestamp = getTimestamp(row)

    if (
      !latest ||
      timestamp > latestTimestamp ||
      (timestamp === latestTimestamp && row.id.localeCompare(latest.id) > 0)
    ) {
      latest = row
      latestTimestamp = timestamp
    }
  }

  return latest
}

function groupBySaleId<T extends { sale_id: string }>(rows: T[]) {
  const rowsBySaleId = new Map<string, T[]>()

  for (const row of rows) {
    const saleRows = rowsBySaleId.get(row.sale_id) ?? []

    saleRows.push(row)
    rowsBySaleId.set(row.sale_id, saleRows)
  }

  return rowsBySaleId
}

function normalizeSaleStatus(value: string): AdminSaleStatus {
  return (SALE_STATUSES as readonly string[]).includes(value)
    ? (value as SaleStatus)
    : "unknown"
}

function normalizePaymentStatus(value: string) {
  return (PAYMENT_STATUSES as readonly string[]).includes(value)
    ? (value as PaymentStatus)
    : "unknown"
}

function normalizePreferenceStatus(value: string) {
  return (PAYMENT_PREFERENCE_STATUSES as readonly string[]).includes(value)
    ? (value as PaymentPreferenceStatus)
    : "unknown"
}

function normalizeDeliveryStatus(value: string) {
  return (DELIVERY_STATUSES as readonly string[]).includes(value)
    ? (value as DeliveryStatus)
    : "unknown"
}

function normalizeEnvironment(value: string | null | undefined) {
  return ["test", "production", "unclassified"].includes(value ?? "")
    ? (value as Exclude<AdminPaymentEnvironment, null>)
    : null
}

function effectivePreferenceStatus(row: PaymentPreferenceRow) {
  const status = normalizePreferenceStatus(row.status)
  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : Number.NaN

  return ["creating", "active"].includes(status) &&
    Number.isFinite(expiresAt) &&
    expiresAt <= Date.now()
    ? "expired"
    : status
}

function preferenceTimestamp(row: PaymentPreferenceRow) {
  const status = normalizePreferenceStatus(row.status)
  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : Number.NaN

  if (
    ["creating", "active"].includes(status) &&
    Number.isFinite(expiresAt) &&
    expiresAt <= Date.now()
  ) {
    return expiresAt
  }

  return rowTimestamp(row)
}

function latestPreferenceRow(rows: PaymentPreferenceRow[]) {
  return latestRow(rows, preferenceTimestamp)
}

function onlyRow<T>(rows: T[]) {
  return rows.length === 1 ? rows[0] : null
}

function fallbackPaymentStatus(
  saleStatus: AdminSaleStatus,
): AdminPaymentStatus {
  if (saleStatus === "awaiting_payment") {
    return "pending"
  }

  if (
    saleStatus !== "unknown" &&
    SALE_STATUSES_REQUIRING_PAYMENT.has(saleStatus)
  ) {
    return "approved"
  }

  return saleStatus === "unknown" ? "unknown" : "not_started"
}

function resolvePaymentState(
  payments: PaymentRow[],
  preferences: PaymentPreferenceRow[],
  saleStatus: AdminSaleStatus,
): ResolvedPaymentState {
  const approved = latestRow(
    payments.filter(
      ({ status }) => normalizePaymentStatus(status) === "approved",
    ),
  )

  if (approved) {
    return {
      status: "approved",
      payment: approved,
      preference: onlyRow(
        preferences.filter(
          (preference) => effectivePreferenceStatus(preference) === "paid",
        ),
      ),
      source: "payment",
    }
  }

  const pending = latestRow(
    payments.filter(
      ({ status }) => normalizePaymentStatus(status) === "pending",
    ),
  )
  const openPreferences = preferences.filter((preference) =>
    ["creating", "active"].includes(effectivePreferenceStatus(preference)),
  )
  const openPreference = latestPreferenceRow(openPreferences)

  if (pending) {
    return {
      status: "pending",
      payment: pending,
      preference: onlyRow(openPreferences),
      source: "payment",
    }
  }

  if (openPreference) {
    return {
      status: effectivePreferenceStatus(openPreference),
      payment: null,
      preference: openPreference,
      source: "preference",
    }
  }

  const terminalPayment = latestRow(payments)
  const terminalPreference = latestPreferenceRow(preferences)

  if (terminalPayment && terminalPreference) {
    const paymentIsNewer =
      rowTimestamp(terminalPayment) > preferenceTimestamp(terminalPreference) ||
      (rowTimestamp(terminalPayment) ===
        preferenceTimestamp(terminalPreference) &&
        `payment:${terminalPayment.id}`.localeCompare(
          `preference:${terminalPreference.id}`,
        ) > 0)

    if (paymentIsNewer) {
      const paymentStatus = normalizePaymentStatus(terminalPayment.status)

      return {
        status: paymentStatus,
        payment: terminalPayment,
        preference:
          paymentStatus === "refunded"
            ? onlyRow(
                preferences.filter(
                  (preference) =>
                    effectivePreferenceStatus(preference) === "refunded",
                ),
              )
            : null,
        source: "payment",
      }
    }
  }

  if (terminalPreference) {
    const preferenceStatus = effectivePreferenceStatus(terminalPreference)

    return {
      status: preferenceStatus,
      payment:
        preferenceStatus === "refunded"
          ? onlyRow(
              payments.filter(
                ({ status }) => normalizePaymentStatus(status) === "refunded",
              ),
            )
          : null,
      preference: terminalPreference,
      source: "preference",
    }
  }

  if (terminalPayment) {
    return {
      status: normalizePaymentStatus(terminalPayment.status),
      payment: terminalPayment,
      preference: null,
      source: "payment",
    }
  }

  return {
    status: fallbackPaymentStatus(saleStatus),
    payment: null,
    preference: null,
    source: "sale",
  }
}

function resolveDeliveryStatus(
  rows: DeliveryRow[],
  saleStatus: AdminSaleStatus,
  deliveriesAvailable: boolean,
): AdminDeliveryStatus {
  if (!deliveriesAvailable) {
    return "unknown"
  }

  const latestDelivery = latestRow(rows)

  if (latestDelivery) {
    return normalizeDeliveryStatus(latestDelivery.status)
  }

  if (
    saleStatus !== "unknown" &&
    SALE_STATUSES_REQUIRING_PAYMENT.has(saleStatus)
  ) {
    return "not_registered"
  }

  return saleStatus === "unknown" ? "unknown" : "not_started"
}

function finitePositiveNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)

  return Number.isFinite(number) && number > 0 ? number : null
}

function normalizedCurrency(value: unknown) {
  const currency = typeof value === "string" ? value.trim().toUpperCase() : ""

  return /^[A-Z]{3}$/.test(currency) ? currency : null
}

function amountsMatch(left: number | null, right: number | null) {
  return left !== null && right !== null && Math.abs(left - right) < 0.005
}

function resolvePaymentEnvironment(
  paymentState: ResolvedPaymentState,
): AdminPaymentEnvironment {
  const paymentEnvironment =
    paymentState.payment?.live_mode === true
      ? "production"
      : paymentState.payment?.live_mode === false
        ? "test"
        : null
  const preferenceEnvironment = normalizeEnvironment(
    paymentState.preference?.environment,
  )

  if (paymentState.source === "preference") {
    return preferenceEnvironment ?? paymentEnvironment
  }

  return paymentEnvironment ?? preferenceEnvironment
}

function hasPaymentConflict(
  sale: SaleRow,
  saleStatus: AdminSaleStatus,
  paymentState: ResolvedPaymentState,
  payments: PaymentRow[],
  preferences: PaymentPreferenceRow[],
  paymentsAvailable: boolean,
  preferencesAvailable: boolean,
) {
  const hasApprovedPayment = payments.some(
    ({ status }) => normalizePaymentStatus(status) === "approved",
  )
  const hasPaidPreference = preferences.some(
    (preference) => effectivePreferenceStatus(preference) === "paid",
  )
  const hasPendingPayment = payments.some(
    ({ status }) => normalizePaymentStatus(status) === "pending",
  )
  const hasOpenPreference = preferences.some((preference) =>
    ["creating", "active"].includes(effectivePreferenceStatus(preference)),
  )
  const hasPaidEvidence = hasApprovedPayment || hasPaidPreference
  const hasOpenEvidence = hasPendingPayment || hasOpenPreference

  if (
    ["negotiating", "cancelled"].includes(saleStatus) &&
    (hasPaidEvidence || hasOpenEvidence)
  ) {
    return true
  }

  if (
    saleStatus !== "unknown" &&
    SALE_STATUSES_REQUIRING_PAYMENT.has(saleStatus) &&
    (hasOpenEvidence || (paymentsAvailable && !hasApprovedPayment))
  ) {
    return true
  }

  if (
    saleStatus === "awaiting_payment" &&
    (hasPaidEvidence ||
      (paymentsAvailable &&
        preferencesAvailable &&
        !hasOpenEvidence))
  ) {
    return true
  }

  if (
    paymentState.status === "refunded" &&
    !["negotiating", "cancelled"].includes(saleStatus) &&
    paymentsAvailable &&
    preferencesAvailable
  ) {
    return true
  }

  const saleAmount = finitePositiveNumber(sale.negotiated_price)
  const saleCurrency = normalizedCurrency(sale.currency)
  const canCompareCanonicalRecord =
    (paymentsAvailable && preferencesAvailable) ||
    ["approved", "pending", "creating", "active", "paid"].includes(
      paymentState.status,
    )

  if (
    canCompareCanonicalRecord &&
    paymentState.payment &&
    (!amountsMatch(
      saleAmount,
      finitePositiveNumber(paymentState.payment.amount),
    ) ||
      saleCurrency !== normalizedCurrency(paymentState.payment.currency))
  ) {
    return true
  }

  if (
    canCompareCanonicalRecord &&
    paymentState.preference &&
    ["creating", "active", "paid"].includes(
      effectivePreferenceStatus(paymentState.preference),
    )
  ) {
    const preferenceAmountCents = finitePositiveNumber(
      paymentState.preference.amount_cents,
    )

    if (
      !amountsMatch(
        saleAmount,
        preferenceAmountCents === null ? null : preferenceAmountCents / 100,
      ) ||
      saleCurrency !== normalizedCurrency(paymentState.preference.currency)
    ) {
      return true
    }
  }

  const paymentEnvironment =
    paymentState.payment?.live_mode === true
      ? "production"
      : paymentState.payment?.live_mode === false
        ? "test"
        : null
  const preferenceEnvironment = normalizeEnvironment(
    paymentState.preference?.environment,
  )

  return Boolean(
    paymentEnvironment &&
      preferenceEnvironment &&
      preferenceEnvironment !== "unclassified" &&
      paymentEnvironment !== preferenceEnvironment,
  )
}

function logEnrichmentError(source: AdminSaleWarning, reason: unknown) {
  console.error(
    `Não foi possível carregar ${source} para a lista de vendas.`,
    reason instanceof Error ? reason.message : reason,
  )
}

export async function loadAdminSales(): Promise<AdminSalesResult> {
  await requireAdmin()

  const supabase = createSupabaseAdminClient()
  const saleRows = await listSales(supabase)

  if (saleRows.length === 0) {
    return { sales: [], warnings: [] }
  }

  const saleIds = saleRows.map(({ id }) => id)
  const customerIds = [
    ...new Set(saleRows.map(({ customer_id }) => customer_id).filter(Boolean)),
  ]
  const artworkIds = [
    ...new Set(saleRows.map(({ artwork_id }) => artwork_id).filter(Boolean)),
  ]

  const [
    paymentsResult,
    preferencesResult,
    deliveriesResult,
    customerNamesResult,
    artworksResult,
  ] = await Promise.allSettled([
    listRowsForSaleIds<PaymentRow>(
      supabase,
      saleIds,
      "payments",
      "id,sale_id,amount,currency,status,live_mode,created_at,updated_at",
      "Não foi possível consultar os pagamentos",
    ),
    listRowsForSaleIds<PaymentPreferenceRow>(
      supabase,
      saleIds,
      "payment_preferences",
      "id,sale_id,amount_cents,currency,status,environment,expires_at,created_at,updated_at",
      "Não foi possível consultar os links de pagamento",
    ),
    listRowsForSaleIds<DeliveryRow>(
      supabase,
      saleIds,
      "deliveries",
      "id,sale_id,status,created_at,updated_at",
      "Não foi possível consultar as entregas",
    ),
    loadCustomerNames(customerIds),
    sanityFetch({
      query: ADMIN_SALE_ARTWORKS_QUERY,
      params: { ids: artworkIds },
      perspective: "published",
      stega: false,
    }).then(({ data }) => data),
  ])

  const warnings: AdminSaleWarning[] = []

  if (paymentsResult.status === "rejected") {
    warnings.push("payments")
    logEnrichmentError("payments", paymentsResult.reason)
  }

  if (preferencesResult.status === "rejected") {
    warnings.push("payment_preferences")
    logEnrichmentError("payment_preferences", preferencesResult.reason)
  }

  if (deliveriesResult.status === "rejected") {
    warnings.push("deliveries")
    logEnrichmentError("deliveries", deliveriesResult.reason)
  }

  if (customerNamesResult.status === "rejected") {
    warnings.push("customers")
    logEnrichmentError("customers", customerNamesResult.reason)
  }

  if (artworksResult.status === "rejected") {
    warnings.push("artworks")
    logEnrichmentError("artworks", artworksResult.reason)
  }

  const paymentsAvailable = paymentsResult.status === "fulfilled"
  const preferencesAvailable = preferencesResult.status === "fulfilled"
  const deliveriesAvailable = deliveriesResult.status === "fulfilled"
  const payments = paymentsAvailable ? paymentsResult.value : []
  const preferences = preferencesAvailable ? preferencesResult.value : []
  const deliveries = deliveriesAvailable ? deliveriesResult.value : []
  const customerNames =
    customerNamesResult.status === "fulfilled"
      ? customerNamesResult.value
      : new Map<string, string>()
  const artworks: ADMIN_SALE_ARTWORKS_QUERY_RESULT =
    artworksResult.status === "fulfilled" ? artworksResult.value : []

  if (customerIds.some((customerId) => !customerNames.has(customerId))) {
    if (!warnings.includes("customers")) {
      warnings.push("customers")
    }
  }

  const paymentsBySaleId = groupBySaleId(payments)
  const preferencesBySaleId = groupBySaleId(preferences)
  const deliveriesBySaleId = groupBySaleId(deliveries)
  const artworksById = new Map(artworks.map((artwork) => [artwork.id, artwork]))

  const sales = saleRows.map((sale): AdminSale => {
    const saleStatus = normalizeSaleStatus(sale.sale_status)
    const salePayments = paymentsBySaleId.get(sale.id) ?? []
    const salePreferences = preferencesBySaleId.get(sale.id) ?? []
    const paymentState = resolvePaymentState(
      salePayments,
      salePreferences,
      saleStatus,
    )
    const artwork = artworksById.get(sale.artwork_id)

    return {
      id: sale.id,
      conversationId: sale.conversation_id,
      artworkId: sale.artwork_id,
      artworkTitle: artwork?.title?.trim() || null,
      artworkSlug: artwork?.slug?.trim() || null,
      customerName: customerNames.get(sale.customer_id) ?? null,
      amount: finitePositiveNumber(sale.negotiated_price),
      currency: normalizedCurrency(sale.currency),
      saleStatus,
      paymentStatus: paymentState.status,
      paymentEnvironment: resolvePaymentEnvironment(paymentState),
      deliveryStatus: resolveDeliveryStatus(
        deliveriesBySaleId.get(sale.id) ?? [],
        saleStatus,
        deliveriesAvailable,
      ),
      hasPaymentConflict: hasPaymentConflict(
        sale,
        saleStatus,
        paymentState,
        salePayments,
        salePreferences,
        paymentsAvailable,
        preferencesAvailable,
      ),
      createdAt: sale.created_at,
      updatedAt: sale.updated_at,
    }
  })

  return { sales, warnings }
}
