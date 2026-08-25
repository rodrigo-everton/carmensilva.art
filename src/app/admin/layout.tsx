import type { Metadata } from "next"
import { ArrowUpRight, LogOut, PanelsTopLeft } from "lucide-react"
import Link from "next/link"

import { logout } from "@/app/login/actions"
import AdminNav from "@/components/admin/AdminNav"
import Container from "@/components/ui/Container"

export const metadata: Metadata = {
  title: {
    default: "Administração",
    template: "%s | Administração",
  },
  description: "Área administrativa reservada do site de Carmem Silva.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="bg-green-secondary/60 py-5 sm:py-8 lg:py-10">
      <Container>
        <div className="grid min-h-[44rem] overflow-hidden rounded-3xl bg-white shadow-[0_24px_70px_rgba(82,20,38,0.18)] lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="flex flex-col bg-red p-5 text-white sm:p-7">
            <Link
              href="/admin"
              className="mb-6 flex w-fit items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-secondary lg:mb-10"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-orange">
                <PanelsTopLeft className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-orange-secondary">
                  Carmem Silva
                </span>
                <span className="mt-0.5 block font-semibold">Administração</span>
              </span>
            </Link>

            <AdminNav />

            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/15 pt-5 lg:mt-auto lg:block lg:space-y-2">
              <Link
                href="/"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-secondary transition-colors hover:bg-red-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-secondary lg:w-full lg:justify-start"
              >
                Ver site
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>

              <form action={logout} className="flex-1 lg:w-full">
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-red-secondary transition-colors hover:bg-red-hover hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-secondary lg:justify-start"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sair da conta
                </button>
              </form>
            </div>
          </aside>

          <div className="min-w-0 bg-green-secondary/35 p-4 sm:p-7 lg:p-9">
            {children}
          </div>
        </div>
      </Container>
    </div>
  )
}
