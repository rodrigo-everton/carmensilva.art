import ArtworkCard from "./ArtworkCard"

import { Artwork } from "@/types/artwork"

type ArtworkGridProps = {
  artworks: Artwork[]
}

export default function ArtworkGrid({
  artworks,
}: ArtworkGridProps) {
  if (artworks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
        <h3 className="text-lg font-semibold text-stone-900">Nenhuma obra publicada</h3>
        <p className="mt-2 text-sm text-stone-500">
          Novos trabalhos serão apresentados aqui em breve.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {artworks.map((artwork) => (
        <ArtworkCard
          key={artwork.id}
          artwork={artwork}
        />
      ))}
    </div>
  )
}
