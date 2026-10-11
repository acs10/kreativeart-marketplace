import type { NextRequest } from "next/server";
import { handle, json, sessionActor } from "@/modules/server/api";
import { canReadFile } from "@/modules/server/file-access";
import { fileStorage } from "@/modules/server/file-storage";
import { readData } from "@/modules/server/marketplace-service";

/** Metadados do arquivo (nome, tamanho, quantas partes) para o navegador baixar. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  return handle("file-meta", async () => {
    const { id } = await ctx.params;
    const data = await readData();
    const actor = await sessionActor(data);
    const meta = actor ? await fileStorage().getMeta(id) : null;
    if (!actor || !meta || !canReadFile(data, actor, meta)) return json({ error: "Arquivo não encontrado." }, 404);
    return json({ id: meta.id, name: meta.name, size: meta.size, mime: meta.mime, ext: meta.ext, parts: meta.parts });
  });
}
