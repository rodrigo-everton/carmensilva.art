"use client"

import {
  LayoutDashboard,
  MessageSquareText,
  Palette,
  ShoppingBag,
  UsersRound,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const adminLinks = [
  {
    href: "/admin",
    label: "Visão geral",
    icon: LayoutDashboard,
  },
  {
    href: "/studio",
    label: "Obras",
    icon: Palette,
  },
  {
    href: "/admin/venda",
    label: "Vendas",
    icon: ShoppingBag,
  },
  {
    href: "/admin/mensagem",
    label: "Mensagens",
    icon: MessageSquareText,
  },
  {
    href: "/admin/cliente",
    label: "Clientes",
    icon: UsersRound,
  },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Navegação administrativa">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:flex lg:flex-col">
        {adminLinks.map(({ href, label, icon: Icon }) => {
          const isActive = isActivePath(pathname, href)

          return (
            <Link
              key={href}
              href={href}
              prefetch={href === "/studio" ? false : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-secondary sm:justify-center lg:justify-start ${
                isActive
                  ? "bg-white text-red shadow-sm"
                  : "text-red-secondary hover:bg-red-hover hover:text-white"
              }`}
            >
              <Icon className="size-5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
