import Container from "@/components/ui/Container"
import { navItems } from "./navItems"
import { Button } from "../ui/Button"
import Image from "next/image";
import socialLinks from "@/app/socialLinks.json";

const linkWhatsapp = socialLinks.whatsapp;
export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white bg-red text-white">
      <Container>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <p className="max-w-sm pt-8 md:border-r pr-8 mb-8">
            Artista plástica e visual maranhense radicada em Brasília, Carmem
            Silva transforma memórias, cores e texturas em uma linguagem
            própria, construída desde as experiências com argila e pigmentos
            naturais às margens do Rio Mearim.
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
              href={linkWhatsapp}
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
          © {new Date().getFullYear()} Carmem Silva
        </div>
      </Container>
    </footer>
  )
}
