import { handle, json, readJson, sameOrigin, stateResponse } from "@/modules/server/api";
import { actorOf, mutate } from "@/modules/server/marketplace-service";
import { getSessionAccountId } from "@/modules/server/session";

/**
 * O designer pede a senha de um acesso do cofre. Só é liberada se o cliente compartilhou
 * e o designer tem pedido ativo com ele; cada revelação fica registrada para o cliente ver.
 */
export async function POST(req: Request) {
  return handle("reveal", async () => {
    if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
    const body = await readJson(req);
    const id = String(body?.id ?? "").slice(0, 40);
    const accountId = await getSessionAccountId();
    const { result, data } = await mutate(
      (m) => {
        const actor = actorOf(m.accounts, accountId);
        if (!actor) return { error: "Sua sessão terminou. Entre novamente." };
        const r = m.revealCredential(id, actor);
        return typeof r === "string" ? { error: r } : { actor, secret: r.secret };
      },
      [],
      (r) => "error" in r,
    );
    if ("error" in result) return json({ error: result.error }, 403);
    return stateResponse(data, result.actor, { secret: result.secret });
  });
}
