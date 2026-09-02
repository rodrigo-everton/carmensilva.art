import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowDownRight,
  ArrowRight,
  Award,
  BookOpen,
  GraduationCap,
  Landmark,
  MapPin,
} from "lucide-react"

import Container from "@/components/ui/Container"

export const metadata: Metadata = {
  title: "Sobre Carmem Silva",
  description:
    "Conheça a trajetória de Carmem Silva, artista plástica e visual maranhense radicada em Brasília, sua formação, exposições e reconhecimentos.",
}

const exhibitions = [
  {
    year: "2002",
    title: "Arte e Cultura em Alto Mar",
    description:
      "Exposição trinacional a bordo do transatlântico Costa Classica, em roteiro por Santos, Rio de Janeiro, Buenos Aires, Punta del Este e Porto Belo.",
  },
  {
    year: "2002",
    title: "Galeria Sesc",
    description: "Participação em exposição coletiva realizada em Brasília, em junho.",
  },
  {
    year: "2002",
    title: "Projeto Integração Brasil",
    description:
      "Participação na etapa de Salvador, no foyer do Teatro da Casa do Comércio, de 24 de setembro a 8 de outubro.",
  },
  {
    year: "2003",
    title: "União",
    description:
      "Mostra no Espaço Cultural do Shopping Pátio Brasil, em Brasília, com obras em técnicas variadas, cores fortes e vibrantes.",
  },
  {
    year: "2004",
    title: "Colheita",
    description:
      "Exposição individual no foyer da Sala Villa-Lobos, no Teatro Nacional Cláudio Santoro, em Brasília, de 4 a 17 de novembro.",
  },
]

const techniques = [
  "Textura",
  "Sombra e luz",
  "Planejamento",
  "Transparência",
  "Figura humana",
  "Estudo de cores",
  "Carvão",
  "Sépia e sanguínea",
  "Lápis aquarelado",
  "Aquarela",
  "Acrílico sobre tela",
  "Técnicas mistas",
]

export default function SobrePage() {
  return (
    <div className="overflow-hidden pb-20 pt-6 sm:pt-10">
      <Container>
        <section className="grid overflow-hidden rounded-[2rem] bg-orange text-white lg:min-h-[38rem] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative z-10 flex flex-col justify-between px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.32em] text-orange-secondary">
              <span className="h-px w-10 bg-orange-secondary" aria-hidden="true" />
              Artista plástica e visual
            </p>

            <div className="mt-16 lg:mt-28">
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
                Carmem
                <span className="block text-red-hover">Silva.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl">
                Maria do Carmo Cruz da Silva, maranhense radicada em Brasília,
                construiu uma trajetória marcada pela pesquisa de cores,
                texturas, transparência, sombra e luz.
              </p>
              <p className="mt-6 flex items-center gap-2 text-sm font-semibold text-orange-secondary">
                <MapPin size={18} aria-hidden="true" />
                São Mateus, MA · Brasília, DF
              </p>
            </div>
          </div>

          <div className="relative min-h-[32rem] overflow-hidden bg-red lg:min-h-full">
            <Image
              src="/retrato.webp"
              alt="Retrato de Carmem Silva"
              width={844}
              height={1019}
              sizes="(max-width: 1023px) 100vw, 46vw"
              preload
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-red/90 via-red/35 to-transparent px-6 pb-7 pt-24 sm:px-10 sm:pb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                Sensibilidade · Originalidade · Expressão
              </p>
            </div>
          </div>
        </section>

        <section className="my-16 grid gap-10 rounded-4xl bg-green-secondary px-6 py-14 sm:px-10 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-14 lg:py-24">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red/70">
              Perfil e trajetória
            </p>
            <ArrowDownRight className="mt-5 size-10 text-orange" aria-hidden="true" />
          </div>

          <div>
            <h2 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-red sm:text-4xl lg:text-5xl">
              Das margens do Rio Mearim à construção de uma linguagem própria.
            </h2>
            <div className="mt-10 grid gap-6 text-base leading-relaxed text-red/75 sm:grid-cols-2 sm:text-lg">
              <p>
                Carmem descobriu cedo o talento manual. Ainda no Maranhão,
                moldava bonecos de argila às margens do Rio Mearim e transformava
                pigmentos naturais em tinta para suas esculturas.
              </p>
              <p>
                O interesse pela matéria e pela cor acompanhou toda a sua
                formação. Estudos no Brasil, em Washington e em Paris ampliaram
                seu repertório e consolidaram sua expressão no cenário artístico
                nacional.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="formacao-heading">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red/70">
                Formação e aperfeiçoamento
              </p>
              <h2 id="formacao-heading" className="mt-3 text-3xl font-semibold tracking-tight text-red sm:text-4xl">
                Uma formação construída entre lugares e técnicas
              </h2>
            </div>
            <span className="hidden h-px flex-1 bg-red/20 sm:block" aria-hidden="true" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <article className="flex min-h-80 flex-col justify-between rounded-[2rem] bg-red p-7 text-white sm:p-9">
              <div className="flex items-start justify-between">
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/65">
                  Percurso internacional
                </span>
                <Landmark size={28} strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-3xl font-semibold sm:text-4xl">
                  Washington e Paris
                </h3>
                <p className="mt-4 max-w-md leading-relaxed text-white/80">
                  Cinco anos de aprimoramento artístico nos Estados Unidos e na
                  França, em contato com novos repertórios e modos de fazer.
                </p>
              </div>
            </article>

            <article className="rounded-[2rem] bg-orange-secondary p-7 text-red sm:p-9">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red/65">
                    1997—2002
                  </p>
                  <h3 className="mt-4 text-3xl font-semibold sm:text-4xl">
                    Escola Integrada de Artes Liberarte
                  </h3>
                  <p className="mt-4 max-w-2xl leading-relaxed text-red/75">
                    Cursos ministrados pela professora Déia Francischetti,
                    abrangendo fundamentos do desenho, da pintura e da composição.
                  </p>
                </div>
                <GraduationCap className="shrink-0" size={30} strokeWidth={1.6} aria-hidden="true" />
              </div>
              <ul className="mt-8 flex flex-wrap gap-2" aria-label="Técnicas estudadas">
                {techniques.map((technique) => (
                  <li
                    key={technique}
                    className="rounded-full border border-red/20 bg-white/45 px-3 py-1.5 text-sm font-medium"
                  >
                    {technique}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="mt-20 rounded-4xl bg-red-secondary px-6 py-14 sm:px-10 sm:py-20" aria-labelledby="exposicoes-heading">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red/70">
                Exposições de destaque
              </p>
              <h2 id="exposicoes-heading" className="mt-3 text-3xl font-semibold tracking-tight text-red sm:text-4xl">
                Uma trajetória em movimento
              </h2>
              <p className="mt-5 max-w-sm leading-relaxed text-red/70">
                Mostras individuais e coletivas levaram sua produção a galerias,
                espaços culturais e a uma exposição trinacional em alto-mar.
              </p>
            </div>

            <ol className="border-t border-red/25">
              {exhibitions.map((exhibition) => (
                <li
                  key={`${exhibition.year}-${exhibition.title}`}
                  className="grid gap-3 border-b border-red/25 py-7 sm:grid-cols-[5rem_1fr] sm:gap-6"
                >
                  <p className="text-sm font-semibold tracking-[0.15em] text-orange">
                    {exhibition.year}
                  </p>
                  <div>
                    <h3 className="text-xl font-semibold text-red sm:text-2xl">
                      {exhibition.title}
                    </h3>
                    <p className="mt-2 max-w-2xl leading-relaxed text-red/70">
                      {exhibition.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-20 grid gap-5 lg:grid-cols-2" aria-label="Reconhecimento e publicações">
          <article className="rounded-[2rem] bg-orange px-7 py-10 text-white sm:px-10 sm:py-12">
            <Award size={32} strokeWidth={1.6} aria-hidden="true" />
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.3em] text-orange-secondary">
              Reconhecimento
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Arte reconhecida oficialmente
            </h2>
            <div className="mt-7 space-y-5 leading-relaxed text-white/85">
              <p>
                Cadastrada sob o nº 075 no Cadastro de Artistas Plásticos
                Profissionais do Distrito Federal, com certidão emitida em 2004.
              </p>
              <p>
                Titulada na Ordem do Mérito das Artes Plásticas, recebeu em 2006
                a Medalha ao Mérito Artístico Cultural por sua contribuição às
                artes e à cultura nacional, além de medalhas comemorativas e
                menções honrosas.
              </p>
            </div>
          </article>

          <article className="rounded-[2rem] bg-white px-7 py-10 text-red sm:px-10 sm:py-12">
            <BookOpen size={32} strokeWidth={1.6} aria-hidden="true" />
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.3em] text-green">
              Publicações
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Presença nos anuários de artes plásticas
            </h2>
            <div className="mt-7 space-y-5 leading-relaxed text-red/75">
              <p>
                O volume VI do <em>Anuário Brasileiro de Artes Plásticas</em>
                publicou seu perfil biográfico e uma obra marcada pela pesquisa
                de textura e cor em acrílica e pigmentos.
              </p>
              <p>
                No volume IX, a artista voltou a integrar a publicação, com
                destaque para a obra <em>Sol</em>, em acrílica sobre tela.
              </p>
            </div>
          </article>
        </section>

        <section className="relative mt-20 overflow-hidden rounded-[2rem] bg-red px-6 py-12 text-white sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:px-14">
          <div aria-hidden="true" className="absolute -bottom-20 -right-10 size-60 rounded-full border-[28px] border-orange-secondary/35" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-secondary">
              Continue explorando
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Conheça essa trajetória através das obras.
            </h2>
          </div>
          <Link
            href="/exposicao"
            className="group relative mt-8 inline-flex h-12 items-center gap-3 rounded-md bg-orange px-6 font-semibold text-white transition-colors hover:bg-orange-hover lg:mt-0"
          >
            Ver trabalhos
            <ArrowRight className="transition-transform group-hover:translate-x-1" size={19} aria-hidden="true" />
          </Link>
        </section>
      </Container>
    </div>
  )
}
