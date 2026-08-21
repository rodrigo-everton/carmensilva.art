import Image from "next/image"

import { Artwork } from "@/types/artwork"
import { urlFor } from "@/sanity/lib/image"

type ArtworkCardProps = {
  artwork: Artwork
}

const statusStyles = {
  available: {
    label: "Disponível",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  reserved: {
    label: "Reservada",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  exhibition: {
    label: "Em exposição",
    className: "border-blue-200 bg-blue-50 text-blue-800",
  },
  sold: {
    label: "Vendida",
    className: "border-stone-200 bg-stone-100 text-stone-600",
  },
} satisfies Record<Artwork["status"], {label: string; className: string}>

function formatDimensions(dimensions: Artwork["dimensions"]) {
  if (!dimensions?.width || !dimensions.height) return null

  const values = [dimensions.height, dimensions.width]
  if (dimensions.depth) values.push(dimensions.depth)

  return `${values.join(" × ")} ${dimensions.unit ?? "cm"}`
}

export default function ArtworkCard({
  artwork,
}: ArtworkCardProps) {
  const status = statusStyles[artwork.status]
  const dimensions = formatDimensions(artwork.dimensions)

  return (
    <article className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-4/5 overflow-hidden bg-stone-100">
        <Image
          src={urlFor(artwork.image).width(800).height(1000).url()}
          alt={artwork.image.alt ?? artwork.title}
          fill
          sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 33vw"
          className="object-cover transition duration-500 hover:scale-[1.015]"
        />
        <span className={`absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-semibold leading-snug tracking-tight text-stone-950">
            {artwork.title}
          </h3>
          {artwork.year && (
            <span className="shrink-0 pt-1 text-sm text-stone-500">
              {artwork.year}
            </span>
          )}
        </div>

        {(artwork.technique || dimensions) && (
          <dl className="mt-5 space-y-2 border-t border-stone-100 pt-4 text-sm">
            {artwork.technique && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Técnica</dt>
                <dd className="text-right text-stone-700">{artwork.technique}</dd>
              </div>
            )}
            {dimensions && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Dimensões</dt>
                <dd className="text-right text-stone-700">{dimensions}</dd>
              </div>
            )}
          </dl>
        )}

        {artwork.catalogNumber && (
          <p className="mt-5 text-xs uppercase tracking-[0.16em] text-stone-400">
            Cat. {artwork.catalogNumber}
          </p>
        )}
      </div>
    </article>
  )
}
