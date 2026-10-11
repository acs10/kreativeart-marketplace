import { EMAIL, ID_PATTERN } from "@/core/lib/format";
import { PIX_KEY_TYPES, SPECIALTIES, type Account, type BrandKit } from "@/modules/accounts/domain/types";
import { DELIVERABLE_TYPES, type Plan, type Service } from "@/modules/catalog/domain/types";
import type { FileRef } from "@/modules/jobs/domain/types";
import type { Briefing } from "@/modules/orders/domain/types";
import type { Settings } from "@/modules/settings/types";
import { VAULT_PLATFORMS, type CredentialInput } from "@/modules/vault/domain/types";
import type { Actor, MarketplaceStore } from "../marketplace-store";

/**
 * Ações que o navegador pode pedir ao servidor. Cada uma:
 *  1. confere se o perfil logado pode fazer aquilo (o "actor" vem da sessão, nunca do navegador);
 *  2. limpa os argumentos (só campos conhecidos, tipos e tamanhos certos);
 *  3. chama a MESMA regra do MarketplaceStore que a tela usou.
 * Devolve null (ok), um objeto (ok, ex.: pedido criado) ou o texto do erro.
 */
export interface CommandContext {
  /** Mercado Pago ligado: o pagamento só é confirmado pelo retorno do Mercado Pago (ou pela KreativeArt). */
  paymentsLive: boolean;
}

type Handler = (m: MarketplaceStore, actor: Actor, args: unknown[], ctx: CommandContext) => unknown;

const DENIED = "Ação não permitida para o seu perfil.";

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const bool = (v: unknown) => v === true;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (list.includes(v as T) ? (v as T) : undefined);
const optId = (v: unknown) => (typeof v === "string" && v.length <= 40 && /^[\w-]+$/.test(v) ? v : undefined);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const httpsUrl = (v: unknown) => {
  const s = str(v, 500).trim();
  return s === "" || /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : null;
};

const isAdmin = (a: Actor) => a.role === "admin";

/** Copia só as chaves presentes em `raw` que tenham conversor em `fields`. */
function pickPatch<T>(raw: unknown, fields: { [K in keyof T]?: (v: unknown) => T[K] | undefined }): Partial<T> | string {
  const input = obj(raw);
  const out: Partial<T> = {};
  for (const key of Object.keys(fields) as (keyof T)[]) {
    if (!(key in input)) continue;
    const value = fields[key]!(input[key as string]);
    if (value === undefined || (typeof value === "number" && Number.isNaN(value))) return `Campo inválido: ${String(key)}.`;
    out[key] = value;
  }
  return out;
}

const briefing = (v: unknown): Briefing => {
  const b = obj(v);
  return { objective: str(b.objective, 1000), audience: str(b.audience, 500), references: str(b.references, 1000), copy: str(b.copy, 3000), notes: str(b.notes, 2000) };
};

const fileRef = (v: unknown): FileRef | null => {
  const f = obj(v);
  const id = typeof f.id === "string" && ID_PATTERN.test(f.id) ? f.id : null;
  const kind = oneOf(f.kind, ["preview", "source"] as const);
  if (!id || !kind) return null;
  const thumbId = typeof f.thumbId === "string" && ID_PATTERN.test(f.thumbId) ? f.thumbId : undefined;
  return { id, name: str(f.name, 200) || "arquivo", size: Math.max(0, num(f.size) || 0), mime: str(f.mime, 100), ext: str(f.ext, 10).toLowerCase(), kind, ...(thumbId ? { thumbId } : {}) };
};

/** Quem participa da peça: o cliente dono, o designer responsável ou a KreativeArt. */
function participates(m: MarketplaceStore, jobId: unknown, actor: Actor) {
  const job = m.job(str(jobId, 40));
  return !!job && (isAdmin(actor) || job.clientId === actor.id || job.designerId === actor.id);
}

export const COMMANDS = {
  updateProfile: (m, actor, [id, patch]) => {
    if (id !== actor.id && !isAdmin(actor)) return DENIED;
    const clean = pickPatch<Account>(patch, {
      name: (v) => (str(v, 80).trim().length >= 3 ? str(v, 80).trim() : undefined),
      email: (v) => (EMAIL.test(str(v, 120).trim()) ? str(v, 120).trim() : undefined),
      phone: (v) => str(v, 30),
      company: (v) => str(v, 100),
      document: (v) => str(v, 30),
      instagram: (v) => str(v, 60),
      bio: (v) => str(v, 1000),
      specialties: (v) => (Array.isArray(v) ? v.filter((s) => SPECIALTIES.includes(s)) : undefined),
      portfolioUrl: (v) => httpsUrl(v) ?? undefined,
      pixKeyType: (v) => oneOf(v, PIX_KEY_TYPES),
      pixKey: (v) => str(v, 120),
      weeklyCapacity: (v) => (num(v) >= 1 && num(v) <= 100 ? Math.round(num(v)) : undefined),
    });
    return typeof clean === "string" ? clean : m.updateProfile(str(id, 40), clean);
  },

  updateBrand: (m, actor, [clientId, raw]) => {
    if (clientId !== actor.id && !isAdmin(actor)) return DENIED;
    const b = obj(raw);
    const logoUrl = httpsUrl(b.logoUrl);
    if (logoUrl === null) return "O link do logo precisa começar com https://.";
    const colors = (Array.isArray(b.colors) ? b.colors : []).filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c)).slice(0, 12);
    const brand: BrandKit = { logoUrl, colors, fonts: str(b.fonts, 200), tone: str(b.tone, 300), notes: str(b.notes, 2000) };
    return m.updateBrand(str(clientId, 40), brand);
  },

  setAccountStatus: (m, actor, [id, status]) => {
    if (!isAdmin(actor)) return DENIED;
    const s = oneOf(status, ["active", "pending", "suspended"] as const);
    return s ? m.setAccountStatus(str(id, 40), s) : "Situação inválida.";
  },

  saveService: (m, actor, [raw]) => {
    if (!isAdmin(actor)) return DENIED;
    const i = obj(raw);
    const category = oneOf(i.category, SPECIALTIES);
    const deliverable = oneOf(i.deliverable, DELIVERABLE_TYPES);
    if (!category || !deliverable) return "Categoria ou tipo de peça inválido.";
    const input: Omit<Service, "id"> & { id?: string } = {
      id: optId(i.id),
      name: str(i.name, 80),
      description: str(i.description, 500),
      category,
      deliverable,
      price: num(i.price),
      deliveryDays: Math.round(num(i.deliveryDays)),
      revisions: Math.round(num(i.revisions)),
      active: bool(i.active),
    };
    return m.saveService(input);
  },

  savePlan: (m, actor, [raw]) => {
    if (!isAdmin(actor)) return DENIED;
    const i = obj(raw);
    const items = (Array.isArray(i.items) ? i.items : []).map(obj).map((it) => ({ serviceId: str(it.serviceId, 40), quantity: Math.round(num(it.quantity)) || 0 })).slice(0, 30);
    const input: Omit<Plan, "id"> & { id?: string } = {
      id: optId(i.id),
      name: str(i.name, 60),
      tagline: str(i.tagline, 160),
      items,
      monthlyPrice: num(i.monthlyPrice),
      minMonths: Math.round(num(i.minMonths)),
      highlight: bool(i.highlight),
      active: bool(i.active),
    };
    return m.savePlan(input);
  },

  updateSettings: (m, actor, [patch]) => {
    if (!isAdmin(actor)) return DENIED;
    const text = (max: number) => (v: unknown) => (typeof v === "string" ? v.slice(0, max) : undefined);
    const clean = pickPatch<Settings>(patch, {
      companyName: text(100),
      cnpj: text(30),
      email: text(120),
      phone: text(30),
      city: text(80),
      instagram: text(60),
      pixKeyType: (v) => oneOf(v, PIX_KEY_TYPES),
      pixKey: text(120),
      commissionRate: num,
      graceDays: (v) => (num(v) >= 0 && num(v) <= 60 ? Math.round(num(v)) : undefined),
      onTimeGoal: (v) => (num(v) >= 0 && num(v) <= 1 ? num(v) : undefined),
      lateAlert: (v) => (num(v) >= 1 && num(v) <= 100 ? Math.round(num(v)) : undefined),
    });
    return typeof clean === "string" ? clean : m.updateSettings(clean);
  },

  placeOrder: (m, actor, [, raw]) => {
    if (actor.role !== "client") return "Entre como cliente para contratar.";
    const i = obj(raw);
    if (i.kind === "service") return m.placeOrder(actor, { kind: "service", serviceId: str(i.serviceId, 40), quantity: Math.round(num(i.quantity)), briefing: briefing(i.briefing) });
    if (i.kind === "plan") return m.placeOrder(actor, { kind: "plan", planId: str(i.planId, 40), months: Math.round(num(i.months)), briefing: briefing(i.briefing) });
    return "Tipo de pedido inválido.";
  },

  cancelOrder: (m, actor, [orderId, , reason]) => (actor.role === "designer" ? DENIED : m.cancelOrder(str(orderId, 40), actor, str(reason, 500))),

  acceptOrder: (m, actor, [orderId]) => (actor.role === "designer" ? m.acceptOrder(str(orderId, 40), actor) : DENIED),

  assignDesigner: (m, actor, [orderId, designerId]) => (isAdmin(actor) ? m.assignDesigner(str(orderId, 40), str(designerId, 40)) : DENIED),

  /**
   * Sem Mercado Pago (demonstração): o cliente simula o pagamento. Com Mercado Pago: só a KreativeArt
   * confirma manualmente (casos excepcionais); o normal é a confirmação automática pelo retorno do PIX.
   */
  payCharge: (m, actor, [chargeId], ctx) => {
    if (actor.role === "designer" || (ctx.paymentsLive && actor.role !== "admin")) return "O pagamento é confirmado automaticamente pelo Mercado Pago.";
    return m.payCharge(str(chargeId, 40), actor);
  },

  markPayoutDone: (m, actor, [chargeId]) => (isAdmin(actor) ? m.markPayoutDone(str(chargeId, 40)) : DENIED),

  moveJob: (m, actor, [jobId, status]) => {
    const s = oneOf(status, ["todo", "in_progress"] as const);
    return s ? m.moveJob(str(jobId, 40), s, actor) : "Situação inválida.";
  },

  submitVersion: (m, actor, [jobId, , files, note, caption]) => {
    const refs = (Array.isArray(files) ? files : []).slice(0, 40).map(fileRef);
    if (refs.some((f) => !f)) return "Arquivo inválido.";
    return m.submitVersion(str(jobId, 40), actor, refs as FileRef[], str(note, 2000), caption === undefined ? undefined : str(caption, 2200));
  },

  approveJob: (m, actor, [jobId, , text]) => (actor.role === "designer" ? DENIED : m.approveJob(str(jobId, 40), actor, str(text, 2000))),

  requestChanges: (m, actor, [jobId, , text]) => (actor.role === "designer" ? DENIED : m.requestChanges(str(jobId, 40), actor, str(text, 2000))),

  markDelivered: (m, actor, [jobId, , text]) => m.markDelivered(str(jobId, 40), actor, str(text, 2000)),

  comment: (m, actor, [jobId, , text]) => (participates(m, jobId, actor) ? m.comment(str(jobId, 40), actor, str(text, 2000)) : "Peça não encontrada."),

  updateJobSchedule: (m, actor, [jobId, , raw]) => {
    if (!participates(m, jobId, actor)) return "Peça não encontrada.";
    const p = obj(raw);
    const time = typeof p.publishTime === "string" && /^\d{2}:\d{2}$/.test(p.publishTime) ? p.publishTime : undefined;
    return m.updateJobSchedule(str(jobId, 40), actor, { publishDate: day(p.publishDate), publishTime: time, caption: str(p.caption, 2200) });
  },

  saveCredential: (m, actor, [clientId, raw]) => {
    if (actor.role !== "client" || clientId !== actor.id) return DENIED;
    const i = obj(raw);
    const platform = oneOf(i.platform, VAULT_PLATFORMS);
    if (!platform) return "Rede social inválida.";
    const input: CredentialInput & { id?: string } = {
      id: optId(i.id),
      platform,
      login: str(i.login, 120),
      secret: str(i.secret, 200),
      twoFactor: str(i.twoFactor, 300),
      notes: str(i.notes, 1000),
      shared: bool(i.shared),
    };
    return m.saveCredential(actor.id, input);
  },

  removeCredential: (m, actor, [clientId, id]) => {
    if (actor.role !== "client" || clientId !== actor.id) return DENIED;
    m.removeCredential(actor.id, str(id, 40));
    return null;
  },
} satisfies Record<string, Handler>;

export type CommandName = keyof typeof COMMANDS;
export const COMMAND_NAMES = Object.keys(COMMANDS) as CommandName[];

export const isCommand = (name: unknown): name is CommandName => typeof name === "string" && Object.hasOwn(COMMANDS, name);

/** Resultado normalizado: erro em texto ou sucesso. */
export function runCommand(m: MarketplaceStore, actor: Actor, name: CommandName, args: unknown[], ctx: CommandContext = { paymentsLive: false }): { error: string | null } {
  const result = (COMMANDS[name] as Handler)(m, actor, Array.isArray(args) ? args : [], ctx);
  return { error: typeof result === "string" ? result : null };
}
