import "server-only";
import type { ChargePayment } from "@/modules/billing/domain/types";
import type { Actor, MarketplaceData } from "@/modules/platform/marketplace-store";
import { getBackend } from "../backend";
import { mutate, readData } from "../marketplace-service";
import { decryptSecret, encryptSecret } from "../secrets";
import { createPix, getPayment, MercadoPagoError, mpConfig, platformToken, refreshToken, type MpPayment, type OAuthToken } from "./mercadopago";

/**
 * Pagamentos por PIX no Mercado Pago.
 *  - Designer com conta conectada: o PIX é criado em nome dele com a comissão da KreativeArt
 *    (application_fee) — o Mercado Pago divide sozinho.
 *  - Sem conta conectada, ou se o Mercado Pago recusar a divisão: o PIX cai na conta da KreativeArt e o
 *    repasse ao designer fica pendente no painel.
 * A confirmação sempre vem de uma consulta ao Mercado Pago (retorno/webhook ou verificação da tela).
 */

// ------------------------------------------------------------------ tokens dos designers (cifrados)

const sellerKey = (designerId: string) => `mp-seller-${designerId}`;

export async function saveSellerToken(designerId: string, t: OAuthToken) {
  const expiresAt = new Date(Date.now() + t.expires_in * 1000).toISOString();
  await getBackend().setPrivate(sellerKey(designerId), { accessTokenEnc: encryptSecret(t.access_token), refreshTokenEnc: encryptSecret(t.refresh_token), userId: String(t.user_id), expiresAt });
  return { userId: String(t.user_id), expiresAt };
}

export async function removeSellerToken(designerId: string) {
  await getBackend().setPrivate(sellerKey(designerId), null);
}

/** Token do designer, renovado se faltar menos de 15 dias para vencer (vale ~180 dias). */
async function sellerToken(designerId: string): Promise<string | null> {
  const doc = await getBackend().getPrivate(sellerKey(designerId));
  if (!doc) return null;
  const access = decryptSecret(String(doc.accessTokenEnc ?? ""));
  if (!access) return null;
  if (Date.parse(String(doc.expiresAt)) - Date.now() > 15 * 864e5) return access;
  try {
    const renewed = await refreshToken(decryptSecret(String(doc.refreshTokenEnc ?? "")));
    const info = await saveSellerToken(designerId, renewed);
    await mutate((m) => m.setMercadoPago(designerId, { ...m.account(designerId)!.mercadoPago!, expiresAt: info.expiresAt }));
    return renewed.access_token;
  } catch (error) {
    console.error("[mp] não foi possível renovar o token do designer", designerId, error);
    return Date.parse(String(doc.expiresAt)) > Date.now() ? access : null;
  }
}

// ------------------------------------------------------------------ gerar o PIX

const toPayment = (p: MpPayment, split: boolean): ChargePayment => ({
  provider: "mercadopago",
  paymentId: String(p.id),
  status: "pending",
  split,
  qrCode: p.point_of_interaction?.transaction_data?.qr_code ?? "",
  qrCodeBase64: p.point_of_interaction?.transaction_data?.qr_code_base64 ?? "",
  ticketUrl: p.point_of_interaction?.transaction_data?.ticket_url,
  expiresAt: p.date_of_expiration ?? new Date(Date.now() + 864e5).toISOString(),
  createdAt: new Date().toISOString(),
  ...(mpConfig().testMode ? { test: true } : {}),
});

/** Gera (ou reaproveita, se ainda vale) o PIX de uma cobrança do cliente logado. */
export async function startPix(chargeId: string, actor: Actor, baseUrl: string): Promise<{ error: string } | { data: MarketplaceData }> {
  const data = await readData();
  const charge = data.charges.find((c) => c.id === chargeId);
  if (!charge || (actor.role === "client" && charge.clientId !== actor.id)) return { error: "Cobrança não encontrada." };
  if (charge.status !== "pending") return { error: "Esta cobrança não está em aberto." };
  const current = charge.payment;
  if (current?.status === "pending" && Date.parse(current.expiresAt) - Date.now() > 5 * 60_000) return { data };

  const client = data.accounts.find((a) => a.id === charge.clientId)!;
  const test = mpConfig().testMode;
  const base = {
    chargeId: charge.id,
    amount: charge.amount,
    description: `KreativeArt — ${charge.description}`,
    // Teste: comprador fictício ("APRO" pede aprovação automática no ambiente de teste).
    payer: test ? { email: "test_user_br@testuser.com", firstName: "APRO" } : { email: client.email, firstName: client.name.split(" ")[0] },
    notificationUrl: baseUrl.startsWith("https://") && !baseUrl.includes("localhost") ? `${baseUrl}/api/webhooks/mercadopago` : undefined,
  };

  let payment: ChargePayment | null = null;
  const token = await sellerToken(charge.designerId);
  if (token) {
    try {
      payment = toPayment(await createPix({ ...base, token, applicationFee: charge.platformFee }), true);
    } catch (error) {
      // Ex.: PIX não habilitado para divisão nesta conta — segue pela conta da KreativeArt.
      console.error("[mp] PIX com divisão recusado; usando a conta da KreativeArt", error instanceof MercadoPagoError ? error.message : error);
    }
  }
  if (!payment) {
    try {
      payment = toPayment(await createPix({ ...base, token: platformToken() }), false);
    } catch (error) {
      console.error("[mp] falha ao gerar PIX", error);
      return { error: "Não foi possível gerar o PIX agora. Tente de novo em instantes." };
    }
  }
  const { result, data: next } = await mutate((m) => m.attachPayment(charge.id, payment!));
  return result ? { error: result } : { data: next };
}

// ------------------------------------------------------------------ confirmar

const FINAL: ChargePayment["status"][] = ["approved", "rejected", "cancelled", "expired"];

/**
 * Consulta o PIX da cobrança no Mercado Pago e atualiza a plataforma: aprovado (e valor certo)
 * confirma a cobrança, inicia a produção e registra o repasse.
 */
export async function syncCharge(chargeId: string): Promise<MarketplaceData> {
  const data = await readData();
  const charge = data.charges.find((c) => c.id === chargeId);
  const payment = charge?.payment;
  if (!charge || !payment || charge.status !== "pending" || FINAL.includes(payment.status)) return data;

  const token = payment.split ? await sellerToken(charge.designerId) : platformToken();
  if (!token) return data;
  const mp = await getPayment(token, payment.paymentId);
  if (mp.external_reference !== charge.id) {
    console.error("[mp] pagamento não pertence à cobrança", payment.paymentId, chargeId);
    return data;
  }
  const amountOk = Math.abs(mp.transaction_amount - charge.amount) < 0.01;
  if (mp.status === "approved" && amountOk) {
    return (await mutate((m) => m.confirmPayment(charge.id, payment.split ? { mode: "split", status: "done", doneAt: new Date().toISOString() } : { mode: "manual", status: "pending" }))).data;
  }
  if (mp.status === "approved") console.error(`[mp] valor divergente na cobrança ${charge.id}: pago ${mp.transaction_amount}, esperado ${charge.amount}`);
  const status: ChargePayment["status"] =
    mp.status === "approved" ? "rejected" : mp.status === "rejected" ? "rejected" : mp.status === "cancelled" ? (mp.status_detail === "expired" ? "expired" : "cancelled") : "pending";
  if (status === payment.status) return data;
  return (await mutate((m) => m.updatePaymentStatus(charge.id, status))).data;
}

/** Webhook: acha a cobrança pelo id do pagamento no Mercado Pago. */
export async function syncByPaymentId(paymentId: string): Promise<boolean> {
  const data = await readData();
  const charge = data.charges.find((c) => c.payment?.paymentId === paymentId);
  if (!charge) return false;
  await syncCharge(charge.id);
  return true;
}
