import "server-only";
import { NextResponse } from "next/server";
import type { Actor, MarketplaceData } from "@/modules/platform/marketplace-store";
import { viewFor } from "@/modules/platform/access/views";
import { actorOf, ConflictError, storeKind } from "./marketplace-service";
import { mpConfig } from "./payments/mercadopago";
import { getSessionAccountId } from "./session";

const NO_STORE = { "Cache-Control": "no-store" };

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/** Resposta padrão: quem está logado e os dados que esse perfil pode ver. */
export function stateResponse(data: MarketplaceData, actor: Actor | null, extra: Record<string, unknown> = {}, status = 200) {
  return json({ me: actor?.id ?? null, store: storeKind(), payments: mpConfig(), data: viewFor(data, actor), ...extra }, status);
}

/** Endereço público do site (Netlify: URL; local: o da requisição). */
export function baseUrl(req: Request): string {
  return (process.env.URL ?? new URL(req.url).origin).replace(/\/$/, "");
}

export async function sessionActor(data: MarketplaceData): Promise<Actor | null> {
  return actorOf(data.accounts, await getSessionAccountId());
}

/**
 * Proteção contra CSRF: alterações só de páginas do próprio site.
 * (O cookie também é SameSite=Lax e as rotas exigem JSON.)
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return null;
  try {
    const body = (await req.json()) as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Erros inesperados viram uma mensagem simples (detalhes só no log do servidor). */
export async function handle(label: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ConflictError) return json({ error: error.message }, 409);
    console.error(`[api] ${label}`, error);
    const quota = /RESOURCE_EXHAUSTED|quota/i.test(String((error as Error)?.message ?? error));
    return json({ error: quota ? "O banco de dados atingiu o limite gratuito de hoje. Tente novamente amanhã." : "Não foi possível acessar o banco de dados agora. Tente de novo em instantes." }, 503);
  }
}
