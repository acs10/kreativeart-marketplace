import { handle, json, sameOrigin, sessionActor } from "@/modules/server/api";
import { readData, resetToDemo } from "@/modules/server/marketplace-service";
import { endSession } from "@/modules/server/session";

/** KreativeArt: apaga tudo e recria os dados demonstrativos (gasta ~150 gravações da cota). */
export async function POST(req: Request) {
  return handle("reset", async () => {
    if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
    const actor = await sessionActor(await readData());
    if (actor?.role !== "admin") return json({ error: "Apenas a KreativeArt pode restaurar a demonstração." }, 403);
    await resetToDemo();
    await endSession();
    return json({ ok: true });
  });
}
