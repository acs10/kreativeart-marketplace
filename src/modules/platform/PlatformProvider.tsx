"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import "@/core/state/mobx";
import type { ServerState } from "./api-client";
import { PlatformStore } from "./platform-store";

const PlatformContext = createContext<PlatformStore | null>(null);

/** Atualiza ao voltar para a aba e a cada minuto (outros usuários podem ter mudado algo). */
const REFRESH_MS = 60_000;

export function PlatformProvider({ initial, children }: { initial: ServerState | null; children: ReactNode }) {
  const [platform] = useState(() => new PlatformStore(initial));
  useEffect(() => {
    if (!platform.hydrated) void platform.refresh();
    const refresh = () => {
      if (document.visibilityState === "visible" && platform.pending === 0) void platform.refresh();
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    // Avisa antes de sair da página com alterações ainda indo para o servidor.
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (platform.pending > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [platform]);
  return (
    <PlatformContext.Provider value={platform}>
      {children}
      <Toaster richColors position="top-right" />
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformStore {
  const platform = useContext(PlatformContext);
  if (!platform) throw new Error("usePlatform precisa estar dentro de <PlatformProvider>.");
  return platform;
}

/** Atalhos usados por quase todas as telas. */
export function useMarket() {
  return usePlatform().market;
}
