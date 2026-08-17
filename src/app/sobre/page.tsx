import type { Metadata } from "next"
import { ArrowDownRight, ArrowRight, Eye, Layers3, Palette } from "lucide-react"

import Container from "@/components/ui/Container"

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Conheça Carmen Silva, sua pesquisa artística e o universo de cor, forma e memória presente em suas obras.",
}

const pillars = [
  {
    number: "01",
    title: "Cor",
    description:
      "A cor não apenas preenche: ela cria temperatura, ritmo e conduz o olhar.",
    icon: Palette,
    className: "bg-orange text-white",
  },
  {
    number: "02",
    title: "Memória",
    description:
      "Fragmentos, afetos e lembranças se transformam em novas paisagens visuais.",
    icon: Eye,
    className: "bg-green-secondary text-red",
  },
  {
    number: "03",
    title: "Matéria",
    description:
      "Camadas, gestos e texturas guardam as marcas do processo de criação.",
    icon: Layers3,
    className: "bg-red text-white",
  },
]

export default function SobrePage() {
  return (
    <div className="overflow-hidden pb-8 pt-6 sm:pt-10">
      <Container>
        <section className="relative grid min-h-[34rem] overflow-hidden rounded-[2rem] bg-orange text-white lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10 flex flex-col justify-between px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.32em] text-orange-secondary">
              <span className="h-px w-10 bg-orange-secondary" aria-hidden="true" />
              Sobre a artista
            </p>

            <div className="mt-16 lg:mt-28">
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
                Carmen
                <span className="block text-red-hover">Silva.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
                Uma prática artística guiada pela cor, pela memória e pelas
                possibilidades de transformar sensações em imagem.
              </p>
            </div>
          </div>

          <div className="relative min-h-96 overflow-hidden bg-red" aria-hidden="true">
            <div className="absolute -left-[8%] top-[8%] size-[62%] rounded-full bg-orange-secondary" />
            <div className="absolute -right-[14%] top-[10%] h-[82%] w-[64%] rotate-12 rounded-full bg-green-secondary" />
            <div className="absolute bottom-[5%] left-[8%] h-[52%] w-[32%] -rotate-12 bg-red-hover" />
            <div className="absolute bottom-[8%] right-[6%] size-[38%] rounded-full border-[18px] border-white/80" />
            <div className="absolute left-[16%] top-[38%] size-20 bg-orange sm:size-28" />
            <p className="absolute bottom-6 left-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 sm:bottom-10 sm:left-10">
              Cor · Forma · Expressão
            </p>
          </div>
        </section>

        <section className="grid gap-10 py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red/70">
              O olhar
            </p>
            <ArrowDownRight className="mt-5 size-10 text-orange" aria-hidden="true" />
          </div>

          <div>
            <h2 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-red sm:text-4xl lg:text-5xl">
              Pintar é encontrar uma linguagem para aquilo que nem sempre cabe
              em palavras.
            </h2>
            <div className="mt-10 grid gap-6 text-base leading-relaxed text-red/75 sm:grid-cols-2 sm:text-lg">
              <p>
                O trabalho de Carmen Silva parte da observação e da experiência.
                Cada obra nasce de um encontro entre intenção e descoberta, em
                um processo aberto ao inesperado.
              </p>
              <p>
                Formas orgânicas, contrastes e sobreposições constroem imagens
                que convidam a uma pausa — e permitem que cada pessoa encontre
                nelas a sua própria leitura.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red/70">
                Pesquisa artística
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-red sm:text-4xl">
                Três pontos de partida
              </h2>
            </div>
            <span className="hidden h-px flex-1 bg-red/20 sm:block" aria-hidden="true" />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {pillars.map(({ number, title, description, icon: Icon, className }) => (
              <article
                key={number}
                className={`flex min-h-80 flex-col justify-between rounded-[2rem] p-7 sm:p-9 ${className}`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-semibold tracking-[0.2em] opacity-65">
                    {number}
                  </span>
                  <Icon size={26} strokeWidth={1.6} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-4xl font-semibold">{title}</h3>
                  <p className="mt-4 max-w-sm leading-relaxed opacity-80">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="relative mt-20 overflow-hidden rounded-[2rem] bg-white px-6 py-12 text-red sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:px-14">
          <div aria-hidden="true" className="absolute -bottom-20 -right-10 size-60 rounded-full border-[28px] border-orange-secondary/60" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-green">
              Continue explorando
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Conheça a pesquisa através das obras.
            </h2>
          </div>
          <a
            href="/exposicao"
            className="group relative mt-8 inline-flex h-12 items-center gap-3 rounded-md bg-red px-6 font-semibold text-white transition-colors hover:bg-red-hover lg:mt-0"
          >
            Ver trabalhos
            <ArrowRight className="transition-transform group-hover:translate-x-1" size={19} aria-hidden="true" />
          </a>
        </section>
      </Container>
    </div>
  )
}
