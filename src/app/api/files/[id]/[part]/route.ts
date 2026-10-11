import type { NextRequest } from "next/server";
import { handle, json, sameOrigin, sessionActor } from "@/modules/server/api";
import { canReadFile } from "@/modules/server/file-access";
import { fileStorage, PART_SIZE } from "@/modules/server/file-storage";
import { readData } from "@/modules/server/marketplace-service";

type Ctx = RouteContext<"/api/files/[id]/[part]">;

async function target(ctx: Ctx) {
  const { id, part } = await ctx.params;
  const n = Number(part);
  const meta = await fileStorage().getMeta(id);
  if (!meta || !Number.isInteger(n) || n < 0 || n >= meta.parts) return null;
  return { meta, n, expected: n === meta.parts - 1 ? meta.size - PART_SIZE * n : PART_SIZE };
}

/** Recebe uma parte do arquivo (só quem iniciou o envio). */
export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle("file-part-put", async () => {
    if (!sameOrigin(req)) return json({ error: "Origem não permitida." }, 403);
    const actor = await sessionActor(await readData());
    const t = await target(ctx);
    if (!actor || !t || t.meta.ownerId !== actor.id) return json({ error: "Envio não encontrado." }, 404);
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength !== t.expected) return json({ error: "Parte do arquivo com tamanho inesperado." }, 422);
    await fileStorage().putPart(t.meta.id, t.n, bytes);
    return json({ ok: true });
  });
}

/** Entrega uma parte para quem pode ver o arquivo. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  return handle("file-part-get", async () => {
    const data = await readData();
    const actor = await sessionActor(data);
    const t = await target(ctx);
    if (!actor || !t || !canReadFile(data, actor, t.meta)) return json({ error: "Arquivo não encontrado." }, 404);
    const bytes = await fileStorage().getPart(t.meta.id, t.n);
    if (!bytes) return json({ error: "Parte do arquivo ausente." }, 404);
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
