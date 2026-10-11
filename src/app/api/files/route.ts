import { ID_PATTERN, newId } from "@/core/lib/format";
import { extOf, isAccepted, MAX_FILE_MB } from "@/modules/files/formats";
import { handle, json, readJson, sameOrigin, sessionActor } from "@/modules/server/api";
import { fileStorage, PART_SIZE } from "@/modules/server/file-storage";
import { readData } from "@/modules/server/marketplace-service";

/**
 * Começa um envio: { name, size, mime, id? } → { id, parts, partSize }.
 * Depois o navegador manda cada parte em PUT /api/files/<id>/<n>.
 */
export async function POST(req: Request) {
  return handle("file-start", async () => {
    if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
    const actor = await sessionActor(await readData());
    if (!actor || actor.role === "client") return json({ error: "Apenas designers enviam arquivos de entrega." }, 403);
    const body = (await readJson(req)) ?? {};
    const name = String(body.name ?? "").slice(0, 200);
    const size = Number(body.size);
    const ext = extOf(name);
    if (!isAccepted(ext)) return json({ error: `"${name}": formato .${ext || "?"} não aceito.` }, 422);
    if (!(size > 0 && size <= MAX_FILE_MB * 1024 * 1024)) return json({ error: `"${name}" passa de ${MAX_FILE_MB} MB.` }, 422);
    const id = typeof body.id === "string" && ID_PATTERN.test(body.id) ? body.id : newId();
    const storage = fileStorage();
    if (await storage.getMeta(id)) return json({ error: "Arquivo já enviado." }, 409);
    const parts = Math.ceil(size / PART_SIZE);
    await storage.putMeta({ id, ownerId: actor.id, name, size, mime: String(body.mime ?? "").slice(0, 100), ext, parts, createdAt: new Date().toISOString() });
    return json({ id, parts, partSize: PART_SIZE });
  });
}
