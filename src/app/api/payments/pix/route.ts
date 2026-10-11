import { baseUrl, handle, json, readJson, sameOrigin, sessionActor, stateResponse } from "@/modules/server/api";
import { readData } from "@/modules/server/marketplace-service";
import { mpConfig } from "@/modules/server/payments/mercadopago";
import { startPix } from "@/modules/server/payments/payment-service";

/** Cliente gera o PIX (QR Code + copia e cola) de uma cobrança: { chargeId }. */
export async function POST(req: Request) {
  return handle("pix", async () => {
    if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
    if (!mpConfig().enabled) return json({ error: "Pagamento online desligado." }, 404);
    const actor = await sessionActor(await readData());
    if (!actor || actor.role === "designer") return json({ error: "Entre como cliente para pagar." }, 401);
    const body = await readJson(req);
    const result = await startPix(String(body?.chargeId ?? "").slice(0, 40), actor, baseUrl(req));
    if ("error" in result) return json({ error: result.error }, 422);
    return stateResponse(result.data, actor);
  });
}
