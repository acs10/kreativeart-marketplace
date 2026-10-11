import { addMonths } from "@/modules/orders/domain/types";
import type { MarketplaceStore } from "@/modules/platform/marketplace-store";
import { chargeState } from "@/modules/billing/domain/types";
import { isLate, wasOnTime } from "@/modules/jobs/domain/types";
import { designerPerformance } from "./performance";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5)) - 1]}/${m.slice(2, 4)}`;

/** Indicadores do painel da KreativeArt (calculados dos dados, sem servidor de BI). */
export function adminMetrics(m: MarketplaceStore, today: string, now = new Date()) {
  const month = today.slice(0, 7);
  const paid = m.charges.filter((c) => c.status === "paid");
  const paidIn = (mm: string) => paid.filter((c) => (c.paidAt ?? "").startsWith(mm));
  const sum = (list: { amount: number }[]) => list.reduce((s, c) => s + c.amount, 0);
  const sumFee = (list: { platformFee: number }[]) => list.reduce((s, c) => s + c.platformFee, 0);
  const last6 = Array.from({ length: 6 }, (_, i) => addMonths(month, i - 5));
  const activeJobs = m.jobs.filter((j) => !m.isPaused(j, today));
  const submittedThisMonth = m.jobs.filter((j) => j.firstSubmittedAt?.startsWith(month));
  return {
    gmvMonth: sum(paidIn(month)),
    commissionMonth: sumFee(paidIn(month)),
    commissionTotal: sumFee(paid),
    toReceiveFee: m.charges.filter((c) => c.status === "pending").reduce((s, c) => s + c.platformFee, 0),
    activeClients: new Set(m.orders.filter((o) => o.status === "active").map((o) => o.clientId)).size,
    activeDesigners: m.designers.filter((d) => d.status === "active").length,
    pendingDesigners: m.designers.filter((d) => d.status === "pending").length,
    activeOrders: m.orders.filter((o) => o.status === "active").length,
    openOrders: m.openOrders.length,
    lateJobs: activeJobs.filter((j) => isLate(j, now)).length,
    pausedJobs: m.jobs.filter((j) => m.isPaused(j, today) && j.status !== "delivered").length,
    overdueCharges: m.charges.filter((c) => chargeState(c, today) === "overdue"),
    onTimeMonth: submittedThisMonth.length ? submittedThisMonth.filter((j) => wasOnTime(j)).length / submittedThisMonth.length : null,
    deliveredMonth: m.jobs.filter((j) => j.deliveredAt?.startsWith(month)).length,
    revenueSeries: last6.map((mm) => ({ label: monthLabel(mm), gmv: sum(paidIn(mm)), fee: sumFee(paidIn(mm)) })),
    deliveredSeries: last6.map((mm) => ({ label: monthLabel(mm), value: m.jobs.filter((j) => j.deliveredAt?.startsWith(mm)).length })),
    ordersByStatus: (["awaiting_designer", "awaiting_payment", "active", "completed", "cancelled"] as const).map((s) => ({ status: s, value: m.orders.filter((o) => o.status === s).length })),
    jobsByType: Object.entries(m.jobs.reduce<Record<string, number>>((acc, j) => ((acc[j.deliverable] = (acc[j.deliverable] ?? 0) + 1), acc), {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    revenueByClient: m.clients.map((c) => ({ label: c.company ?? c.name, value: sum(paid.filter((p) => p.clientId === c.id)) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value),
    designers: m.designers
      .filter((d) => d.status !== "pending")
      .map((d) => {
        const jobs = m.jobsFor(d.id);
        const perf = designerPerformance(jobs.filter((j) => !m.isPaused(j, today)), m.settings, now);
        const earned = m.chargesFor(d.id).filter((c) => c.status === "paid").reduce((s, c) => s + c.designerAmount, 0);
        const load = jobs.filter((j) => ["todo", "in_progress", "changes_requested"].includes(j.status)).length;
        return { account: d, perf, earned, load, orders: m.ordersFor(d.id).filter((o) => o.status === "active").length };
      })
      .sort((a, b) => (b.perf.onTimeRate ?? -1) - (a.perf.onTimeRate ?? -1)),
  };
}
