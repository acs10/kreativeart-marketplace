import type { DeliverableType } from "@/modules/catalog/domain/types";

/**
 * Pedido (contratação). Fluxo:
 * awaiting_designer → (designer aceita) → awaiting_payment → (cliente paga) → active → completed
 * Em qualquer ponto antes de concluir: cancelled.
 */
export type OrderStatus = "awaiting_designer" | "awaiting_payment" | "active" | "completed" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_designer: "Aguardando designer",
  awaiting_payment: "Aguardando pagamento",
  active: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  awaiting_designer: "bg-amber-100 text-amber-800",
  awaiting_payment: "bg-orange-100 text-orange-800",
  active: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-200 text-gray-600",
};

export interface OrderLine {
  serviceId: string;
  serviceName: string;
  deliverable: DeliverableType;
  quantity: number;
  unitPrice: number;
  deliveryDays: number;
  revisions: number;
}

export interface Briefing {
  objective: string;
  audience: string;
  references: string;
  /** Legendas / textos que devem entrar nas artes */
  copy: string;
  notes: string;
}

export interface Order {
  id: string;
  /** KA-2026-0001 */
  number: string;
  clientId: string;
  designerId?: string;
  kind: "service" | "plan";
  /** Plano escolhido (kind = plan) */
  planId?: string;
  title: string;
  lines: OrderLine[];
  /** Valor total (serviço avulso) ou mensal (plano) */
  price: number;
  /** Planos: meses contratados */
  months?: number;
  /** Planos: primeiro mês "AAAA-MM" */
  startMonth?: string;
  /** Dia do mês para vencimento das mensalidades */
  billingDay?: number;
  briefing: Briefing;
  status: OrderStatus;
  /** Percentual da KreativeArt no momento da contratação */
  commissionRate: number;
  createdAt: string;
  acceptedAt?: string;
  activatedAt?: string;
  closedAt?: string;
  cancelReason?: string;
}

export const emptyBriefing = (): Briefing => ({ objective: "", audience: "", references: "", copy: "", notes: "" });

/** Mês "AAAA-MM" somado de n meses. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Meses do contrato de um plano. */
export function planMonths(order: Pick<Order, "startMonth" | "months">): string[] {
  if (!order.startMonth || !order.months) return [];
  return Array.from({ length: order.months }, (_, i) => addMonths(order.startMonth!, i));
}
