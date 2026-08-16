import Link from "next/link"
import Container from "@/components/ui/Container"
import { Button } from "@/components/ui/Button"

const navItems = [
  { href: "/venda", label: "Venda" },
  { href: "/exposicao", label: "Exposição" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
]

export default function Header() {
  return (
    <header className="bg-red text-white font-semibold border-b">
      <Container>
        <div className="flex h-20 items-center justify-between">
          <Link href="/#" className="text-xl font-semibold">
            Carmen Silva
          </Link>

          <nav className="flex gap-6">
            {navItems.map(({ href, label }) => (
              <Link className="pt-2 px-4 hover:text-orange-secondary" key={href} href={href}>
                {label}
              </Link>
            ))}
            <Button variant="ghostwhite" href="/login"> Login </Button>
          </nav>
        </div>
      </Container>
    </header>
  )
}
