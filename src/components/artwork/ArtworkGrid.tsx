import ArtworkCard from "./ArtworkCard"

import { Artwork } from "@/types/artwork"

type ArtworkGridProps = {
  artworks: Artwork[]
  showInquiry?: boolean
}

export default function ArtworkGrid({
  artworks,
  showInquiry = false,
}: ArtworkGridProps) {
  if (artworks.length === 0) {
    return (
      <div className="rounded-4xl border border-dashed border-red/30 bg-white px-6 py-16 text-center">
        <h3 className="text-xl font-semibold text-red">Novas obras em breve</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-red/65">
          A seleção está sendo atualizada. Entre em contato para conhecer os
          trabalhos mais recentes.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
      {artworks.map((artwork) => (
        <ArtworkCard
          key={artwork.id}
          artwork={artwork}
          showInquiry={showInquiry}
        />
      ))}
    </div>
  )
}
