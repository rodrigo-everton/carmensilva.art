import type {Metadata} from "next"
import Image from "next/image"
import Link from "next/link"
import {ArrowLeft, Images} from "lucide-react"
import {notFound} from "next/navigation"
import {cache} from "react"

import ArtworkInterestButton from "@/components/artwork/ArtworkInterestButton"
import ExpandableDescription from "@/components/artwork/ExpandableDescription"
import Container from "@/components/ui/Container"
import {
  artworkStatusDetails,
  formatArtworkDimensions,
} from "@/lib/artwork-display"
import {urlFor} from "@/sanity/lib/image"
import {sanityFetch} from "@/sanity/lib/live"
import {
  ARTWORK_QUERY,
  ARTWORK_SLUGS_QUERY,
} from "@/sanity/queries/artwork"

type ArtworkPageProps = {
  params: Promise<{slug: string}>
}

const getArtwork = cache(async (slug: string) => {
  const {data: artwork} = await sanityFetch({
    query: ARTWORK_QUERY,
    params: {slug},
    stega: false,
  })

  return artwork
})

function getMetadataDescription(description: string | null, title: string) {
  const fallback = `Conheça a obra ${title}, de Carmem Silva.`
  const normalizedDescription = description?.replace(/\s+/g, " ").trim()

  if (!normalizedDescription) return fallback
  if (normalizedDescription.length <= 160) return normalizedDescription

  return `${normalizedDescription.slice(0, 157).trimEnd()}…`
}

export async function generateStaticParams() {
  const {data: artworks} = await sanityFetch({
    query: ARTWORK_SLUGS_QUERY,
    perspective: "published",
    stega: false,
  })

  return artworks
}

export async function generateMetadata({
  params,
}: ArtworkPageProps): Promise<Metadata> {
  const {slug} = await params
  const artwork = await getArtwork(slug)

  if (!artwork) return {}

  const description = getMetadataDescription(artwork.description, artwork.title)
  const imageUrl = urlFor(artwork.image)
    .width(1200)
    .height(630)
    .fit("crop")
    .url()

  return {
    title: artwork.title,
    description,
    alternates: {
      canonical: `/obra/${artwork.slug}`,
    },
    openGraph: {
      type: "website",
      url: `/obra/${artwork.slug}`,
      title: artwork.title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: artwork.image.alt ?? artwork.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: artwork.title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function ArtworkPage({params}: ArtworkPageProps) {
  const {slug} = await params
  const artwork = await getArtwork(slug)

  if (!artwork) notFound()

  const status = artworkStatusDetails[artwork.status]
  const dimensions = formatArtworkDimensions(artwork.dimensions)
  const galleryImages = artwork.images ?? []
  const collectionHref =
    artwork.status === "available" || artwork.status === "reserved"
      ? "/venda"
      : "/exposicao"
  const collectionLabel = collectionHref === "/venda" ? "Obras à venda" : "Exposição"

  return (
    <article className="pb-12 pt-6 sm:pb-20 sm:pt-10">
      <Container>
        <nav aria-label="Navegação estrutural" className="mb-6">
          <Link
            href={collectionHref}
            className="inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-white transition-colors hover:text-orange-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para {collectionLabel.toLocaleLowerCase("pt-BR")}
          </Link>
        </nav>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)] lg:gap-10">
          <div className="overflow-hidden rounded-4xl bg-white p-3 shadow-sm sm:p-5">
            <div className="relative aspect-4/5 overflow-hidden rounded-[1.5rem] bg-green-secondary/50">
              <Image
                src={urlFor(artwork.image).width(1800).quality(90).url()}
                alt={artwork.image.alt ?? artwork.title}
                fill
                priority
                sizes="(max-width: 1023px) calc(100vw - 2rem), 60vw"
                className="object-contain"
              />
            </div>
          </div>

          <div className="rounded-4xl bg-white p-6 sm:p-8 lg:sticky lg:top-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
              >
                {status.label}
              </span>
              {artwork.catalogNumber && (
                <span className="text-xs uppercase tracking-[0.16em] text-red/45">
                  Cat. {artwork.catalogNumber}
                </span>
              )}
            </div>

            <header className="mt-7 border-b border-red/15 pb-7">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-red sm:text-5xl">
                {artwork.title}
              </h1>
              {artwork.year && (
                <p className="mt-3 text-base font-semibold text-green">
                  {artwork.year}
                </p>
              )}
            </header>

            {(artwork.technique || dimensions) && (
              <dl className="space-y-4 border-b border-red/15 py-7 text-sm sm:text-base">
                {artwork.technique && (
                  <div className="grid grid-cols-[6rem_1fr] gap-4">
                    <dt className="text-red/55">Técnica</dt>
                    <dd className="text-right font-medium text-red/85">
                      {artwork.technique}
                    </dd>
                  </div>
                )}
                {dimensions && (
                  <div className="grid grid-cols-[6rem_1fr] gap-4">
                    <dt className="text-red/55">Dimensões</dt>
                    <dd className="text-right font-medium text-red/85">
                      {dimensions}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            {artwork.description && (
              <section aria-labelledby="descricao-heading" className="py-7">
                <h2
                  id="descricao-heading"
                  className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-red/55"
                >
                  Sobre a obra
                </h2>
                <ExpandableDescription description={artwork.description} />
              </section>
            )}

            {artwork.status === "available" && (
              <div className="rounded-2xl bg-orange-secondary/70 p-5">
                <p className="mb-3 text-sm leading-6 text-red/70">
                  Gostaria de saber mais sobre disponibilidade, valor ou entrega?
                </p>
                <ArtworkInterestButton
                  artworkId={artwork.id}
                  artworkTitle={artwork.title}
                />
              </div>
            )}
          </div>
        </div>

        {galleryImages.length > 0 && (
          <section aria-labelledby="galeria-heading" className="mt-16 sm:mt-20">
            <div className="mb-8 flex items-center gap-3 text-white">
              <Images className="size-6 text-orange-secondary" aria-hidden="true" />
              <h2 id="galeria-heading" className="text-3xl font-semibold tracking-tight">
                Detalhes da obra
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {galleryImages.map((image, index) => (
                <figure
                  key={image._key}
                  className="overflow-hidden rounded-4xl bg-white p-3 sm:p-4"
                >
                  <div className="relative aspect-4/5 overflow-hidden rounded-[1.5rem] bg-green-secondary/50">
                    <Image
                      src={urlFor(image).width(1400).quality(88).url()}
                      alt={image.alt ?? `${artwork.title} — detalhe ${index + 1}`}
                      fill
                      sizes="(max-width: 639px) calc(100vw - 2rem), 50vw"
                      className="object-contain"
                    />
                  </div>
                </figure>
              ))}
            </div>
          </section>
        )}
      </Container>
    </article>
  )
}
