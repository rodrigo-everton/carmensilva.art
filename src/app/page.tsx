import Hero from "@/app/layout/Hero"
import LocalBusinessJsonLd from "@/components/local-business-json-ld"
import Container from "@/components/ui/Container"
import Link from "next/link"

export default function Home() {
  return (
    <>
      <LocalBusinessJsonLd />
      <Hero />
      <Container className="py-16 sm:py-20">
        <section
          aria-labelledby="arte-heading"
          className="rounded-4xl bg-green-secondary px-6 py-10 sm:px-10 sm:py-14"
        >
          <h2
            id="arte-heading"
            className="max-w-3xl text-3xl font-semibold tracking-tight text-red sm:text-4xl"
          >
            Carmem Silva: arte, cor e memória
          </h2>
          <div className="mt-6 max-w-3xl space-y-5 text-lg leading-relaxed text-red">
            <p>
              A arte de Carmem Silva nasce do encontro entre cor, matéria e
              memória. Maranhense radicada em Brasília, a artista plástica e
              visual desenvolve uma pesquisa de cores, texturas, transparência,
              sombra e luz. Esta galeria reúne caminhos para conhecer suas obras
              e acompanhar sua trajetória artística.
            </p>
            <p>
              Sua relação com a criação começou ainda na infância, às margens do
              Rio Mearim. Ali, moldava bonecos de argila e usava pigmentos naturais
              para pintar suas esculturas. Mais tarde, estudos no Brasil, em
              Washington e em Paris ampliaram seu repertório. Conheça esse
              percurso na página{" "}
              <Link href="/sobre" className="font-semibold underline underline-offset-4">
                sobre a artista
              </Link>.
            </p>
          </div>

          <div className="mt-10 grid gap-10 border-t border-red/20 pt-10 md:grid-cols-2">
            <div>
              <h3 className="text-2xl font-semibold text-red">
                Conheça as obras
              </h3>
              <div className="mt-4 space-y-5 leading-relaxed text-red">
                <p>
                  Uma obra convida a olhar com tempo. Observe as relações entre
                  as cores, os contrastes e as formas de cada composição. A
                  experiência pode começar por um detalhe e abrir espaço para
                  diferentes leituras e lembranças.
                </p>
                <p>
                  Na seção de{" "}
                  <Link href="/venda" className="font-semibold underline underline-offset-4">
                    obras à venda
                  </Link>, você pode explorar os trabalhos apresentados na
                  galeria. Abra a página de uma obra para consultar suas
                  informações. Se quiser saber mais sobre um trabalho, entre em
                  contato para conversar sobre seu interesse.
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-red">
                Exposições e trajetória
              </h3>
              <div className="mt-4 space-y-5 leading-relaxed text-red">
                <p>
                  As exposições também fazem parte da história de Carmem Silva.
                  Seu percurso inclui mostras coletivas e individuais, como
                  União e Colheita, realizadas em Brasília. Esses encontros com
                  o público ajudam a conhecer diferentes momentos de sua
                  produção e de sua pesquisa artística.
                </p>
                <p>
                  Visite a seção de{" "}
                  <Link href="/exposicao" className="font-semibold underline underline-offset-4">
                    exposições
                  </Link>{" "}
                  para acompanhar as mostras apresentadas no site. Para dúvidas
                  sobre as obras ou informações sobre a artista, use a página
                  de{" "}
                  <Link href="/contato" className="font-semibold underline underline-offset-4">
                    contato
                  </Link>. A galeria é um convite para se aproximar dessa
                  trajetória e descobrir novas relações com a arte.
                </p>
              </div>
            </div>
          </div>
        </section>
      </Container>
    </>
  )
}
