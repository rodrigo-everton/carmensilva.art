import type {
  ARTWORKS_QUERY_RESULT,
} from "@/sanity/types.generated"

export type Artwork = ARTWORKS_QUERY_RESULT[number]
export type ArtworkStatus = Artwork["status"]