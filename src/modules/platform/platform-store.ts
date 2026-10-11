import { makeAutoObservable } from "mobx";
import { toast } from "sonner";
import { randomId, withIdSource } from "@/core/lib/format";
import { AuthStore } from "@/modules/auth/store/auth-store";
import { defaultSettings } from "@/modules/settings/types";
import { isCommand, type CommandName } from "./access/commands";
import { api, hasState, type ApiResult, type PaymentsInfo, type ServerState } from "./api-client";
import { MarketplaceStore, type MarketplaceData } from "./marketplace-store";

export const emptyData = (): MarketplaceData => ({ accounts: [], services: [], plans: [], orders: [], jobs: [], charges: [], credentials: [], settings: defaultSettings(), orderCounter: 0 });

/**
 * As telas chamam os métodos do MarketplaceStore normalmente. Cada ação que dá certo na tela
 * é enviada ao servidor com os mesmos argumentos e os ids gerados, e o servidor repete a ação
 * com as mesmas regras (e com o perfil da sessão). A tela responde na hora; o servidor confirma.
 */
function synced(raw: MarketplaceStore, send: (name: CommandName, args: unknown[], ids: string[]) => void): MarketplaceStore {
  // O alvo do Proxy é um objeto vazio (o MobX trava os métodos da instância real); tudo é lido de `raw`.
  const target = raw;
  return new Proxy(Object.create(MarketplaceStore.prototype) as MarketplaceStore, {
    set: (_, prop, value) => Reflect.set(target, prop, value, target),
    has: (_, prop) => Reflect.has(target, prop),
    get(_, prop) {
      const value = Reflect.get(target, prop, target) as unknown;
      if (typeof value !== "function" || !isCommand(prop)) return value;
      return (...args: unknown[]) => {
        const ids: string[] = [];
        const result = withIdSource(
          () => {
            const id = randomId();
            ids.push(id);
            return id;
          },
          () => (value as (...a: unknown[]) => unknown).apply(target, args),
        );
        if (typeof result !== "string") send(prop, JSON.parse(JSON.stringify(args)) as unknown[], ids);
        return result;
      };
    },
  });
}

/** Store raiz: dados vindos do servidor + sessão. */
export class PlatformStore {
  readonly market: MarketplaceStore;
  readonly auth: AuthStore;
  hydrated = false;
  /** Ações enviadas e ainda não confirmadas pelo servidor */
  pending = 0;
  /** Problema de conexão com o servidor (mostrado em faixa no topo) */
  syncError: string | null = null;
  storeKind: ServerState["store"];
  /** Mercado Pago (desligado = pagamento simulado da demonstração) */
  payments: PaymentsInfo = { enabled: false, testMode: false, oauth: false };
  private chain: Promise<void> = Promise.resolve();

  constructor(initial?: ServerState | null) {
    this.market = synced(new MarketplaceStore(emptyData()), (name, args, ids) => this.send(name, args, ids));
    this.auth = new AuthStore(this.market, (state) => this.apply(state));
    makeAutoObservable<PlatformStore, "chain">(this, { market: false, auth: false, chain: false }, { autoBind: true });
    if (initial) this.apply(initial);
  }

  apply(state: ServerState) {
    this.market.replaceAll(state.data);
    this.auth.setAccountId(state.me);
    this.storeKind = state.store;
    if (state.payments) this.payments = state.payments;
    this.hydrated = true;
  }

  /** Espera o servidor confirmar todas as ações enviadas. */
  flush(): Promise<void> {
    return this.chain;
  }

  /** Busca o estado atual (outros usuários podem ter mudado algo). */
  async refresh() {
    const r = await api("/api/state");
    this.received(r, false);
  }

  private send(name: CommandName, args: unknown[], ids: string[]) {
    this.pending += 1;
    this.chain = this.chain.then(async () => this.received(await api("/api/command", { name, args, ids }), true));
  }

  private received(r: ApiResult, fromCommand: boolean) {
    if (fromCommand) this.pending -= 1;
    if (r.status === 0) {
      this.syncError = r.body.error ?? "Sem conexão com o servidor.";
      if (fromCommand) toast.error("A última alteração não chegou ao servidor. Recarregue a página.");
      return;
    }
    this.syncError = r.status === 503 ? (r.body.error ?? "Banco de dados indisponível.") : null;
    if (fromCommand && !r.ok) toast.error(r.body.error ?? "Não foi possível salvar a alteração.");
    // Erro: volta para o que o servidor tem. Sucesso: aplica quando não há outras ações na fila.
    if (hasState(r.body) && (!r.ok || this.pending === 0)) this.apply(r.body);
    else if (r.status === 401) void this.refresh();
  }

  /** Designer: pede a senha de um acesso do cofre ao servidor (fica registrado para o cliente). */
  async revealCredential(id: string): Promise<string | { secret: string }> {
    const r = await api("/api/credentials/reveal", { id });
    if (!r.ok || typeof r.body.secret !== "string") return r.body.error ?? "Não foi possível revelar agora.";
    if (hasState(r.body) && this.pending === 0) this.apply(r.body);
    return { secret: r.body.secret };
  }

  /** Cliente: gera (ou reaproveita) o PIX da cobrança no Mercado Pago. */
  async startPix(chargeId: string): Promise<string | null> {
    const r = await api("/api/payments/pix", { chargeId });
    if (hasState(r.body) && this.pending === 0) this.apply(r.body);
    return r.ok ? null : (r.body.error ?? "Não foi possível gerar o PIX.");
  }

  /** Pergunta ao servidor se o PIX já foi pago (ele consulta o Mercado Pago). */
  async syncPix(chargeId: string): Promise<void> {
    const r = await api("/api/payments/sync", { chargeId });
    if (hasState(r.body) && this.pending === 0) this.apply(r.body);
  }

  /** Designer: desconecta a conta Mercado Pago. */
  async disconnectMercadoPago(): Promise<string | null> {
    const r = await api("/api/mp/disconnect", {});
    if (hasState(r.body)) this.apply(r.body);
    return r.ok ? null : (r.body.error ?? "Não foi possível desconectar.");
  }

  /** KreativeArt: recria os dados demonstrativos no banco. */
  async resetDemo(): Promise<string | null> {
    const r = await api("/api/admin/reset", {});
    if (!r.ok) return r.body.error ?? "Não foi possível restaurar.";
    await this.refresh();
    return null;
  }
}
