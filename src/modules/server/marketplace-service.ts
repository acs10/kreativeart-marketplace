import "server-only";
import { ID_PATTERN, withIdSource } from "@/core/lib/format";
import { displayName } from "@/modules/accounts/domain/types";
import { createDemoData } from "@/modules/persistence/demo-data";
import { MarketplaceStore, type Actor, type MarketplaceData } from "@/modules/platform/marketplace-store";
import { DOC_COLLECTIONS, getBackend, type Stored, type Write } from "./backend";
import { decryptSecret, encryptSecret, hashPassword } from "./secrets";

/**
 * Acesso aos dados da plataforma no servidor.
 *
 * Leitura: 1 leitura do documento de versão por requisição; os dados completos só são
 * recarregados quando outra instância gravou algo (economiza a cota gratuita do Firestore).
 * Gravação: a ação roda com as mesmas regras do MarketplaceStore; só os documentos que
 * mudaram são gravados, numa transação que confere a versão (sem sobrescrever ninguém).
 */
type Seq = { _seq?: number };

const globalCache = globalThis as unknown as { __kaCache?: Stored | null };

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Ordem das listas (o Firestore não guarda ordem): pedidos do mais novo; o resto na ordem de criação. */
function sortData(data: MarketplaceData) {
  const seq = (d: unknown) => (d as Seq)._seq ?? 0;
  for (const c of DOC_COLLECTIONS) (data[c] as unknown[]).sort((a, b) => seq(a) - seq(b));
  data.orders.reverse();
}

/** Documentos guardados ⇄ dados em memória (senha do cofre só cifrada no banco). */
const toDoc = (collection: string, d: Record<string, unknown>) => {
  if (collection !== "credentials") return d;
  const { secret, ...rest } = d;
  return { ...rest, secretEnc: encryptSecret(String(secret ?? "")) };
};
function fromStored(stored: Stored): Stored {
  const data = stored.data;
  data.credentials = (data.credentials as unknown as Record<string, unknown>[]).map(({ secretEnc, ...rest }) => ({ ...rest, secret: decryptSecret(String(secretEnc ?? "")) })) as unknown as MarketplaceData["credentials"];
  sortData(data);
  return stored;
}

/** Numera os registros novos para manter a ordem das listas. */
function assignSeq(data: MarketplaceData) {
  const base = Date.now() * 1000;
  for (const c of DOC_COLLECTIONS) {
    const list = data[c] as Seq[];
    // pedidos entram no início da lista; os demais, no fim
    const ordered = c === "orders" ? [...list].reverse() : list;
    ordered.forEach((d, i) => {
      if (d._seq === undefined) d._seq = base + i;
    });
  }
}

/** Documentos que mudaram entre duas versões dos dados. */
export function diff(before: MarketplaceData, after: MarketplaceData): Write[] {
  const writes: Write[] = [];
  for (const c of DOC_COLLECTIONS) {
    const old = new Map((before[c] as { id: string }[]).map((d) => [d.id, JSON.stringify(d)]));
    const seen = new Set<string>();
    for (const d of after[c] as unknown as { id: string }[]) {
      seen.add(d.id);
      if (old.get(d.id) !== JSON.stringify(d)) writes.push({ collection: c, id: d.id, doc: toDoc(c, d as unknown as Record<string, unknown>) });
    }
    for (const id of old.keys()) if (!seen.has(id)) writes.push({ collection: c, id, doc: null });
  }
  return writes;
}

const DEMO_PASSWORD = "demo123";

/** Dados demonstrativos com senhas no formato do servidor. */
export async function demoData(): Promise<MarketplaceData> {
  const data = createDemoData();
  const hash = await hashPassword(DEMO_PASSWORD);
  for (const a of data.accounts) a.passwordHash = hash;
  assignSeq(data);
  return data;
}

/** Recria o banco com os dados demonstrativos. */
export async function resetToDemo(): Promise<void> {
  const data = await demoData();
  const backend = getBackend();
  await backend.replaceAll(clone({ ...data, credentials: data.credentials.map((c) => toDoc("credentials", c as unknown as Record<string, unknown>)) }) as unknown as MarketplaceData);
  globalCache.__kaCache = { version: 1, data };
}

async function current(force = false): Promise<Stored> {
  const backend = getBackend();
  const version = await backend.readVersion();
  if (version === null) {
    await resetToDemo();
    return globalCache.__kaCache!;
  }
  const cached = globalCache.__kaCache;
  if (!force && cached && cached.version === version) return cached;
  globalCache.__kaCache = fromStored(await backend.loadAll());
  return globalCache.__kaCache;
}

export function actorOf(accounts: MarketplaceData["accounts"], accountId: string | null | undefined): Actor | null {
  const a = accounts.find((x) => x.id === accountId);
  if (!a || a.status === "suspended") return null;
  return { id: a.id, name: displayName(a), role: a.role };
}

export class ConflictError extends Error {}

/**
 * Executa uma alteração. `ids` são os ids que o navegador gerou ao fazer a mesma ação
 * (só são aceitos se tiverem o formato certo e ainda não existirem).
 */
export async function mutate<T>(
  fn: (m: MarketplaceStore, data: MarketplaceData) => T,
  ids: unknown[] = [],
  /** true = não grava nada (ex.: a ação foi recusada no meio do caminho) */
  discard?: (result: T) => boolean,
): Promise<{ result: T; data: MarketplaceData }> {
  const backend = getBackend();
  for (let attempt = 0; attempt < 4; attempt++) {
    const base = await current(attempt > 0);
    const m = new MarketplaceStore(clone(base.data));
    m.tick();
    const existing = new Set(DOC_COLLECTIONS.flatMap((c) => (base.data[c] as { id: string }[]).map((d) => d.id)));
    const queue = ids.filter((id): id is string => typeof id === "string" && ID_PATTERN.test(id) && !existing.has(id)).slice(0, 200);
    const result = withIdSource(() => queue.shift(), () => fn(m, base.data));
    if (discard?.(result)) return { result, data: base.data };
    const next = clone(m.snapshot);
    assignSeq(next);
    const writes = diff(base.data, next);
    const metaChanged = JSON.stringify(base.data.settings) !== JSON.stringify(next.settings) || base.data.orderCounter !== next.orderCounter;
    if (!writes.length && !metaChanged) return { result, data: base.data };
    if (await backend.commit(base.version, writes, { settings: next.settings, orderCounter: next.orderCounter })) {
      sortData(next);
      globalCache.__kaCache = { version: base.version + 1, data: next };
      return { result, data: next };
    }
  }
  throw new ConflictError("Muitas alterações ao mesmo tempo. Tente de novo.");
}

/** Estado atual (já com a rotina diária aplicada). */
export async function readData(): Promise<MarketplaceData> {
  return (await mutate(() => null)).data;
}

export const storeKind = () => getBackend().kind;
