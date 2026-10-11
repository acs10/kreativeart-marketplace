import { mpConfig } from "@/modules/server/payments/mercadopago";
import { syncByPaymentId } from "@/modules/server/payments/payment-service";
import { verifyMercadoPagoSignature } from "@/modules/server/payments/webhook-signature";

/**
 * Notificações do Mercado Pago (site publicado em https). Valida a assinatura x-signature com
 * MP_WEBHOOK_SECRET e, em vez de confiar no conteúdo, reconsulta o pagamento na API.
 */
export async function POST(request: Request) {
  if (!mpConfig().enabled) return new Response("disabled", { status: 404 });
  const url = new URL(request.url);
  const body = (await request.json().catch(() => ({}))) as { type?: string; topic?: string; data?: { id?: string | number } };
  const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? "");
  const type = body.type ?? body.topic ?? url.searchParams.get("type");
  if (type !== "payment" || !/^\d+$/.test(dataId)) return new Response("ignored", { status: 200 });
  if (!verifyMercadoPagoSignature({ secret: process.env.MP_WEBHOOK_SECRET, signature: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId })) {
    return new Response("invalid signature", { status: 401 });
  }
  try {
    await syncByPaymentId(dataId);
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[webhook] falha", error);
    return new Response("error", { status: 500 }); // o Mercado Pago tenta de novo
  }
}
