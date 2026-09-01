// src/sanity/queries/artwork.ts
import {defineQuery} from "next-sanity"

export const ARTWORKS_QUERY = defineQuery(`
  *[
    _type == "artwork" &&
    status in $statuses &&
    defined(slug.current) &&
    defined(mainImage.asset._ref)
  ]
    | order(year desc, _updatedAt desc, _id asc) {
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
    status,
    featured,
    catalogNumber
  }
`)

export const SALE_ARTWORKS_QUERY = defineQuery(`
  *[
    _type == "artwork" &&
    status in ["available", "reserved"] &&
    defined(slug.current) &&
    defined(mainImage.asset._ref)
  ]
    | order(
        defined(salePosition) desc,
        salePosition asc,
        year desc,
        _updatedAt desc,
        _id asc
      ) {
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
    status,
    featured,
    catalogNumber
  }
`)

export const ARTWORK_QUERY = defineQuery(`
  *[
    _type == "artwork" &&
    slug.current == $slug &&
    defined(mainImage.asset._ref)
  ][0] {
    "id": _id,
    _updatedAt,
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
    "images": images[defined(asset._ref)] {
      _key,
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

export const ARTWORK_SLUGS_QUERY = defineQuery(`
  *[
    _type == "artwork" &&
    defined(slug.current) &&
    defined(mainImage.asset._ref)
  ] {
    "slug": slug.current
  }
`)

export const ARTWORK_SITEMAP_QUERY = defineQuery(`
  *[
    _type == "artwork" &&
    defined(slug.current) &&
    defined(mainImage.asset._ref)
  ]
    | order(_updatedAt desc) {
    "slug": slug.current,
    _updatedAt
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

export const ADMIN_SALE_ARTWORKS_QUERY = defineQuery(`
  *[_type == "artwork" && _id in $ids] {
    "id": _id,
    title,
    "slug": slug.current
  }
`)

export const ADMIN_ACTIVITY_ARTWORKS_QUERY = defineQuery(`
  *[_type == "artwork" && _id in $ids] {
    "id": _id,
    title
  }
`)

export const ARTWORK_COMMERCE_QUERY = defineQuery(`
  *[
    _type == "artwork" &&
    _id in $ids
  ] {
    _id,
    _rev,
    status,
    "slug": slug.current,
    commerce {
      saleId,
      paymentPreferenceId,
      providerPaymentId,
      reservationExpiresAt,
      updatedAt
    }
  }
`)
