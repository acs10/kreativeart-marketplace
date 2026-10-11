import "server-only";
import type { Actor, MarketplaceData } from "@/modules/platform/marketplace-store";
import { viewFor } from "@/modules/platform/access/views";
import type { StoredFileMeta } from "./file-storage";

/**
 * Pode baixar o arquivo: quem enviou, a KreativeArt, ou quem enxerga a peça em que ele está
 * (o cliente dono e o designer responsável).
 */
export function canReadFile(data: MarketplaceData, actor: Actor, meta: StoredFileMeta): boolean {
  if (actor.role === "admin" || meta.ownerId === actor.id) return true;
  return viewFor(data, actor).jobs.some((j) => j.versions.some((v) => v.files.some((f) => f.id === meta.id || f.thumbId === meta.id)));
}
