import Image from "next/image"
import Link from "next/link"
import {ArrowUpRight} from "lucide-react"

import { Artwork } from "@/types/artwork"
import {
  artworkArtistName,
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
        className="relative block aspect-4/5 overflow-hidden bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
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
        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <dt className="text-red/55">Artista:</dt>
            <dd className="text-red/80">{artworkArtistName}</dd>
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3">
            <dt className="pt-1 text-red/55">Título:</dt>
            <dd>
              <h3 className="text-2xl font-semibold leading-snug tracking-tight text-red">
                <Link
                  href={artworkHref}
                  prefetch={false}
                  className="rounded-sm transition-colors hover:text-orange focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange"
                >
                  {artwork.title}
                </Link>
              </h3>
            </dd>
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <dt className="text-red/55">Ano:</dt>
            <dd className="font-semibold text-green">{artwork.year ?? "—"}</dd>
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <dt className="text-red/55">Técnica:</dt>
            <dd className="text-red/80">{artwork.technique || "—"}</dd>
          </div>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <dt className="text-red/55">Dimensões:</dt>
            <dd className="text-red/80">{dimensions ?? "—"}</dd>
          </div>
        </dl>

        {artwork.description && (
          <p className="mt-5 line-clamp-2 border-t border-red/15 pt-4 text-sm leading-relaxed text-red/65">
            {artwork.description}
          </p>
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
