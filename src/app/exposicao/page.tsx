import type {Metadata} from "next"
import Link from "next/link"
import {ChevronRight} from "lucide-react"

import ArtworkGrid from "@/components/artwork/ArtworkGrid"
import Container from "@/components/ui/Container"
import {sanityFetch} from "@/sanity/lib/live"
import {ARTWORKS_QUERY} from "@/sanity/queries/artwork"

export const metadata: Metadata = {
  title: "Exposição",
  description:
    "Conheça as obras de Carmem Silva disponíveis, vendidas e integrantes do acervo da artista.",
}

export default async function Exposicao() {
  const {data: artworks} = await sanityFetch({
    query: ARTWORKS_QUERY,
    stega: false,
  })

  return (
    <div className="mb-[-5rem] min-h-screen pb-40">
      {/* <div className="border-b border-stone-200 bg-white">
        <Container className="py-4">
          <nav aria-label="Navegação estrutural" className="flex items-center gap-2 text-sm text-stone-500">
            <Link href="/" className="transition-colors hover:text-stone-900">
              Início
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page" className="text-stone-700">
              Exposição
            </span>
          </nav>
        </Container>
      </div> */}

      <Container>
        <header className="grid gap-8 border-b bg-orange border-orange border-2 rounded-2xl mt-8 py-14 sm:py-20 lg:grid-cols-2 lg:items-end lg:justify-evenly lg:gap-1 lg:pb-10">
          <div className="mx-6 md:ml-6">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-red-hover">
              Acervo da artista
            </p>
            <h1 className="text-5xl font-semibold tracking-[-0.035em] text-white sm:text-6xl lg:text-7xl">
              Exposição
            </h1>
          </div>

          <div className="mx-6 md:mr-8 lg:pb-1 bg-red border-red border-2 rounded-2xl p-4 text-white">
            <p className="max-w-xl text-base leading-7 sm:text-lg sm:leading-8">
              Uma seleção de obras que percorre diferentes momentos da
              produção de Carmem Silva, reunindo trabalhos disponíveis,
              vendidos e pertencentes ao acervo.
            </p>
            <p className="mt-5 text-sm font-semibold bg-green-secondary border-green-secondary border-2 rounded-2xl p-2 mb-4 text-red-hover">
              {artworks.length} {artworks.length === 1 ? "obra catalogada" : "obras catalogadas"}
            </p>
          </div>
        </header>

        <section aria-labelledby="obras-heading" className="pt-12 sm:pt-16">
          <div className="mb-8 flex flex-col gap-3 bg-red-secondary border-red-secondary border-2 rounded-2xl py-6 px-10 sm:px-0 sm:flex-row sm:items-end sm:justify-evenly">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Catálogo
              </p>
              <h2 id="obras-heading" className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Obras
              </h2>
            </div>
            <p className="max-w-md leading-6 text-red-hover font-semibold">
              Consulte a situação, a técnica e as dimensões de cada trabalho.
            </p>
          </div>

          <ArtworkGrid artworks={artworks} />
        </section>
      </Container>
    </div>
  )
}
