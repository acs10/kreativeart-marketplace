import { isCommand, runCommand } from "@/modules/platform/access/commands";
import { handle, json, readJson, sameOrigin, stateResponse } from "@/modules/server/api";
import { actorOf, mutate } from "@/modules/server/marketplace-service";
import { mpConfig } from "@/modules/server/payments/mercadopago";
import { getSessionAccountId } from "@/modules/server/session";

/**
 * Executa uma ação da plataforma: { name, args, ids }.
 * O perfil vem da sessão; a regra é a mesma que a tela já aplicou.
 */
export async function POST(req: Request) {
  return handle("command", async () => {
    if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
    const body = await readJson(req);
    if (!body || !isCommand(body.name)) return json({ error: "Ação inválida." }, 400);
    const accountId = await getSessionAccountId();
    const name = body.name;
    const args = Array.isArray(body.args) ? body.args : [];
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const { result, data } = await mutate((m) => {
      const actor = actorOf(m.accounts, accountId);
      return actor ? { actor, ...runCommand(m, actor, name, args, { paymentsLive: mpConfig().enabled }) } : null;
    }, ids, (r) => !r || !!r.error);
    if (!result) return json({ error: "Sua sessão terminou. Entre novamente.", me: null }, 401);
    return stateResponse(data, result.actor, { error: result.error }, result.error ? 422 : 200);
  });
}
