import Container from "@/components/ui/Container"
import { navItems } from "./navItems"
import { Link } from "lucide-react"
import { Button } from "../ui/Button"
import Image from "next/image";

//TODO: adicionar link para whatsapp
export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white bg-red text-white">
      <Container>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <p className="max-w-sm pt-8 md:border-r pr-8 mb-8">
            descrição da Carmen Silva
          </p>
          <div className="pt-8 flex flex-col gap-6 font-bold mb-8">
            Navegação
            {navItems.map(({ href, label}) => (
              <a className="hover:text-orange-secondary hover:bg-red-hover hover:border rounded-2xl p-1 font-normal" key={href} href={href}>
                {label}
              </a>
            ))}
          </div>
          <div className="pt-8 font-bold mb-8 flex flex-col">
            Atendimento
            <Button 
              variant="orange" 
              className="my-4"
              href="/"
            >
              <Image 
                src="/whatsapp-logo-branco.svg"
                alt="WhatsApp Logo"
                width={18}
                height={18}
                className="size-5 object-contain mr-2"
              />
              WhatsApp
            </Button>
            <p className="text-sm font-normal">
              Contactar por WhatsApp
            </p>
          </div>
        </div>
        <div className="py-10 text-sm border-t">
          © {new Date().getFullYear()} Carmen Silva
        </div>
      </Container>
    </footer>
  )
}