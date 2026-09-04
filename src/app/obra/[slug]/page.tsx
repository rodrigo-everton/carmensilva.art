import type {Metadata} from "next"
import Image from "next/image"
import Link from "next/link"
import {ArrowLeft} from "lucide-react"
import {notFound} from "next/navigation"
import {cache} from "react"

import ArtworkCarousel, {
  type ArtworkCarouselImage,
} from "@/components/artwork/ArtworkCarousel"
import ArtworkInterestButton from "@/components/artwork/ArtworkInterestButton"
import ExpandableDescription from "@/components/artwork/ExpandableDescription"
import Container from "@/components/ui/Container"
import {
  artworkArtistName,
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
  const mainImageUrl = urlFor(artwork.image).width(1800).quality(90).url()
  const carouselImages: ArtworkCarouselImage[] = [
    {
      id: "main-image",
      src: mainImageUrl,
      alt: artwork.image.alt ?? artwork.title,
    },
    ...galleryImages.map((image, index) => ({
      id: `gallery-${image._key}`,
      src: urlFor(image).width(1800).quality(90).url(),
      alt: image.alt ?? `${artwork.title} — detalhe ${index + 1}`,
    })),
  ]
  const carouselStructureKey = carouselImages.map(({id}) => id).join(":")
  const collectionHref =
    artwork.status === "available" || artwork.status === "reserved"
      ? "/venda"
      : "/exposicao"
  const collectionLabel = collectionHref === "/venda" ? "Obras à venda" : "Acervo"

  return (
    <article className="bg-white pb-12 pt-6 sm:pb-20 sm:pt-10">
      <Container>
        <nav aria-label="Navegação estrutural" className="mb-6">
          <Link
            href={collectionHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-green px-5 text-sm font-semibold text-white transition-colors hover:bg-green-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para {collectionLabel.toLocaleLowerCase("pt-BR")}
          </Link>
        </nav>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)] lg:gap-10">
          <div className="overflow-hidden rounded-4xl bg-white p-3 shadow-sm sm:p-5">
            {galleryImages.length > 0 ? (
              <ArtworkCarousel
                key={carouselStructureKey}
                images={carouselImages}
                title={artwork.title}
              />
            ) : (
              <div className="relative aspect-4/5 overflow-hidden rounded-[1.5rem] bg-green-secondary/50">
                <Image
                  src={mainImageUrl}
                  alt={artwork.image.alt ?? artwork.title}
                  fill
                  preload
                  sizes="(max-width: 639px) calc(100vw - 3.5rem), (max-width: 1023px) calc(100vw - 5.5rem), (max-width: 1279px) 58vw, 46rem"
                  className="object-contain"
                />
              </div>
            )}
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

            <dl className="mt-7 divide-y divide-red/15 border-b border-red/15 text-sm sm:text-base">
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 pb-4">
                <dt className="text-red/55">Artista:</dt>
                <dd className="text-right font-medium text-red/85">
                  {artworkArtistName}
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-4 py-5">
                <dt className="pt-1 text-red/55">Título:</dt>
                <dd>
                  <h1 className="text-right text-4xl font-semibold leading-tight tracking-tight text-red sm:text-5xl">
                    {artwork.title}
                  </h1>
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-4">
                <dt className="text-red/55">Ano:</dt>
                <dd className="text-right font-semibold text-green">
                  {artwork.year ?? "—"}
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-4">
                <dt className="text-red/55">Técnica:</dt>
                <dd className="text-right font-medium text-red/85">
                  {artwork.technique || "—"}
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-4">
                <dt className="text-red/55">Dimensões:</dt>
                <dd className="text-right font-medium text-red/85">
                  {dimensions ?? "—"}
                </dd>
              </div>
            </dl>

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
      </Container>
    </article>
  )
}
