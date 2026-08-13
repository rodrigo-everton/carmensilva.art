import Link from "next/link"

import Container from "@/components/ui/Container"

export default function Home() {
  return (
    <>
      <section>
        <Container className="flex min-h-[70vh] items-center">
          <div>
            <p className="mb-4 text-sm uppercase tracking-widest">
              Artista visual
            </p>

            <h1 className="max-w-3xl text-5xl font-semibold md:text-7xl">
              Carmen Silva
            </h1>

            <p className="mt-6 max-w-xl text-lg">
              Obras, exposições e trajetória artística.
            </p>

            <div className="mt-8">
              <Link
                href="/obras"
                className="inline-block border px-6 py-3"
              >
                Conhecer obras
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}