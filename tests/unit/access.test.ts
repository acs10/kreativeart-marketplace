import { describe, expect, it } from "vitest";
import { withIdSource } from "@/core/lib/format";
import { emptyBriefing, type Order } from "@/modules/orders/domain/types";
import { createDemoData } from "@/modules/persistence/demo-data";
import { runCommand } from "@/modules/platform/access/commands";
import { viewFor } from "@/modules/platform/access/views";
import { MarketplaceStore, type Actor } from "@/modules/platform/marketplace-store";
import { decryptSecret, encryptSecret, hashPassword, verifyPassword } from "@/modules/server/secrets";
import { diff } from "@/modules/server/marketplace-service";

const NOW = new Date("2026-10-09T12:00:00");
const data = () => createDemoData(NOW);
const actor = (id: string, role: Actor["role"]): Actor => ({ id, role, name: id });
const brief = { ...emptyBriefing(), objective: "Objetivo de teste com mais de dez letras" };

describe("UT-05 o que cada perfil recebe", () => {
  it("visitante: só catálogo e perfil público dos designers ativos", () => {
    const v = viewFor(data(), null);
    expect(v.orders).toHaveLength(0);
    expect(v.credentials).toHaveLength(0);
    expect(v.accounts.every((a) => a.role === "designer" && a.status === "active" && !a.email && !a.pixKey && !a.document && !a.passwordHash)).toBe(true);
  });

  it("cliente: só os próprios dados, PIX só dos designers dele, nenhum hash", () => {
    const v = viewFor(data(), actor("u-fashion", "client"));
    expect(v.orders.every((o) => o.clientId === "u-fashion")).toBe(true);
    expect(v.accounts.filter((a) => a.role === "client").map((a) => a.id)).toEqual(["u-fashion"]);
    expect(v.accounts.every((a) => a.passwordHash === "")).toBe(true);
    expect(v.accounts.find((a) => a.id === "u-bruno")?.pixKey).toBeTruthy(); // designer dos pedidos dela
    expect(v.accounts.find((a) => a.id === "u-ana")?.pixKey).toBeUndefined(); // sem pedido com ela
  });

  it("designer: pedidos abertos + os dele; cofre sem senha; sem documento de clientes", () => {
    const v = viewFor(data(), actor("u-ana", "designer"));
    expect(v.orders.every((o) => o.designerId === "u-ana" || o.status === "awaiting_designer")).toBe(true);
    expect(v.credentials.length).toBeGreaterThan(0);
    expect(v.credentials.every((c) => c.secret === "")).toBe(true);
    expect(v.accounts.filter((a) => a.role === "client").every((a) => !a.document && !a.email)).toBe(true);
  });

  it("KreativeArt: tudo, menos hashes e senhas do cofre", () => {
    const d = data();
    const v = viewFor(d, actor("u-admin", "admin"));
    expect(v.orders).toHaveLength(d.orders.length);
    expect(v.credentials.every((c) => c.secret === "")).toBe(true);
    expect(v.accounts.every((a) => a.passwordHash === "")).toBe(true);
  });
});

describe("UT-06 ações no servidor", () => {
  it("recusa ações fora do perfil", () => {
    const m = new MarketplaceStore(data());
    const client = actor("u-tech", "client");
    expect(runCommand(m, client, "setAccountStatus", ["u-ana", "suspended"]).error).toMatch(/não permitida/);
    expect(runCommand(m, client, "updateProfile", ["u-fashion", { name: "Invasor" }]).error).toMatch(/não permitida/);
    expect(runCommand(m, actor("u-ana", "designer"), "approveJob", ["x", client, "ok"]).error).toMatch(/não permitida/);
    expect(m.account("u-ana")!.status).toBe("active");
  });

  it("usa o perfil da sessão, não o enviado pelo navegador", () => {
    const m = new MarketplaceStore(data());
    const forged = { id: "u-fashion", role: "client", name: "Fashion" };
    runCommand(m, actor("u-tech", "client"), "placeOrder", [forged, { kind: "service", serviceId: "s-post", quantity: 1, briefing: brief }]);
    expect((m.orders[0] as Order).clientId).toBe("u-tech");
  });

  it("limpa campos: não deixa trocar papel, senha ou status pelo perfil; link do logo só https", () => {
    const m = new MarketplaceStore(data());
    const me = actor("u-tech", "client");
    runCommand(m, me, "updateProfile", ["u-tech", { name: "Marcos Lima", role: "admin", status: "active", passwordHash: "x" }]);
    expect(m.account("u-tech")!.role).toBe("client");
    expect(m.account("u-tech")!.passwordHash).not.toBe("x");
    expect(runCommand(m, me, "updateBrand", ["u-tech", { logoUrl: "javascript:alert(1)", colors: [] }]).error).toMatch(/https/);
  });

  it("repete os mesmos ids gerados no navegador", () => {
    const m = new MarketplaceStore(data());
    const ids = ["aaaaaaaa1111", "bbbbbbbb2222"];
    withIdSource(() => ids.shift(), () => runCommand(m, actor("u-tech", "client"), "placeOrder", [null, { kind: "service", serviceId: "s-post", quantity: 1, briefing: brief }]));
    expect(m.orders[0].id).toBe("aaaaaaaa1111");
  });
});

describe("UT-07 gravação e segredos", () => {
  it("grava só os documentos que mudaram", () => {
    const before = data();
    const m = new MarketplaceStore(JSON.parse(JSON.stringify(before)));
    m.comment(m.jobs[0].id, actor("u-admin", "admin"), "Olá");
    const writes = diff(before, JSON.parse(JSON.stringify(m.snapshot)));
    expect(writes.map((w) => `${w.collection}/${w.id}`)).toEqual([`jobs/${m.jobs[0].id}`]);
  });

  it("senha do cofre vai cifrada para o banco e volta igual", () => {
    const before = data();
    const after = JSON.parse(JSON.stringify(before));
    after.credentials[0].notes = "mudou";
    const [w] = diff(before, after);
    expect(JSON.stringify(w.doc)).not.toContain(before.credentials[0].secret);
    expect(decryptSecret(String(w.doc!.secretEnc))).toBe(before.credentials[0].secret);
    expect(encryptSecret("abc")).not.toBe(encryptSecret("abc")); // IV aleatório
  });

  it("senha de login com scrypt e sal aleatório", async () => {
    const h = await hashPassword("SenhaForte123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("SenhaForte123", h)).toBe(true);
    expect(await verifyPassword("errada", h)).toBe(false);
    expect(await hashPassword("SenhaForte123")).not.toBe(h);
  });
});

describe("UT-08 pagamento PIX e repasse", () => {
  const pending = (m: MarketplaceStore) => m.charges.find((c) => c.status === "pending" && m.order(c.orderId)?.status === "awaiting_payment")!;

  it("com o Mercado Pago ligado, só o retorno do pagamento (ou a KreativeArt) confirma", () => {
    const m = new MarketplaceStore(data());
    const c = pending(m);
    const client = actor(c.clientId, "client");
    expect(runCommand(m, client, "payCharge", [c.id, client], { paymentsLive: true }).error).toMatch(/automaticamente/);
    expect(m.charge(c.id)!.status).toBe("pending");
    expect(runCommand(m, client, "payCharge", [c.id, client], { paymentsLive: false }).error).toBeNull(); // demonstração
  });

  it("aprovação do Mercado Pago confirma a cobrança, ativa o pedido e registra o repasse", () => {
    const m = new MarketplaceStore(data());
    const c = pending(m);
    m.attachPayment(c.id, { provider: "mercadopago", paymentId: "123", status: "pending", split: false, qrCode: "000201", qrCodeBase64: "", expiresAt: "2099-01-01T00:00:00Z", createdAt: "2026-10-10T00:00:00Z" });
    expect(m.confirmPayment(c.id, { mode: "manual", status: "pending" })).toBeNull();
    expect(m.charge(c.id)!.status).toBe("paid");
    expect(m.charge(c.id)!.payment!.status).toBe("approved");
    expect(m.order(c.orderId)!.status).toBe("active");
    expect(m.confirmPayment(c.id, { mode: "manual", status: "pending" })).toBeNull(); // repetido (webhook + tela) não duplica
    expect(m.jobs.filter((j) => j.orderId === c.orderId).length).toBeGreaterThan(0);
  });

  it("repasse manual: só a KreativeArt marca, e só uma vez", () => {
    const m = new MarketplaceStore(data());
    const c = pending(m);
    m.confirmPayment(c.id, { mode: "manual", status: "pending" });
    expect(runCommand(m, actor(c.designerId, "designer"), "markPayoutDone", [c.id]).error).toMatch(/não permitida/);
    expect(runCommand(m, actor("u-admin", "admin"), "markPayoutDone", [c.id]).error).toBeNull();
    expect(m.charge(c.id)!.payout).toMatchObject({ mode: "manual", status: "done" });
    expect(m.markPayoutDone(c.id)).toMatch(/Não há repasse/);
  });

  it("split: repasse já feito pelo Mercado Pago", () => {
    const m = new MarketplaceStore(data());
    const c = pending(m);
    m.confirmPayment(c.id, { mode: "split", status: "done" });
    expect(m.markPayoutDone(c.id)).toMatch(/Não há repasse/);
  });
});
