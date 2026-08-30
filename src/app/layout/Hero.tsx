import Container from "@/components/ui/Container"
import { Button } from "@/components/ui/Button"
import Image from "next/image"

//TODO: adicionar carrossel e imagens
export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden mx-4 mt-6 md:mx-16 md:my-8 bg-orange border-orange rounded-4xl text-white">
      <div
        aria-hidden="true"
        className="absolute -left-24 top-20 size-72 rounded-full bg-green-secondary/20 blur-3xl"
      />

      <Container className="grid min-h-[calc(100svh-5rem)] items-center gap-14 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24 lg:gap-24">
        <div className="relative z-10">
          <p className="mb-5 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-orange-secondary">
            <span className="h-px w-10 bg-orange" aria-hidden="true" />
            Artista visual
          </p>

          <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-8xl">
            Arte que nasce da
            <span className="block text-white-hover">cor e da memória.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-orange-secondary md:text-xl">
            Conheça as obras, exposições e a trajetória artística de Carmem
            Silva.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button variant="white" size="lg" href="/venda">
              Conhecer obras
            </Button>
            <Button variant="ghostwhite" size="lg" href="/sobre">
              Sobre a artista
            </Button>
          </div>
        </div>
        
        <div className="relative mx-auto w-full max-w-md md:max-w-none" aria-hidden="true">
          {/* <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-orange-secondary/50" />
          <div className="absolute -bottom-7 -left-7 z-20 h-28 w-28 bg-orange" /> */}

          <Image
            src="/retrato.webp"
            alt=""
            width={844}
            height={1019}
          />

          <p className="mt-5 text-right text-xs font-semibold uppercase tracking-[0.25em] text-orange-secondary">
            Cor · Forma · Expressão
          </p>
        </div>
      </Container>
    </section>
  )
}
