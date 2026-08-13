export type ArtworkStatus =
  | "available"
  | "reserved"
  | "sold"
  | "exhibition"

export type Artwork = {
  id: string

  title: string
  slug: string

  year?: number

  description?: string

  technique?: string

  dimensions?: {
    width?: number
    height?: number
    depth?: number
    unit: "cm"
  }

  image: string
  images?: string[]

  status: ArtworkStatus

  featured?: boolean
}