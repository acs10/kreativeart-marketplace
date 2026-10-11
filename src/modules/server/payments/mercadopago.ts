import "server-only";

/**
 * Mercado Pago — API REST (PIX pelo Checkout Transparente, consulta de pagamento e OAuth dos designers).
 * Fica DESLIGADO enquanto MP_ACCESS_TOKEN não estiver configurado: o site volta ao pagamento simulado.
 *  - MP_ACCESS_TOKEN: conta da KreativeArt (recebe quando não há divisão automática);
 *  - MP_CLIENT_ID / MP_CLIENT_SECRET: aplicação, para o designer conectar a conta (split);
 *  - MP_WEBHOOK_SECRET: assinatura das notificações (só com o site publicado em https);
 *  - MP_TEST_MODE=true: ambiente de teste.
 */
const API = "https://api.mercadopago.com";

export const mpConfig = () => ({
  enabled: !!process.env.MP_ACCESS_TOKEN?.trim(),
  testMode: process.env.MP_TEST_MODE === "true" || (process.env.MP_ACCESS_TOKEN?.trim().startsWith("TEST-") ?? false),
  /** Conectar conta do designer (OAuth) está disponível */
  oauth: !!(process.env.MP_CLIENT_ID?.trim() && process.env.MP_CLIENT_SECRET?.trim()),
});

export const platformToken = () => process.env.MP_ACCESS_TOKEN!.trim();

export class MercadoPagoError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Mercado Pago ${status}: ${body.slice(0, 300)}`);
  }
}

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!res.ok) throw new MercadoPagoError(res.status, await res.text());
  return (await res.json()) as T;
}

export interface MpPayment {
  id: number;
  status: "approved" | "pending" | "in_process" | "authorized" | "rejected" | "cancelled" | "refunded" | "charged_back";
  status_detail?: string;
  external_reference: string | null;
  transaction_amount: number;
  date_of_expiration?: string;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
}

/** "2026-10-11T15:30:00.000-03:00" (formato que o Mercado Pago espera, no horário de Brasília). */
function brasilia(date: Date): string {
  const local = new Date(date.getTime() - 3 * 3_600_000);
  return `${local.toISOString().slice(0, 23)}-03:00`;
}

export interface PixInput {
  token: string;
  chargeId: string;
  amount: number;
  description: string;
  /** Comissão da KreativeArt (só no split, com o token do designer) */
  applicationFee?: number;
  payer: { email: string; firstName: string };
  notificationUrl?: string;
  expiresInHours?: number;
}

/** Cria o PIX. Devolve o pagamento com o QR Code (imagem) e o código copia e cola. */
export function createPix(input: PixInput): Promise<MpPayment> {
  const expires = new Date(Date.now() + (input.expiresInHours ?? 24) * 3_600_000);
  return call<MpPayment>(input.token, "/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": `ka-${input.chargeId}-${Date.now()}` },
    body: JSON.stringify({
      transaction_amount: input.amount,
      description: input.description.slice(0, 200),
      payment_method_id: "pix",
      external_reference: input.chargeId,
      date_of_expiration: brasilia(expires),
      payer: { email: input.payer.email, first_name: input.payer.firstName },
      ...(input.applicationFee ? { application_fee: input.applicationFee } : {}),
      ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
      statement_descriptor: "KREATIVEART",
    }),
  });
}

/** Consulta o pagamento direto no Mercado Pago (a fonte da verdade). */
export function getPayment(token: string, paymentId: string): Promise<MpPayment> {
  return call<MpPayment>(token, `/v1/payments/${encodeURIComponent(paymentId)}`);
}

// ------------------------------------------------------------------ OAuth (conta do designer)

export interface OAuthToken {
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_in: number;
  live_mode?: boolean;
}

export function authorizationUrl(state: string, redirectUri: string): string {
  const q = new URLSearchParams({ client_id: process.env.MP_CLIENT_ID!.trim(), response_type: "code", platform_id: "mp", state, redirect_uri: redirectUri });
  return `https://auth.mercadopago.com.br/authorization?${q}`;
}

async function oauth(body: Record<string, unknown>): Promise<OAuthToken> {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: process.env.MP_CLIENT_ID!.trim(), client_secret: process.env.MP_CLIENT_SECRET!.trim(), ...body }),
  });
  if (!res.ok) throw new MercadoPagoError(res.status, await res.text());
  return (await res.json()) as OAuthToken;
}

export const exchangeCode = (code: string, redirectUri: string) =>
  oauth({ grant_type: "authorization_code", code, redirect_uri: redirectUri, ...(mpConfig().testMode ? { test_token: true } : {}) });

export const refreshToken = (refresh: string) => oauth({ grant_type: "refresh_token", refresh_token: refresh });
