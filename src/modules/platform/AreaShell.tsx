"use client";

import { Bell, LogOut, Menu, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { observer } from "@/core/state/mobx";
import { Badge, Button } from "@/core/ui/ui";
import { Logo } from "@/core/ui/Logo";
import { ROLE_LABEL, type Role } from "@/modules/accounts/domain/types";
import { noticesFor } from "@/modules/notifications/notifications";
import { toast } from "sonner";
import { usePlatform } from "./PlatformProvider";

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  count?: number;
}

const TONE = { info: "border-blue-200 bg-blue-50 text-blue-900", warning: "border-amber-200 bg-amber-50 text-amber-900", danger: "border-red-200 bg-red-50 text-red-900", success: "border-green-200 bg-green-50 text-green-900" };

function Notifications() {
  const { market, auth } = usePlatform();
  const [open, setOpen] = useState(false);
  const notices = auth.account ? noticesFor(market, auth.account) : [];
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-label={`Notificações (${notices.length})`} aria-expanded={open}>
        <Bell className="size-5" />
        {notices.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-pink-500 text-[0.65rem] font-bold text-white">{notices.length}</span>}
      </Button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <p className="mb-2 px-1 text-small font-semibold text-gray-800">Avisos</p>
          {notices.length === 0 ? (
            <p className="px-1 py-4 text-center text-small text-gray-500">Tudo em dia por aqui. ✨</p>
          ) : (
            <ul className="space-y-2">
              {notices.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className={`block rounded-lg border px-3 py-2 text-small hover:opacity-80 ${TONE[n.tone]}`}>{n.text}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const SUBTITLE: Record<Role, string> = { client: "Área do cliente", designer: "Área do designer", admin: "Gestão KreativeArt" };

/** Estrutura das áreas logadas: menu lateral, avisos e proteção por perfil. */
export const AreaShell = observer(function AreaShell({ role, nav, children }: { role: Role; nav: NavItem[]; children: ReactNode }) {
  const platform = usePlatform();
  const { auth } = platform;
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const allowed = auth.role === role;
  // Lido na renderização (não dentro do efeito) para os dois valores serem do mesmo momento.
  const hydrated = platform.hydrated;

  useEffect(() => {
    if (hydrated && !allowed) router.replace(`/entrar?perfil=${role}&next=${encodeURIComponent(pathname)}`);
  }, [hydrated, allowed, router, role, pathname]);
  useEffect(() => setMenuOpen(false), [pathname]);

  if (!platform.hydrated || !allowed || !auth.account) return <div className="flex min-h-screen items-center justify-center text-gray-500">Carregando…</div>;

  const logout = async () => {
    await platform.flush(); // termina de gravar o que ainda está indo para o servidor antes de encerrar a sessão
    router.replace("/");
    void auth.logout();
  };
  const reset = async () => {
    if (!window.confirm("Restaurar os dados demonstrativos no banco? Pedidos, cadastros e alterações feitos por todos os usuários serão apagados.")) return;
    const err = await platform.resetDemo();
    if (err) return void toast.error(err);
    toast.success("Demonstração restaurada. Entre novamente.");
    router.replace("/entrar");
  };
  const home = nav[0].href;

  const links = (
    <nav aria-label="Menu da área" className="space-y-1">
      {nav.map((item) => {
        const active = item.href === home ? pathname === home : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-small font-medium transition-colors ${active ? "brand-gradient text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.count ? <span className={`rounded-full px-2 text-caption font-bold ${active ? "bg-white/25" : "bg-pink-100 text-pink-700"}`}>{item.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href={home} className="border-b border-gray-100 p-5"><Logo subtitle={SUBTITLE[role]} /></Link>
        <div className="flex-1 overflow-y-auto p-3">{links}</div>
        <div className="space-y-1 border-t border-gray-100 p-3">
          <Link href="/" className="block rounded-lg px-3 py-2 text-caption text-gray-500 hover:bg-gray-100">← Site da KreativeArt</Link>
          {role === "admin" && (
            <button onClick={reset} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-caption text-gray-500 hover:bg-gray-100"><RotateCcw className="size-3.5" /> Restaurar demonstração</button>
          )}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="ghost" size="sm" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu className="size-5" /></Button>
            <Link href={home}><Logo subtitle={SUBTITLE[role]} className="scale-90" /></Link>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Notifications />
            <div className="hidden text-right sm:block">
              <p className="text-small font-semibold leading-tight">{auth.actor?.name}</p>
              <p className="text-caption text-gray-500">
                {ROLE_LABEL[role]}
                {auth.account.status === "pending" && <Badge className="ml-1 bg-amber-100 text-amber-800">em análise</Badge>}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => void logout()}><LogOut className="size-4" /> <span className="hidden sm:inline">Sair</span></Button>
          </div>
        </header>

        {platform.syncError && <p role="alert" className="bg-orange-100 px-4 py-2 text-center text-small text-orange-800">⚠️ {platform.syncError}</p>}
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="h-full w-72 max-w-[85vw] overflow-y-auto bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <Logo subtitle={SUBTITLE[role]} />
              <Button variant="ghost" size="sm" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X className="size-5" /></Button>
            </div>
            {links}
            <Link href="/" className="mt-4 block rounded-lg px-3 py-2 text-caption text-gray-500">← Site da KreativeArt</Link>
            {role === "admin" && <button onClick={reset} className="mt-1 block px-3 py-2 text-caption text-gray-500">Restaurar demonstração</button>}
          </div>
        </div>
      )}
    </div>
  );
});
