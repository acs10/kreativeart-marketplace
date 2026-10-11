import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Valida o cabeçalho x-signature do Mercado Pago ("ts=...,v1=..."):
 * HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" com a assinatura secreta do webhook.
 */
export function verifyMercadoPagoSignature(input: { secret: string | undefined; signature: string | null; requestId: string | null; dataId: string }): boolean {
  if (!input.secret || !input.signature) return false;
  const parts = Object.fromEntries(input.signature.split(",").map((p) => p.trim().split("=") as [string, string]));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId ?? ""};ts:${parts.ts};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest("hex");
  return expected.length === parts.v1.length && timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
