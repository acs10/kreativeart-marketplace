import "server-only";
import type { ServerState } from "@/modules/platform/api-client";
import { viewFor } from "@/modules/platform/access/views";
import { actorOf, readData, storeKind } from "./marketplace-service";
import { mpConfig } from "./payments/mercadopago";
import { getSessionAccountId } from "./session";

/** Estado inicial já no HTML (sem tela de "carregando"); se o banco falhar, o navegador tenta depois. */
export async function getInitialState(): Promise<ServerState | null> {
  // Lido FORA do try: o Next precisa saber que a página depende do cookie (renderizada a cada visita, nunca estática).
  const accountId = await getSessionAccountId();
  try {
    const data = await readData();
    const actor = actorOf(data.accounts, accountId);
    return { me: actor?.id ?? null, store: storeKind(), payments: mpConfig(), data: viewFor(data, actor) };
  } catch (error) {
    console.error("[initial-state]", error);
    return null;
  }
}
