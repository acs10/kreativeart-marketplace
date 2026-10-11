import { daysBetween, formatDay, formatPrice, todayKey } from "@/core/lib/format";
import type { Account } from "@/modules/accounts/domain/types";
import { chargeState, daysOverdue } from "@/modules/billing/domain/types";
import { designerPerformance } from "@/modules/insights/performance";
import { isLate } from "@/modules/jobs/domain/types";
import type { MarketplaceStore } from "@/modules/platform/marketplace-store";

export interface Notice {
  id: string;
  tone: "info" | "warning" | "danger" | "success";
  text: string;
  href: string;
}

/**
 * Avisos calculados a partir dos dados (não são gravados): o que cada pessoa precisa
 * fazer agora. Na versão com servidor, os mesmos avisos podem virar e-mail/WhatsApp.
 */
export function noticesFor(m: MarketplaceStore, account: Account, today = todayKey()): Notice[] {
  const out: Notice[] = [];
  const now = new Date();
  if (account.role === "client") {
    const review = m.jobsOf(account.id).filter((j) => j.status === "in_review").length;
    if (review) out.push({ id: "review", tone: "warning", text: `${review} arte(s) aguardando sua aprovação`, href: "/cliente/aprovacoes" });
    for (const c of m.chargesOf(account.id)) {
      const state = chargeState(c, today);
      if (state === "overdue") out.push({ id: `c-${c.id}`, tone: "danger", text: `Cobrança em atraso há ${daysOverdue(c, today)} dia(s): ${formatPrice(c.amount)}${daysOverdue(c, today) > m.settings.graceDays ? " — produção pausada" : ""}`, href: "/cliente/financeiro" });
      else if (state === "pending" && daysBetween(today, c.dueDate) <= 3) out.push({ id: `c-${c.id}`, tone: "info", text: `Cobrança de ${formatPrice(c.amount)} vence em ${formatDay(c.dueDate)}`, href: "/cliente/financeiro" });
    }
    const waiting = m.ordersOf(account.id).filter((o) => o.status === "awaiting_designer").length;
    if (waiting) out.push({ id: "waiting", tone: "info", text: `${waiting} pedido(s) aguardando um designer aceitar`, href: "/cliente/pedidos" });
    if (!m.credentialsOf(account.id).length && m.ordersOf(account.id).some((o) => o.status === "active" && o.kind === "plan"))
      out.push({ id: "vault", tone: "info", text: "Cadastre o acesso do Instagram para o designer publicar", href: "/cliente/acessos" });
  }
  if (account.role === "designer") {
    if (account.status === "pending") out.push({ id: "pending", tone: "warning", text: "Seu cadastro está em análise pela KreativeArt", href: "/designer/perfil" });
    const jobs = m.jobsFor(account.id).filter((j) => !m.isPaused(j, today));
    const changes = jobs.filter((j) => j.status === "changes_requested").length;
    if (changes) out.push({ id: "changes", tone: "warning", text: `${changes} peça(s) com ajuste solicitado`, href: "/designer/quadro" });
    const late = jobs.filter((j) => isLate(j, now)).length;
    if (late) out.push({ id: "late", tone: "danger", text: `${late} peça(s) atrasada(s)`, href: "/designer/quadro" });
    const approved = jobs.filter((j) => j.status === "approved").length;
    if (approved) out.push({ id: "approved", tone: "success", text: `${approved} peça(s) aprovada(s) para publicar/entregar`, href: "/designer/quadro" });
    if (account.status === "active" && m.openOrders.length) out.push({ id: "opps", tone: "info", text: `${m.openOrders.length} oportunidade(s) disponível(is)`, href: "/designer/oportunidades" });
  }
  if (account.role === "admin") {
    const pending = m.designers.filter((d) => d.status === "pending").length;
    if (pending) out.push({ id: "designers", tone: "warning", text: `${pending} designer(s) aguardando aprovação do cadastro`, href: "/admin/designers" });
    for (const d of m.designers.filter((x) => x.status === "active")) {
      const perf = designerPerformance(m.jobsFor(d.id).filter((j) => !m.isPaused(j, today)), m.settings, now);
      if (perf.level === "atrasando") out.push({ id: `d-${d.id}`, tone: "danger", text: `${d.name} está atrasando: ${perf.lateNow} peça(s) atrasada(s)`, href: "/admin/designers" });
    }
    const overdue = m.charges.filter((c) => chargeState(c, today) === "overdue").length;
    if (overdue) out.push({ id: "overdue", tone: "danger", text: `${overdue} cobrança(s) em atraso`, href: "/admin/financeiro" });
    const stale = m.openOrders.filter((o) => daysBetween(o.createdAt.slice(0, 10), today) >= 2).length;
    if (stale) out.push({ id: "stale", tone: "warning", text: `${stale} pedido(s) há 2+ dias sem designer`, href: "/admin/pedidos" });
    const payouts = m.charges.filter((c) => c.payout?.mode === "manual" && c.payout.status === "pending");
    if (payouts.length) out.push({ id: "payouts", tone: "warning", text: `${payouts.length} repasse(s) a fazer para designers (${payouts.reduce((s, c) => s + c.designerAmount, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`, href: "/admin/financeiro" });
  }
  return out;
}
