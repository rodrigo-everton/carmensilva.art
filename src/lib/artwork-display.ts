import type {ArtworkStatus} from "@/types/artwork"

type ArtworkDimensions = {
  width?: number
  height?: number
  depth?: number
  unit?: "cm"
} | null

export const artworkStatusDetails = {
  available: {
    label: "Disponível",
    className: "bg-green-secondary text-green-hover",
  },
  reserved: {
    label: "Reservada",
    className: "bg-orange-secondary text-orange-hover",
  },
  exhibition: {
    label: "Em exposição",
    className: "bg-red-secondary text-red-hover",
  },
  sold: {
    label: "Vendida",
    className: "bg-red text-white",
  },
} satisfies Record<ArtworkStatus, {label: string; className: string}>

export function formatArtworkDimensions(dimensions: ArtworkDimensions) {
  if (!dimensions?.width || !dimensions.height) return null

  const values = [dimensions.height, dimensions.width]
  if (dimensions.depth) values.push(dimensions.depth)

  return `${values.join(" × ")} ${dimensions.unit ?? "cm"}`
}
