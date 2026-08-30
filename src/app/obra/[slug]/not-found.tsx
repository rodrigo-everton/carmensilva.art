import Link from "next/link"

import Container from "@/components/ui/Container"

export default function ArtworkNotFound() {
  return (
    <Container className="py-24 text-center sm:py-32">
      <div className="mx-auto max-w-xl rounded-4xl bg-white px-6 py-14 sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange">
          Obra não encontrada
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-red">
          Esta obra não está disponível neste endereço.
        </h1>
        <p className="mt-4 leading-7 text-red/65">
          O endereço pode ter mudado ou a obra pode ter sido retirada do catálogo.
        </p>
        <Link
          href="/exposicao"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-red px-6 font-semibold text-white transition-colors hover:bg-red-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Ver exposição
        </Link>
      </div>
    </Container>
  )
}
