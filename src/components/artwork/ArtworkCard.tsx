import Image from "next/image"
import Link from "next/link"

import { Artwork } from "@/types/artwork"

type ArtworkCardProps = {
  artwork: Artwork
}

export default function ArtworkCard({
  artwork,
}: ArtworkCardProps) {
  return (
    <Link
      href={`/exposicao/${artwork.slug}`}
      className="group block sm:border-2 rounded-2xl p-2"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        <Image
          src={artwork.image}
          alt={artwork.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-medium">
          {artwork.title}
        </h2>

        <p className="text-sm text-neutral-500">
          {artwork.year}
        </p>
      </div>
    </Link>
  )
}