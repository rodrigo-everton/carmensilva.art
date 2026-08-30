import Image from "next/image"
import Link from "next/link"
import {ArrowUpRight} from "lucide-react"

import { Artwork } from "@/types/artwork"
import {
  artworkStatusDetails,
  formatArtworkDimensions,
} from "@/lib/artwork-display"
import { urlFor } from "@/sanity/lib/image"

import ArtworkInterestButton from "./ArtworkInterestButton"

type ArtworkCardProps = {
  artwork: Artwork
  showInquiry?: boolean
}

export default function ArtworkCard({
  artwork,
  showInquiry = false,
}: ArtworkCardProps) {
  if (!artwork.image?.asset) return null

  const status = artworkStatusDetails[artwork.status]
  const dimensions = formatArtworkDimensions(artwork.dimensions)
  const artworkHref = `/obra/${artwork.slug}`

  return (
    <article className="group overflow-hidden rounded-4xl border border-red/15 bg-white transition-transform duration-300 hover:-translate-y-1">
      <Link
        href={artworkHref}
        prefetch={false}
        aria-label={`Ver detalhes da obra ${artwork.title}`}
        className="relative block aspect-4/5 overflow-hidden bg-green-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
      >
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
      </Link>

      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl font-semibold leading-snug tracking-tight text-red">
            <Link
              href={artworkHref}
              prefetch={false}
              className="rounded-sm transition-colors hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
            >
              {artwork.title}
            </Link>
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

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          {artwork.catalogNumber ? (
            <p className="text-xs uppercase tracking-[0.16em] text-red/45">
              Cat. {artwork.catalogNumber}
            </p>
          ) : (
            <span />
          )}

          <div className="ml-auto flex flex-wrap items-center justify-end gap-4">
            <Link
              href={artworkHref}
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-red transition-colors hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
            >
              Ver obra
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>

            {showInquiry && artwork.status === "available" && (
              <ArtworkInterestButton
                artworkId={artwork.id}
                artworkTitle={artwork.title}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
