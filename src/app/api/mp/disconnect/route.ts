import { handle, json, sameOrigin, sessionActor, stateResponse } from "@/modules/server/api";
import { mutate, readData } from "@/modules/server/marketplace-service";
import { removeSellerToken } from "@/modules/server/payments/payment-service";

/** Designer desconecta a conta Mercado Pago (novos PIX vão para a conta da KreativeArt, com repasse). */
export async function POST(req: Request) {
  return handle("mp-disconnect", async () => {
    if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
    const actor = await sessionActor(await readData());
    if (actor?.role !== "designer") return json({ error: "Entre como designer." }, 401);
    await removeSellerToken(actor.id);
    const { data } = await mutate((m) => m.setMercadoPago(actor.id, undefined));
    return stateResponse(data, actor);
  });
}
