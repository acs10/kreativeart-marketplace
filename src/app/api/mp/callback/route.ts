import { NextResponse } from "next/server";
import { baseUrl, sessionActor } from "@/modules/server/api";
import { mutate, readData } from "@/modules/server/marketplace-service";
import { exchangeCode, mpConfig } from "@/modules/server/payments/mercadopago";
import { readState } from "@/modules/server/payments/oauth-state";
import { saveSellerToken } from "@/modules/server/payments/payment-service";

/**
 * Volta da autorização do Mercado Pago: troca o código pelo token do designer (guardado cifrado,
 * só no servidor) e marca a conta como conectada.
 */
export async function GET(req: Request) {
  const base = baseUrl(req);
  const back = (status: string) => NextResponse.redirect(`${base}/designer/perfil?mp=${status}`);
  if (!mpConfig().oauth) return back("indisponivel");
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const designerId = readState(url.searchParams.get("state") ?? "");
  const actor = await sessionActor(await readData()).catch(() => null);
  if (!code || !designerId || actor?.id !== designerId || actor.role !== "designer") return back("erro");
  try {
    const token = await exchangeCode(code, `${base}/api/mp/callback`);
    const info = await saveSellerToken(designerId, token);
    await mutate((m) => m.setMercadoPago(designerId, { userId: info.userId, connectedAt: new Date().toISOString(), expiresAt: info.expiresAt }));
    return back("conectado");
  } catch (error) {
    console.error("[mp] falha ao conectar conta do designer", error);
    return back("erro");
  }
}
