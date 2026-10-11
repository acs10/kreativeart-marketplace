import { handle, json, readJson, sameOrigin, sessionActor, stateResponse } from "@/modules/server/api";
import { readData } from "@/modules/server/marketplace-service";
import { mpConfig } from "@/modules/server/payments/mercadopago";
import { syncCharge } from "@/modules/server/payments/payment-service";

/**
 * A tela de pagamento pergunta "já pagou?" a cada poucos segundos: o servidor consulta o
 * Mercado Pago (funciona mesmo sem webhook, ex.: rodando no computador) e atualiza o status.
 */
export async function POST(req: Request) {
  return handle("pix-sync", async () => {
    if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
    if (!mpConfig().enabled) return json({ error: "Pagamento online desligado." }, 404);
    const before = await readData();
    const actor = await sessionActor(before);
    const chargeId = String((await readJson(req))?.chargeId ?? "").slice(0, 40);
    const charge = before.charges.find((c) => c.id === chargeId);
    if (!actor || !charge || (actor.role === "client" && charge.clientId !== actor.id) || actor.role === "designer") return json({ error: "Cobrança não encontrada." }, 404);
    const data = await syncCharge(chargeId);
    return stateResponse(data, actor);
  });
}
