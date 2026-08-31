import type { Metadata } from "next"
import Image from "next/image"
import { ArrowUpRight, Clock3, Mail, MessageCircle } from "lucide-react"

import Container from "@/components/ui/Container"
import { Button } from "@/components/ui/Button"
import sociaLinks from "@/app/socialLinks.json";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Entre em contato com Carmem Silva para conversar sobre obras, exposições e projetos.",
}

const contactLinks = {
  email: sociaLinks.email,
  whatsapp: sociaLinks.whatsapp,
}

const socialLinks = [
  { label: "Instagram", href: sociaLinks.instagram, icon: "/instagram_icon.svg" },
  { label: "Facebook", href: sociaLinks.facebook, icon: "/facebook_icon.svg" },
]
//TODO: atualizar links
export default function ContatoPage() {
  return (
    <div className="overflow-hidden pb-6 pt-6 sm:pt-10">
      <Container>
        <section className="relative overflow-hidden rounded-4xl bg-red px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <div aria-hidden="true" className="absolute -right-24 -top-24 size-72 rounded-full border-34 border-red-secondary/20" />
          <div aria-hidden="true" className="absolute -bottom-20 left-[38%] size-52 rounded-full bg-orange/20 blur-2xl" />

          <div className="relative grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.32em] text-orange-secondary">
                <span className="h-px w-10 bg-orange-secondary" aria-hidden="true" />
                Vamos conversar
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Uma boa conversa também pode virar
                <span className="block text-orange-secondary">obra.</span>
              </h1>
            </div>
            <p className="max-w-lg text-base leading-relaxed text-red-secondary sm:text-lg lg:pb-1">
              Para saber mais sobre uma peça, propor uma exposição ou criar um
              projeto em conjunto, escolha o canal que preferir.
            </p>
          </div>
        </section>

        <section className="relative -mt-1 grid gap-5 py-8 md:pt-5 md:grid-cols-2 lg:-mt-8 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
          <a
            href={contactLinks.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="group relative flex min-h-72 flex-col justify-between overflow-hidden rounded-4xl bg-orange p-7 text-white transition-transform duration-300 hover:-translate-y-1 sm:p-10"
          >
            <div className="flex items-start justify-between">
              <span className="flex size-14 items-center justify-center rounded-full bg-white/15">
                <Image src="/whatsapp-logo-branco.svg" alt="logo do whatsapp" width={28} height={28} />
              </span>
              <ArrowUpRight className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true" />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-orange-secondary">Resposta mais rápida</p>
              <h2 className="text-3xl font-semibold sm:text-4xl">Fale pelo WhatsApp</h2>
              <p className="mt-3 max-w-md text-white/80">Ideal para dúvidas sobre obras disponíveis e atendimento direto.</p>
            </div>
            <div aria-hidden="true" className="absolute -bottom-24 -right-16 size-64 rounded-full border-32 border-white/10" />
          </a>

          <a
            href={contactLinks.email}
            className="group flex min-h-72 flex-col justify-between rounded-4xl bg-green-secondary p-7 text-red transition-transform duration-300 hover:-translate-y-1 sm:p-10"
          >
            <div className="flex items-start justify-between">
              <span className="flex size-14 items-center justify-center rounded-full bg-red text-white">
                <Mail size={25} aria-hidden="true" />
              </span>
              <ArrowUpRight className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true" />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-green">Propostas e projetos</p>
              <h2 className="text-3xl font-semibold">Envie um e-mail</h2>
              <p className="mt-3 break-all text-sm sm:text-base">{sociaLinks.email}</p>
            </div>
          </a>
        </section>

        <section className="grid gap-8 rounded-4xl border border-red/20 bg-white px-6 py-8 text-black sm:px-10 sm:py-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-green">Acompanhe o processo</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-red sm:text-4xl">Arte em movimento.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-black/65">
              Bastidores, novas obras e notícias sobre exposições também estão nas redes sociais.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {socialLinks.map((social) => (
              <Button
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                variant="orange"
                className="group flex items-center justify-between rounded-2xl px-5 py-4"
              >
                <span className="flex items-center gap-3 font-bold">
                  <Image src={social.icon} alt="icone de rede social" width={22} height={22} className="size-5 object-contain" />
                  {social.label}
                </span>
                <ArrowUpRight size={18} className="" aria-hidden="true" />
              </Button>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl bg-red-secondary border border-red/20 px-5 py-4 text-red-hover">
            <Clock3 size={21} aria-hidden="true" />
            <p className="text-sm"><span className="font-semibold">Atendimento</span><span className="ml-2 text-red-hover">Segunda a sexta, horário comercial</span></p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-red-secondary border border-red/20 px-5 py-4 text-red-hover">
            <MessageCircle size={21} aria-hidden="true" />
            <p className="text-sm"><span className="font-semibold">Retorno</span><span className="ml-2 text-red-hover">Assim que possível</span></p>
          </div>
        </div>
      </Container>
    </div>
  )
}
