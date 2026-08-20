import ArtworkGrid from "@/components/artwork/ArtworkGrid"
import Container from "@/components/ui/Container"
import {sanityFetch} from "@/sanity/lib/live"
import {ARTWORKS_QUERY} from "@/sanity/queries/artwork"


export default async function Exposicao() {
  const {data: artworks} = await sanityFetch({
    query: ARTWORKS_QUERY,
    stega: false,
  })

  return (
    <Container className="py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-semibold">
          Exposicao
        </h1>

        <p className="mt-4 max-w-xl text-neutral-600">
          Conheça obras disponíveis, vendidas e integrantes
          do acervo da artista.
        </p>
      </div>

      <ArtworkGrid artworks={artworks} />
    </Container>
  )
}
