import type {MetadataRoute} from "next"

import {getSiteUrl} from "@/lib/site-url"
import {client} from "@/sanity/lib/client"
import {ARTWORK_SITEMAP_QUERY} from "@/sanity/queries/artwork"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const artworks = await client
    .withConfig({perspective: "published", useCdn: false})
    .fetch(ARTWORK_SITEMAP_QUERY)

  const staticPages: MetadataRoute.Sitemap = [
    {url: siteUrl, changeFrequency: "monthly", priority: 1},
    {
      url: new URL("/venda", siteUrl).toString(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: new URL("/exposicao", siteUrl).toString(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: new URL("/sobre", siteUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: new URL("/contato", siteUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ]

  const artworkPages: MetadataRoute.Sitemap = artworks.map((artwork) => ({
    url: new URL(`/obra/${artwork.slug}`, siteUrl).toString(),
    lastModified: artwork._updatedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  return [...staticPages, ...artworkPages]
}
