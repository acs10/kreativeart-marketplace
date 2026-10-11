import type { Account } from "@/modules/accounts/domain/types";
import type { Credential } from "@/modules/vault/domain/types";
import type { Actor, MarketplaceData } from "../marketplace-store";

/**
 * O que cada perfil recebe do servidor. Ninguém recebe hash de senha nem senha do cofre
 * (o designer autorizado pede a senha à parte, e isso fica registrado).
 *  - visitante: catálogo, configurações públicas e perfil público dos designers ativos;
 *  - cliente: a própria conta e os próprios pedidos, peças, cobranças e cofre;
 *  - designer: a própria conta, os pedidos abertos e os dele, e os clientes desses pedidos;
 *  - KreativeArt: tudo.
 */
export function viewFor(data: MarketplaceData, actor: Actor | null): MarketplaceData {
  const base = { services: data.services, plans: data.plans, settings: data.settings, orderCounter: data.orderCounter };
  const designersPublic = data.accounts.filter((a) => a.role === "designer" && a.status === "active").map(publicProfile);
  if (!actor) return { ...base, accounts: designersPublic, orders: [], jobs: [], charges: [], credentials: [] };

  if (actor.role === "admin") {
    return { ...data, accounts: data.accounts.map(withoutPassword), credentials: data.credentials.map(withoutSecret) };
  }

  const self = data.accounts.find((a) => a.id === actor.id);
  const admins = data.accounts.filter((a) => a.role === "admin").map(publicProfile);

  if (actor.role === "client") {
    const orders = data.orders.filter((o) => o.clientId === actor.id);
    const charges = data.charges.filter((c) => c.clientId === actor.id);
    // Designers dos pedidos do cliente: inclui a chave PIX (o cliente paga direto para ele).
    const linked = new Set([...orders.map((o) => o.designerId), ...charges.map((c) => c.designerId)]);
    const designers = data.accounts
      .filter((a) => a.role === "designer" && (a.status === "active" || linked.has(a.id)))
      .map((a) => (linked.has(a.id) ? { ...publicProfile(a), phone: a.phone, pixKeyType: a.pixKeyType, pixKey: a.pixKey } : publicProfile(a)));
    return {
      ...base,
      accounts: [...(self ? [withoutPassword(self)] : []), ...designers, ...admins],
      orders,
      jobs: data.jobs.filter((j) => j.clientId === actor.id),
      charges,
      credentials: data.credentials.filter((c) => c.clientId === actor.id),
    };
  }

  // designer
  const orders = data.orders.filter((o) => o.designerId === actor.id || o.status === "awaiting_designer");
  const mine = new Set(orders.filter((o) => o.designerId === actor.id).map((o) => o.id));
  const clientIds = new Set(orders.map((o) => o.clientId));
  const activeClients = new Set(orders.filter((o) => o.designerId === actor.id && o.status === "active").map((o) => o.clientId));
  const clients = data.accounts
    .filter((a) => clientIds.has(a.id))
    .map((a) => ({ ...publicProfile(a), phone: a.phone, instagram: a.instagram, brand: a.brand }));
  const designers = data.accounts.filter((a) => a.role === "designer" && a.id !== actor.id && a.status === "active").map(publicProfile);
  return {
    ...base,
    accounts: [...(self ? [withoutPassword(self)] : []), ...clients, ...designers, ...admins],
    orders,
    jobs: data.jobs.filter((j) => j.designerId === actor.id || mine.has(j.orderId)),
    charges: data.charges.filter((c) => c.designerId === actor.id),
    credentials: data.credentials.filter((c) => activeClients.has(c.clientId)).map(withoutSecret),
  };
}

function withoutPassword(a: Account): Account {
  return { ...a, passwordHash: "" };
}

function withoutSecret(c: Credential): Credential {
  return { ...c, secret: "" };
}

/** Só o que aparece publicamente: nome, empresa, perfil profissional. */
function publicProfile(a: Account): Account {
  return {
    id: a.id,
    role: a.role,
    name: a.name,
    email: "",
    passwordHash: "",
    phone: "",
    status: a.status,
    createdAt: a.createdAt,
    company: a.company,
    bio: a.bio,
    specialties: a.specialties,
    portfolioUrl: a.portfolioUrl,
    weeklyCapacity: a.weeklyCapacity,
  };
}
