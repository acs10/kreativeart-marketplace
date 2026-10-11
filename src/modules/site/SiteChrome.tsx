"use client";

import { LayoutDashboard, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { observer } from "@/core/state/mobx";
import { Logo } from "@/core/ui/Logo";
import { ROLE_HOME } from "@/modules/accounts/domain/types";
import { usePlatform } from "@/modules/platform/PlatformProvider";

const NAV = [
  { href: "/servicos", label: "Serviços" },
  { href: "/planos", label: "Planos" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/designers", label: "Para designers" },
];

export const SiteHeader = observer(function SiteHeader() {
  const { auth, hydrated } = usePlatform();
  const [open, setOpen] = useState(false);
  const logged = hydrated && auth.role;
  const areaButtons = logged ? (
    <Link href={ROLE_HOME[auth.role!]} className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-small font-semibold text-white">
      <LayoutDashboard className="size-4" /> Minha área
    </Link>
  ) : (
    <>
      <Link href="/entrar?perfil=designer" className="rounded-lg px-3 py-2 text-small font-semibold text-gray-700 hover:bg-gray-100">Área do designer</Link>
      <Link href="/entrar?perfil=client" className="brand-gradient rounded-lg px-4 py-2 text-small font-semibold text-white">Área do cliente</Link>
    </>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="KreativeArt — início"><Logo subtitle="Design sob demanda" /></Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-small font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">{n.label}</Link>)}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">{areaButtons}</div>
        <button className="rounded-lg p-2 text-gray-700 sm:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>{open ? <X className="size-6" /> : <Menu className="size-6" />}</button>
      </div>
      {open && (
        <div className="space-y-1 border-t border-gray-100 bg-white px-4 py-3 sm:hidden">
          {NAV.map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 font-medium text-gray-700">{n.label}</Link>)}
          <div className="flex flex-col gap-2 pt-2">{areaButtons}</div>
        </div>
      )}
      <nav aria-label="Principal (tablet)" className="hidden gap-1 overflow-x-auto px-4 pb-2 sm:flex lg:hidden">
        {NAV.map((n) => <Link key={n.href} href={n.href} className="flex-shrink-0 rounded-lg px-3 py-1.5 text-small font-medium text-gray-600 hover:bg-gray-100">{n.label}</Link>)}
      </nav>
    </header>
  );
});

export const SiteFooter = observer(function SiteFooter() {
  const { market } = usePlatform();
  const s = market.settings;
  return (
    <footer className="mt-20 bg-gray-950 text-gray-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="mb-3 inline-block rounded-xl bg-white px-3 py-2"><Logo subtitle="Design sob demanda" /></div>
          <p className="max-w-md text-small text-gray-400">Plataforma que conecta empresas a designers selecionados. Você contrata, acompanha e aprova tudo num só lugar.</p>
        </div>
        <div>
          <h3 className="mb-3 text-small font-semibold uppercase tracking-wider text-gray-500">Plataforma</h3>
          <ul className="space-y-2 text-small">
            <li><Link href="/servicos" className="hover:text-white">Serviços</Link></li>
            <li><Link href="/planos" className="hover:text-white">Planos mensais</Link></li>
            <li><Link href="/designers" className="hover:text-white">Seja um designer</Link></li>
            <li><Link href="/entrar" className="hover:text-white">Entrar</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-small font-semibold uppercase tracking-wider text-gray-500">Contato</h3>
          <ul className="space-y-2 text-small text-gray-400">
            <li>{s.email}</li>
            <li>{s.phone}</li>
            <li>{s.city}</li>
            <li>Instagram {s.instagram}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 px-4 py-4 text-center text-caption text-gray-500">
        © {new Date().getFullYear()} {s.companyName} · CNPJ {s.cnpj} · Dados demonstrativos
      </div>
    </footer>
  );
});

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
