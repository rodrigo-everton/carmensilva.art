export function getSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (!configuredSiteUrl) return "http://localhost:3000"

  const normalizedSiteUrl = configuredSiteUrl.includes("://")
    ? configuredSiteUrl
    : `https://${configuredSiteUrl}`

  return new URL(normalizedSiteUrl).origin
}
