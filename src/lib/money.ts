const MAX_BRL_AMOUNT_CENTS = 999_999_999

export type ParsedBrlAmount = {
  cents: number
  decimal: string
  value: number
}

export function parseBrlAmount(input: unknown): ParsedBrlAmount | null {
  if (typeof input !== "string") {
    return null
  }

  const value = input
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/[\s\u00a0]/g, "")

  let integerPart: string
  let fractionPart = ""

  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(value)) {
    const [groupedInteger, fraction = ""] = value.split(",")
    integerPart = groupedInteger.replaceAll(".", "")
    fractionPart = fraction
  } else {
    const match = /^(\d{1,9})(?:[.,](\d{1,2}))?$/.exec(value)

    if (!match) {
      return null
    }

    integerPart = match[1]
    fractionPart = match[2] ?? ""
  }

  const cents =
    Number(integerPart) * 100 + Number(fractionPart.padEnd(2, "0") || "0")

  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_BRL_AMOUNT_CENTS) {
    return null
  }

  return {
    cents,
    decimal: `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`,
    value: cents / 100,
  }
}

export function numberToCents(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null
  }

  const cents = Math.round(value * 100)

  if (!Number.isSafeInteger(cents) || Math.abs(value * 100 - cents) > 0.000_001) {
    return null
  }

  return cents
}

export function formatBrlFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}
