// src/sanity/queries/artwork.ts
import {defineQuery} from "next-sanity"

export const ARTWORKS_QUERY = defineQuery(`
  *[_type == "artwork" && status in $statuses] | order(year desc) {
    "id": _id,
    title,
    "slug": slug.current,
    year,
    description,
    technique,
    dimensions,
    "image": mainImage {
      asset,
      crop,
      hotspot,
      alt
    },
    images[] {
      asset,
      crop,
      hotspot,
      alt
    },
    status,
    featured,
    catalogNumber
  }
`)
