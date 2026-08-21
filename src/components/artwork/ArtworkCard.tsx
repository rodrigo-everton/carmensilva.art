import Image from "next/image"
import Link from "next/link"
import {ArrowUpRight} from "lucide-react"

import { Artwork } from "@/types/artwork"
import { urlFor } from "@/sanity/lib/image"

type ArtworkCardProps = {
  artwork: Artwork
  showInquiry?: boolean
}

const statusStyles = {
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
} satisfies Record<Artwork["status"], {label: string; className: string}>

function formatDimensions(dimensions: Artwork["dimensions"]) {
  if (!dimensions?.width || !dimensions.height) return null

  const values = [dimensions.height, dimensions.width]
  if (dimensions.depth) values.push(dimensions.depth)

  return `${values.join(" × ")} ${dimensions.unit ?? "cm"}`
}

export default function ArtworkCard({
  artwork,
  showInquiry = false,
}: ArtworkCardProps) {
  const status = statusStyles[artwork.status]
  const dimensions = formatDimensions(artwork.dimensions)

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-red/15 bg-white transition-transform duration-300 hover:-translate-y-1">
      <div className="relative aspect-4/5 overflow-hidden bg-green-secondary">
        <Image
          src={urlFor(artwork.image).width(900).height(1125).fit("crop").url()}
          alt={artwork.image.alt ?? artwork.title}
          fill
          sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) 50vw, 33vw"
          className="object-cover transition duration-700 group-hover:scale-[1.025]"
        />
        <span className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}>
          {status.label}
        </span>
      </div>

      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold leading-snug tracking-tight text-red">
            {artwork.title}
          </h3>
          {artwork.year && (
            <span className="shrink-0 pt-1 text-sm font-semibold text-green">
              {artwork.year}
            </span>
          )}
        </div>

        {artwork.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-red/65">
            {artwork.description}
          </p>
        )}

        {(artwork.technique || dimensions) && (
          <dl className="mt-5 space-y-2 border-t border-red/15 pt-4 text-sm">
            {artwork.technique && (
              <div className="flex justify-between gap-4">
                <dt className="text-red/55">Técnica</dt>
                <dd className="text-right text-red/80">{artwork.technique}</dd>
              </div>
            )}
            {dimensions && (
              <div className="flex justify-between gap-4">
                <dt className="text-red/55">Dimensões</dt>
                <dd className="text-right text-red/80">{dimensions}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-6 flex items-end justify-between gap-4">
          {artwork.catalogNumber ? (
            <p className="text-xs uppercase tracking-[0.16em] text-red/45">
              Cat. {artwork.catalogNumber}
            </p>
          ) : (
            <span />
          )}

          {showInquiry && artwork.status === "available" && (
            <Link
              href="/contato"
              className="inline-flex items-center gap-2 font-semibold text-orange transition-colors hover:text-orange-hover"
              aria-label={`Tenho interesse na obra ${artwork.title}`}
            >
              Tenho interesse
              <ArrowUpRight
                size={18}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden="true"
              />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
