"use client";

import Link from "next/link"
import Container from "@/components/ui/Container"
import { Button } from "@/components/ui/Button"
import { useEffect, useRef, useState } from "react"
import { Menu, X } from "lucide-react";
import { navItems } from "./navItems";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("mousedown", handleClickOutside)
    };
  }, [isMenuOpen]);

  return (
    <header className="bg-red text-white font-semibold border-b">
      <Container>
        <div className="flex h-20 items-center justify-between">
          <Link href="/#" className="text-xl font-semibold">
            Carmem Silva
          </Link>

          <nav className="hidden md:flex gap-6">
            {navItems.map(({ href, label }) => (
              <Link className="pt-2 px-4 hover:text-orange-secondary" key={href} href={href}>
                {label}
              </Link>
            ))}
            <Button variant="ghostwhite" href="/login"> Login </Button>
          </nav>

          <div ref={menuRef} className="relative md:hidden">
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-md border border-white text-white transition-colors hover:border-red-secondary hover:text-red-secondary"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            {isMenuOpen && (
              <div
                id="mobile-navigation"
                className="absolute right-0 top-full z-10 mt-3 w-64 rounded-md border border-orange bg-white p-3 shadow-lg"
              >
                <div className="flex flex-col items-end gap-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="w-full rounded-md px-3 py-2 text-right text-sm font-semibold text-orange transition-colors hover:bg-orange-secondary hover:text-orange-hover"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </header>
  )
}
