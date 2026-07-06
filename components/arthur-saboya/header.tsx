"use client"

import pmspLogo from "@/public/Logo_pmsp_h.png"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { MunicipeNavAuth } from "@/components/arthur-saboya/municipe-nav-auth"
import { Button } from "@/components/ui/button"

const PUBLIC_HOME = "/portal"

const navLinks = [
  { href: PUBLIC_HOME, label: "Início" },
  { href: "/processos", label: "Processos em Trâmite" },
  { href: "/pre-projetos", label: "Pré-Projetos" },
  { href: "/consulta", label: "Consultar Agendamento" },
]

export function ArthurSaboyaHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Nav links — esquerda */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-[#0A328D]"
            >
              {link.label}
            </Link>
          ))}
          <MunicipeNavAuth />
        </nav>

        {/* Logo — direita */}
        <Link href={PUBLIC_HOME} className="ml-auto md:ml-0">
          <Image
            src={pmspLogo.src}
            alt="Prefeitura de São Paulo"
            width={pmspLogo.width}
            height={pmspLogo.height}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>

        {/* Botão mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <nav className="container mx-auto flex flex-col gap-1 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="px-4 py-2" onClick={() => setIsMenuOpen(false)}>
              <MunicipeNavAuth />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
