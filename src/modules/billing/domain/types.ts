/** Cobrança de um pedido: serviço avulso (uma) ou plano (uma por mês). */
export interface Charge {
  id: string;
  orderId: string;
  clientId: string;
  designerId: string;
  description: string;
  /** Planos: mês "AAAA-MM" a que a mensalidade se refere */
  period?: string;
  amount: number;
  /** Parte da KreativeArt (comissão) */
  platformFee: number;
  /** Parte do designer (vai para a chave PIX dele) */
  designerAmount: number;
  dueDate: string;
  status: "pending" | "paid" | "cancelled";
  paidAt?: string;
  createdAt: string;
  /** PIX gerado no Mercado Pago (o cliente paga pelo QR Code ou copia e cola) */
  payment?: ChargePayment;
  /** Como a parte do designer chega até ele */
  payout?: Payout;
}

export interface ChargePayment {
  provider: "mercadopago";
  paymentId: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  /** true = divisão automática no Mercado Pago (designer recebe direto; KreativeArt fica com a comissão) */
  split: boolean;
  /** Código "copia e cola" */
  qrCode: string;
  /** Imagem do QR Code (PNG em base64) */
  qrCodeBase64: string;
  ticketUrl?: string;
  expiresAt: string;
  createdAt: string;
  /** Ambiente de teste do Mercado Pago */
  test?: boolean;
}

/**
 * split: o Mercado Pago já depositou a parte do designer na conta dele.
 * manual: o PIX caiu na conta da KreativeArt, que repassa ao designer e marca como feito.
 */
export interface Payout {
  mode: "split" | "manual";
  status: "pending" | "done";
  doneAt?: string;
}

export type ChargeState = "paid" | "pending" | "overdue" | "cancelled";

export const CHARGE_STATE_LABEL: Record<ChargeState, string> = { paid: "Pago", pending: "Em aberto", overdue: "Em atraso", cancelled: "Cancelado" };
export const CHARGE_STATE_STYLE: Record<ChargeState, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-blue-100 text-blue-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-600",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Divide o valor: comissão da KreativeArt e o restante para o designer. */
export function splitAmount(amount: number, rate: number): { platformFee: number; designerAmount: number } {
  const platformFee = round2(amount * rate);
  return { platformFee, designerAmount: round2(amount - platformFee) };
}

export function chargeState(charge: Pick<Charge, "status" | "dueDate">, today: string): ChargeState {
  if (charge.status !== "pending") return charge.status;
  return charge.dueDate < today ? "overdue" : "pending";
}

/** Dias de atraso (0 se em dia). */
export function daysOverdue(charge: Pick<Charge, "status" | "dueDate">, today: string): number {
  if (chargeState(charge, today) !== "overdue") return 0;
  return Math.round((Date.parse(`${today}T12:00:00`) - Date.parse(`${charge.dueDate}T12:00:00`)) / 864e5);
}
