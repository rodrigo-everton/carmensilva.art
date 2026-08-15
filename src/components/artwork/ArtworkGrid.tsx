import ArtworkCard from "./ArtworkCard"

import { Artwork } from "@/types/artwork"

type ArtworkGridProps = {
  artworks: Artwork[]
}

export default function ArtworkGrid({
  artworks,
}: ArtworkGridProps) {
  return (
    <div
      className="
        grid
        grid-cols-1
        gap-x-6
        gap-y-12
        sm:grid-cols-2
        lg:grid-cols-3
      "
    >
      {artworks.map((artwork) => (
        <ArtworkCard
          key={artwork.id}
          artwork={artwork}
        />
      ))}
    </div>
  )
}