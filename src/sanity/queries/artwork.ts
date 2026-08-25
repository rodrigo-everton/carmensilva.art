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

export const ARTWORK_INTEREST_QUERY = defineQuery(`
  *[_type == "artwork" && _id == $id && status == "available"][0] {
    "id": _id,
    title,
    status
  }
`)

export const ARTWORKS_BY_IDS_QUERY = defineQuery(`
  *[_type == "artwork" && _id in $ids] {
    "id": _id,
    title,
    year,
    technique,
    dimensions,
    status,
    catalogNumber
  }
`)
