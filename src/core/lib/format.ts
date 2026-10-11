export const randomId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
let idSource: (() => string) | null = null;

/** Novo identificador. Dentro de `withIdSource`, os ids vêm da fonte informada (gravar ou repetir). */
export const newId = () => idSource?.() ?? randomId();

export const ID_PATTERN = /^[a-z0-9]{8,24}$/;

/**
 * Executa `fn` com outra fonte de ids. O navegador grava os ids que gerou numa ação e o
 * servidor repete a mesma ação com os mesmos ids — assim tela e banco ficam com os mesmos registros.
 */
export function withIdSource<T>(source: () => string | undefined, fn: () => T): T {
  const previous = idSource;
  idSource = () => source() ?? randomId();
  try {
    return fn();
  } finally {
    idSource = previous;
  }
}

/** "2026-10-08" -> Date local (sem deslocamento de fuso). */
export const parseDay = (day: string) => new Date(`${day}T12:00:00`);

/** Date -> "2026-10-08" no horário local. */
export const toDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Hoje "AAAA-MM-DD" em Brasília (no servidor, em UTC, a data mudaria às 21h). */
export const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/** Soma dias a "AAAA-MM-DD". */
export const addDays = (day: string, n: number) => {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
};

/** Datas sempre no horário de Brasília: o servidor (Netlify, em UTC) e o navegador mostram o mesmo texto. */
const TZ = "America/Sao_Paulo";
export const formatDay = (day: string) => parseDay(day).toLocaleDateString("pt-BR", { timeZone: TZ });
export const formatShortDay = (day: string) => parseDay(day).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: TZ });
export const formatDateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: TZ });
export const formatMonth = (month: string) => parseDay(`${month}-01`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: TZ });
export const formatPrice = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
export const formatBytes = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/** Dias entre duas datas "AAAA-MM-DD" (b − a). */
export const daysBetween = (a: string, b: string) => Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 864e5);

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "(63) 99999-0000" enquanto digita. */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** SHA-256 da senha com sal fixo (protótipo; no servidor: Firebase Authentication). */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`kreativeart:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
