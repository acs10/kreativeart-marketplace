import type { MarketplaceData } from "./marketplace-store";

/** O que o servidor devolve: quem está logado e os dados que esse perfil pode ver. */
export interface ServerState {
  me: string | null;
  store?: "firestore" | "file";
  /** Mercado Pago: ligado, ambiente de teste e se o designer pode conectar a conta */
  payments?: PaymentsInfo;
  data: MarketplaceData;
}

export interface PaymentsInfo {
  enabled: boolean;
  testMode: boolean;
  oauth: boolean;
}

export type ApiBody = Partial<ServerState> & { error?: string | null; errors?: Record<string, string>; secret?: string; [key: string]: unknown };

export interface ApiResult {
  ok: boolean;
  status: number;
  body: ApiBody;
}

/** Chamada à API do próprio site (cookie de sessão vai junto automaticamente). */
export async function api(path: string, body?: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(path, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as ApiBody;
    return { ok: res.ok, status: res.status, body: json };
  } catch {
    return { ok: false, status: 0, body: { error: "Sem conexão com o servidor. Verifique a internet e tente de novo." } };
  }
}

export const hasState = (b: ApiBody): b is ApiBody & ServerState => !!b.data && "me" in b;
