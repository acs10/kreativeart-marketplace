import { describe, expect, it } from "vitest";
import { addDays, toDay } from "@/core/lib/format";
import { chargeState, splitAmount } from "@/modules/billing/domain/types";
import { designerPerformance } from "@/modules/insights/performance";
import { buildJobs, firstPlanMonth, monthlyDueDate } from "@/modules/jobs/domain/schedule";
import { isLate, wasOnTime } from "@/modules/jobs/domain/types";
import { emptyBriefing, type Order } from "@/modules/orders/domain/types";
import { createDemoData } from "@/modules/persistence/demo-data";
import { MarketplaceStore, type Actor } from "@/modules/platform/marketplace-store";

const NOW = new Date("2026-10-09T12:00:00");
const TODAY = toDay(NOW);
const fresh = () => new MarketplaceStore(createDemoData(NOW));
const as = (m: MarketplaceStore, id: string): Actor => ({ id, name: m.nameOf(id), role: m.account(id)!.role });
const brief = { ...emptyBriefing(), objective: "Objetivo de teste com mais de dez letras" };

describe("UT-01 comissão e cobranças", () => {
  it("divide 10% para a KreativeArt e o resto para o designer", () => {
    expect(splitAmount(1390, 0.1)).toEqual({ platformFee: 139, designerAmount: 1251 });
    expect(splitAmount(70, 0.1)).toEqual({ platformFee: 7, designerAmount: 63 });
  });
  it("classifica em aberto, em atraso e pago", () => {
    expect(chargeState({ status: "pending", dueDate: "2026-10-10" }, TODAY)).toBe("pending");
    expect(chargeState({ status: "pending", dueDate: "2026-10-01" }, TODAY)).toBe("overdue");
    expect(chargeState({ status: "paid", dueDate: "2026-10-01" }, TODAY)).toBe("paid");
  });
});

describe("UT-02 cronograma", () => {
  const order = { id: "o", clientId: "c", designerId: "d", lines: [{ serviceId: "s", serviceName: "Post", deliverable: "Post de feed", quantity: 4, unitPrice: 70, deliveryDays: 3, revisions: 2 }] } as unknown as Order;
  it("plano: espalha as peças no mês, respeitando o prazo mínimo", () => {
    const jobs = buildJobs(order, "2026-10-09", "2026-10");
    expect(jobs).toHaveLength(4);
    expect(jobs.every((j) => j.dueDate >= "2026-10-12" && j.dueDate <= "2026-10-31")).toBe(true);
    expect(jobs[0].publishDate).toBe(addDays(jobs[0].dueDate, 2));
  });
  it("serviço avulso: prazo do serviço a partir da ativação", () => {
    const jobs = buildJobs({ ...order, lines: [{ ...order.lines[0], quantity: 2 }] }, "2026-10-09");
    expect(jobs.map((j) => j.dueDate)).toEqual(["2026-10-12", "2026-10-13"]);
  });
  it("vencimento limitado ao fim do mês e 1º mês do plano", () => {
    expect(monthlyDueDate("2026-02", 31)).toBe("2026-02-28");
    expect(firstPlanMonth(new Date("2026-10-09T12:00:00"))).toBe("2026-10");
    expect(firstPlanMonth(new Date("2026-10-25T12:00:00"))).toBe("2026-11");
  });
  it("atraso e pontualidade", () => {
    expect(isLate({ status: "todo", dueDate: "2026-10-08" }, NOW)).toBe(true);
    expect(isLate({ status: "in_review", dueDate: "2026-10-08", firstSubmittedAt: "2026-10-08T10:00:00" }, NOW)).toBe(false);
    expect(wasOnTime({ dueDate: "2026-10-08", firstSubmittedAt: "2026-10-08T20:00:00" })).toBe(true);
    expect(wasOnTime({ dueDate: "2026-10-08", firstSubmittedAt: "2026-10-09T08:00:00" })).toBe(false);
  });
});

describe("UT-03 fluxo completo de um serviço avulso", () => {
  it("contratar → designer aceita → paga → produz → ajuste → aprova → entrega → conclui", () => {
    const m = fresh();
    const order = m.placeOrder(as(m, "u-tech"), { kind: "service", serviceId: "s-post", quantity: 1, briefing: brief }) as Order;
    expect(order.status).toBe("awaiting_designer");
    expect(m.openOrders.some((o) => o.id === order.id)).toBe(true);

    expect(m.acceptOrder(order.id, as(m, "u-carla"))).toMatch(/análise/); // designer pendente não aceita
    expect(m.acceptOrder(order.id, as(m, "u-diego"))).toBeNull();
    expect(m.acceptOrder(order.id, as(m, "u-ana"))).toMatch(/outro designer/);
    const charge = m.charges.find((c) => c.orderId === order.id)!;
    expect(charge).toMatchObject({ amount: 70, platformFee: 7, designerAmount: 63, designerId: "u-diego", status: "pending" });
    expect(m.jobs.some((j) => j.orderId === order.id)).toBe(false); // só produz depois de pagar

    expect(m.payCharge(charge.id, as(m, "u-fashion"))).toMatch(/outro cliente/);
    expect(m.payCharge(charge.id, as(m, "u-tech"))).toBeNull();
    expect(m.order(order.id)!.status).toBe("active");
    const job = m.jobs.find((j) => j.orderId === order.id)!;
    expect(job.designerId).toBe("u-diego");

    expect(m.submitVersion(job.id, as(m, "u-ana"), [], "")).toMatch(/outro designer/);
    expect(m.submitVersion(job.id, as(m, "u-diego"), [{ id: "f", name: "a.psd", size: 1, mime: "", ext: "psd", kind: "source" }], "")).toMatch(/prévia/);
    const file = { id: "f2", name: "a.png", size: 1, mime: "image/png", ext: "png", kind: "preview" as const };
    expect(m.submitVersion(job.id, as(m, "u-diego"), [file], "v1")).toBeNull();
    expect(m.requestChanges(job.id, as(m, "u-tech"), "ok")).toMatch(/Explique/);
    expect(m.requestChanges(job.id, as(m, "u-tech"), "Trocar a cor do fundo")).toBeNull();
    expect(m.submitVersion(job.id, as(m, "u-diego"), [file], "v2")).toBeNull();
    expect(m.job(job.id)!.versions).toHaveLength(2);
    expect(m.markDelivered(job.id, as(m, "u-diego"), "")).toMatch(/aprovadas/);
    expect(m.approveJob(job.id, as(m, "u-tech"), "")).toBeNull();
    expect(m.markDelivered(job.id, as(m, "u-diego"), "Publicado")).toBeNull();
    m.tick();
    expect(m.order(order.id)!.status).toBe("completed");
  });

  it("cliente só cancela antes de começar; cancelar anula cobranças em aberto", () => {
    const m = fresh();
    const order = m.placeOrder(as(m, "u-cafe"), { kind: "service", serviceId: "s-logo", quantity: 1, briefing: brief }) as Order;
    m.acceptOrder(order.id, as(m, "u-diego"));
    expect(m.cancelOrder(order.id, as(m, "u-cafe"), "desisti")).toBeNull();
    expect(m.charges.find((c) => c.orderId === order.id)!.status).toBe("cancelled");
    const active = m.orders.find((o) => o.clientId === "u-tech" && o.status === "active")!;
    expect(m.cancelOrder(active.id, as(m, "u-tech"), "quero cancelar")).toMatch(/KreativeArt/);
  });

  it("plano exige a fidelidade mínima", () => {
    const m = fresh();
    expect(m.placeOrder(as(m, "u-tech"), { kind: "plan", planId: "p-profissional", months: 3, briefing: brief })).toMatch(/fidelidade/);
  });
});

describe("UT-04 dados demonstrativos e regras derivadas", () => {
  const m = fresh();
  it("cenários: oportunidades, aguardando pagamento, atraso e pausa", () => {
    expect(m.openOrders.length).toBe(2);
    expect(m.orders.some((o) => o.status === "awaiting_payment")).toBe(true);
    expect(m.orders.some((o) => o.status === "completed")).toBe(true);
    expect(m.financialStatus("u-cafe", TODAY)).toBe("em-atraso");
    const cafeJobs = m.jobsOf("u-cafe").filter((j) => j.period === "2026-10");
    expect(cafeJobs.length).toBeGreaterThan(0);
    expect(cafeJobs.every((j) => m.isPaused(j, TODAY))).toBe(true);
    expect(m.jobsOf("u-tech").some((j) => j.status === "in_review")).toBe(true);
  });
  it("desempenho: Ana cumpre a meta, Bruno está atrasando", () => {
    const perf = (id: string) => designerPerformance(m.jobsFor(id).filter((j) => !m.isPaused(j, TODAY)), m.settings, NOW);
    expect(perf("u-ana").level).toBe("meta");
    expect(perf("u-bruno").level).toBe("atrasando");
    expect(perf("u-diego").level).toBe("sem-dados");
  });
  it("cofre: só o designer com pedido ativo revela, e fica registrado", () => {
    const tech = m.credentials.find((c) => c.clientId === "u-tech")!;
    expect(m.revealCredential(tech.id, as(m, "u-bruno"))).toMatch(/não autorizado/);
    expect(m.revealCredential(tech.id, as(m, "u-ana"))).toEqual({ secret: "Senha-Demo-123" });
    expect(tech.logs[0].designerName).toBe("Ana Ribeiro");
    const cafe = m.credentials.find((c) => c.clientId === "u-cafe")!;
    expect(m.revealCredential(cafe.id, as(m, "u-bruno"))).toMatch(/pausou/);
  });
});
