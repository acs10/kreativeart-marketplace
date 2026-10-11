import { NextResponse } from "next/server";
import { baseUrl, sessionActor } from "@/modules/server/api";
import { readData } from "@/modules/server/marketplace-service";
import { authorizationUrl, mpConfig } from "@/modules/server/payments/mercadopago";
import { createState } from "@/modules/server/payments/oauth-state";

/** Designer clica em "Conectar Mercado Pago": vai para a tela de autorização do Mercado Pago. */
export async function GET(req: Request) {
  const base = baseUrl(req);
  if (!mpConfig().oauth) return NextResponse.redirect(`${base}/designer/perfil?mp=indisponivel`);
  const actor = await sessionActor(await readData()).catch(() => null);
  if (actor?.role !== "designer") return NextResponse.redirect(`${base}/entrar?perfil=designer`);
  return NextResponse.redirect(authorizationUrl(createState(actor.id), `${base}/api/mp/callback`));
}
