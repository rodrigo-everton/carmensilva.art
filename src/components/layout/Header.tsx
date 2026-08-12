import Link from "next/link"
import Container from "@/components/ui/Container"

export default function Header() {
  return (
    <header className="border-b">
      <Container>
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="text-xl font-semibold">
            Carmen Silva
          </Link>

          <nav className="flex gap-6">
            <Link href="/obras">Obras</Link>
            <Link href="/exposicoes">Exposições</Link>
            <Link href="/sobre">Sobre</Link>
            <Link href="/contato">Contato</Link>
          </nav>
        </div>
      </Container>
    </header>
  )
}