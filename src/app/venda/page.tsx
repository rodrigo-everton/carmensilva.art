import type {Metadata} from "next"
import Link from "next/link"
import {AlertCircle, ArrowDownRight, ArrowRight, CircleCheck} from "lucide-react"

import ArtworkGrid from "@/components/artwork/ArtworkGrid"
import Container from "@/components/ui/Container"
import {sanityFetch} from "@/sanity/lib/live"
import {ARTWORKS_QUERY} from "@/sanity/queries/artwork"

export const metadata: Metadata = {
  title: "Obras à venda",
  description:
    "Conheça as obras de Carmem Silva disponíveis para aquisição e entre em contato para saber mais.",
}

type VendaPageProps = {
  searchParams: Promise<{interesse?: string | string[]}>
}

export default async function VendaPage({searchParams}: VendaPageProps) {
  const query = await searchParams
  const interestStatus = Array.isArray(query.interesse)
    ? query.interesse[0]
    : query.interesse
  const {data: saleArtworks} = await sanityFetch({
    query: ARTWORKS_QUERY,
    params: {statuses: ["available", "reserved"]},
    stega: false,
  })

  const availableCount = saleArtworks.filter(
    ({status}) => status === "available",
  ).length

  return (
    <div className="overflow-hidden pb-8 pt-6 sm:pt-10">
      <Container>
        {interestStatus === "indisponivel" && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-red/15 bg-red-secondary px-5 py-4 text-sm font-medium text-red-hover"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Esta obra não está mais disponível para uma nova conversa. Confira a
            seleção atual abaixo.
          </div>
        )}

        {interestStatus === "erro" && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-red/15 bg-red-secondary px-5 py-4 text-sm font-medium text-red-hover"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Não foi possível abrir a conversa agora. Tente novamente em instantes.
          </div>
        )}

        <header className="relative overflow-hidden rounded-4xl bg-red px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <div
            aria-hidden="true"
            className="absolute -right-20 -top-24 size-72 rounded-full border-[2.25rem] border-red-secondary/20"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-28 right-[30%] size-56 rounded-full bg-orange/20"
          />

          <div className="relative grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.32em] text-orange-secondary">
                <span className="h-px w-10 bg-orange-secondary" aria-hidden="true" />
                Obras à venda
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
                Arte para viver
                <span className="block text-orange-secondary">de perto.</span>
              </h1>
            </div>

            <div className="lg:pb-1">
              <p className="max-w-lg text-base leading-relaxed text-red-secondary sm:text-lg">
                Encontre uma obra para fazer parte da sua história. Cada peça
                reúne gesto, cor e matéria em uma composição única.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold">
                <span className="inline-flex items-center gap-2 rounded-full bg-green-secondary px-4 py-2 text-green-hover">
                  <CircleCheck size={17} aria-hidden="true" />
                  {availableCount} {availableCount === 1 ? "disponível" : "disponíveis"}
                </span>
                <span className="rounded-full border border-red-secondary/30 px-4 py-2 text-red-secondary">
                  Peças originais
                </span>
              </div>
            </div>
          </div>
        </header>

        <section aria-labelledby="obras-venda-heading" className="bg-white py-16 sm:py-20 lg:py-24">
          <div className="mb-10 grid gap-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red/70">
                Seleção atual
              </p>
              <ArrowDownRight className="mt-5 size-9 text-orange" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="obras-venda-heading"
                className="text-3xl font-semibold leading-tight tracking-tight text-red sm:text-4xl lg:text-5xl"
              >
                Escolha a obra que conversa com você.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-red/75 sm:text-lg">
                Consulte técnica e dimensões abaixo. Para valores, condições e
                entrega, basta entrar em contato mencionando o título da peça.
              </p>
            </div>
          </div>

          <ArtworkGrid artworks={saleArtworks} showInquiry />
        </section>

        <section className="relative overflow-hidden rounded-4xl bg-orange px-6 py-12 text-white sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:px-14">
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -right-10 size-60 rounded-full border-[1.75rem] border-orange-secondary/30"
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-secondary">
              Atendimento pessoal
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Quer conhecer melhor alguma obra?
            </h2>
            <p className="mt-3 max-w-xl leading-relaxed text-white/80">
              Converse diretamente sobre detalhes, disponibilidade e envio.
            </p>
          </div>
          <Link
            href="/contato"
            className="group relative mt-8 inline-flex h-12 items-center gap-3 rounded-md bg-red px-6 font-semibold text-white transition-colors hover:bg-red-hover lg:mt-0"
          >
            Falar com a artista
            <ArrowRight
              className="transition-transform group-hover:translate-x-1"
              size={19}
              aria-hidden="true"
            />
          </Link>
        </section>
      </Container>
    </div>
  )
}
