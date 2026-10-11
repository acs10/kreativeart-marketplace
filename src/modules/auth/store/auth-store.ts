import { makeAutoObservable } from "mobx";
import { EMAIL } from "@/core/lib/format";
import { displayName, type Account, type Role, type SignupInput } from "@/modules/accounts/domain/types";
import { api, hasState, type ServerState } from "@/modules/platform/api-client";
import type { Actor, MarketplaceStore } from "@/modules/platform/marketplace-store";

/**
 * Sessão do usuário. Login, cadastro e saída acontecem no servidor (senha com scrypt,
 * cookie HttpOnly assinado); aqui fica só o id da conta logada para as telas.
 */
export const DEMO_PASSWORD = "demo123";
export const DEMO_LOGINS: { role: Role; email: string; label: string }[] = [
  { role: "client", email: "contato@techsolutions.com", label: "Cliente" },
  { role: "designer", email: "ana@kreativeart.com", label: "Designer" },
  { role: "admin", email: "admin@kreativeart.com", label: "KreativeArt" },
];

export class AuthStore {
  accountId: string | null = null;

  constructor(
    private readonly market: MarketplaceStore,
    private readonly onState: (state: ServerState) => void,
  ) {
    makeAutoObservable<AuthStore, "market" | "onState">(this, { market: false, onState: false }, { autoBind: true });
  }

  get account(): Account | undefined {
    return this.market.account(this.accountId ?? undefined);
  }

  get role(): Role | undefined {
    return this.account?.role;
  }

  get actor(): Actor | null {
    const a = this.account;
    return a ? { id: a.id, name: displayName(a), role: a.role } : null;
  }

  setAccountId(id: string | null) {
    this.accountId = id;
  }

  async logout() {
    this.accountId = null;
    await api("/api/auth/logout", {});
    const r = await api("/api/state");
    if (hasState(r.body)) this.onState(r.body);
  }

  /** Devolve mensagem de erro ou null. Contas suspensas não entram. */
  async login(email: string, password: string): Promise<string | null> {
    const r = await api("/api/auth/login", { email, password });
    if (!r.ok || !hasState(r.body)) return r.body.error ?? "Não foi possível entrar agora.";
    this.onState(r.body);
    return null;
  }

  static validateSignup(input: SignupInput): Record<string, string> {
    const e: Record<string, string> = {};
    if (input.name.trim().length < 3) e.name = "Informe seu nome completo.";
    if (!EMAIL.test(input.email.trim())) e.email = "E-mail inválido.";
    if (input.password.length < 8) e.password = "A senha precisa de pelo menos 8 caracteres.";
    if (input.phone.replace(/\D/g, "").length < 10) e.phone = "Informe um telefone com DDD.";
    if (input.role === "client" && (input.company ?? "").trim().length < 2) e.company = "Informe a empresa ou marca.";
    if (input.role === "designer") {
      if (!input.specialties?.length) e.specialties = "Escolha ao menos uma especialidade.";
      if (!input.pixKeyType) e.pixKeyType = "Escolha o tipo da chave PIX.";
      if ((input.pixKey ?? "").trim().length < 4) e.pixKey = "Informe a chave PIX para receber os pagamentos.";
      if ((input.document ?? "").replace(/\D/g, "").length < 11) e.document = "Informe CPF ou CNPJ.";
    }
    return e;
  }

  /** Cria a conta e já entra. Designers ficam "em análise" até a KreativeArt aprovar. */
  async signup(input: SignupInput): Promise<Record<string, string>> {
    const errors = AuthStore.validateSignup(input);
    if (Object.keys(errors).length) return errors;
    const r = await api("/api/auth/signup", input);
    if (r.body.errors) return r.body.errors;
    if (!r.ok || !hasState(r.body)) return { email: r.body.error ?? "Não foi possível criar a conta agora." };
    this.onState(r.body);
    return {};
  }
}
