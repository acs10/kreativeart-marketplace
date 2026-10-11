import { addDays, toDay } from "@/core/lib/format";
import { SOCIAL_TYPES } from "@/modules/catalog/domain/types";
import type { Order } from "@/modules/orders/domain/types";
import type { Job } from "./types";

type NewJob = Omit<Job, "id" | "createdAt" | "updatedAt">;

const daysInMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

/**
 * Cronograma das peças de um pedido.
 * - Serviço avulso: todas a partir da ativação, com o prazo do serviço (+1 dia entre peças iguais).
 * - Plano: as peças do mês são distribuídas ao longo do mês; nunca antes do prazo mínimo do serviço.
 * Peças de rede social ganham sugestão de publicação 2 dias após o prazo, às 18h.
 */
export function buildJobs(order: Order, startDay: string, period?: string): NewJob[] {
  const units = order.lines.flatMap((line) => Array.from({ length: line.quantity }, (_, i) => ({ line, index: i })));
  return units.map(({ line, index }, position) => {
    let dueDate: string;
    if (period) {
      // Distribui entre o primeiro prazo possível (ou o dia 1) e o fim do mês.
      const total = daysInMonth(period);
      const minDays = Math.min(...order.lines.map((l) => l.deliveryDays));
      const fromKey = addDays(startDay, minDays) > `${period}-01` ? addDays(startDay, minDays) : `${period}-01`;
      const from = fromKey.slice(0, 7) === period ? Number(fromKey.slice(8)) : total;
      const span = Math.max(0, total - from);
      const day = Math.min(total, from + Math.round(((position + 1) * span) / (units.length + 1)));
      const spread = `${period}-${String(day).padStart(2, "0")}`;
      const earliest = addDays(startDay, line.deliveryDays);
      dueDate = spread < earliest ? earliest : spread;
    } else {
      dueDate = addDays(startDay, line.deliveryDays + index);
    }
    const social = SOCIAL_TYPES.includes(line.deliverable);
    const label = line.quantity > 1 ? `${line.deliverable} ${index + 1}/${line.quantity}` : line.deliverable;
    return {
      orderId: order.id,
      clientId: order.clientId,
      designerId: order.designerId,
      title: period ? `${label} · ${period.slice(5)}/${period.slice(0, 4)}` : label,
      deliverable: line.deliverable,
      period,
      dueDate,
      publishDate: social ? addDays(dueDate, 2) : undefined,
      publishTime: social ? "18:00" : undefined,
      caption: "",
      status: "todo",
      versions: [],
      revisionsIncluded: line.revisions,
      revisionsUsed: 0,
      comments: [],
    };
  });
}

/** Dia de vencimento de uma mensalidade (limitado ao último dia do mês). */
export function monthlyDueDate(month: string, billingDay: number): string {
  return `${month}-${String(Math.min(billingDay, daysInMonth(month))).padStart(2, "0")}`;
}

/** Mês inicial de um plano contratado hoje: o mês atual até o dia 20; depois, o próximo. */
export function firstPlanMonth(today: Date = new Date()): string {
  const d = today.getDate() > 20 ? new Date(today.getFullYear(), today.getMonth() + 1, 1) : today;
  return toDay(d).slice(0, 7);
}
