import { makeAutoObservable } from "mobx";
import { addDays, newId, todayKey } from "@/core/lib/format";
import { displayName, type Account, type BrandKit } from "@/modules/accounts/domain/types";
import { splitAmount, chargeState, daysOverdue, type Charge, type ChargePayment, type Payout } from "@/modules/billing/domain/types";
import type { Plan, Service } from "@/modules/catalog/domain/types";
import { buildJobs, firstPlanMonth, monthlyDueDate } from "@/modules/jobs/domain/schedule";
import type { CommentKind, FileRef, Job, JobStatus } from "@/modules/jobs/domain/types";
import { planMonths, type Briefing, type Order, type OrderLine } from "@/modules/orders/domain/types";
import type { Settings } from "@/modules/settings/types";
import type { Credential, CredentialInput } from "@/modules/vault/domain/types";

export interface MarketplaceData {
  accounts: Account[];
  services: Service[];
  plans: Plan[];
  orders: Order[];
  jobs: Job[];
  charges: Charge[];
  credentials: Credential[];
  settings: Settings;
  orderCounter: number;
}

export interface Actor {
  id: string;
  name: string;
  role: "client" | "designer" | "admin";
}

/** null = deu certo; texto = motivo do erro (exibido ao usuário). */
type Result = string | null;

/**
 * Todos os dados e regras da plataforma. As telas só chamam estes métodos.
 * Quando houver servidor (Firebase), cada método vira uma chamada ao backend
 * com as mesmas regras — por isso tudo aqui é validado e devolve mensagens.
 */
export class MarketplaceStore {
  accounts: Account[];
  services: Service[];
  plans: Plan[];
  orders: Order[];
  jobs: Job[];
  charges: Charge[];
  credentials: Credential[];
  settings: Settings;
  orderCounter: number;

  constructor(data: MarketplaceData) {
    this.accounts = data.accounts;
    this.services = data.services;
    this.plans = data.plans;
    this.orders = data.orders;
    this.jobs = data.jobs;
    this.charges = data.charges;
    this.credentials = data.credentials;
    this.settings = data.settings;
    this.orderCounter = data.orderCounter;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get snapshot(): MarketplaceData {
    return {
      accounts: this.accounts,
      services: this.services,
      plans: this.plans,
      orders: this.orders,
      jobs: this.jobs,
      charges: this.charges,
      credentials: this.credentials,
      settings: this.settings,
      orderCounter: this.orderCounter,
    };
  }

  replaceAll(data: MarketplaceData) {
    Object.assign(this, data);
  }

  // ------------------------------------------------------------------ consultas

  account(id?: string) {
    return this.accounts.find((a) => a.id === id);
  }
  nameOf(id?: string) {
    const a = this.account(id);
    return a ? displayName(a) : "—";
  }
  service(id?: string) {
    return this.services.find((s) => s.id === id);
  }
  plan(id?: string) {
    return this.plans.find((p) => p.id === id);
  }
  order(id?: string) {
    return this.orders.find((o) => o.id === id);
  }
  job(id?: string) {
    return this.jobs.find((j) => j.id === id);
  }
  charge(id?: string) {
    return this.charges.find((c) => c.id === id);
  }

  get clients() {
    return this.accounts.filter((a) => a.role === "client");
  }
  get designers() {
    return this.accounts.filter((a) => a.role === "designer");
  }
  get activeServices() {
    return this.services.filter((s) => s.active);
  }
  get activePlans() {
    return this.plans.filter((p) => p.active);
  }

  ordersOf(clientId: string) {
    return this.orders.filter((o) => o.clientId === clientId);
  }
  ordersFor(designerId: string) {
    return this.orders.filter((o) => o.designerId === designerId);
  }
  jobsOf(clientId: string) {
    return this.jobs.filter((j) => j.clientId === clientId);
  }
  jobsFor(designerId: string) {
    return this.jobs.filter((j) => j.designerId === designerId);
  }
  chargesOf(clientId: string) {
    return this.charges.filter((c) => c.clientId === clientId);
  }
  chargesFor(designerId: string) {
    return this.charges.filter((c) => c.designerId === designerId);
  }
  credentialsOf(clientId: string) {
    return this.credentials.filter((c) => c.clientId === clientId);
  }
  /** Pedidos esperando designer (vitrine de oportunidades). */
  get openOrders() {
    return this.orders.filter((o) => o.status === "awaiting_designer");
  }

  /**
   * Produção pausada: a cobrança do mês (ou do serviço) está atrasada além da tolerância.
   * O designer não é cobrado pelo prazo dessas peças enquanto estiverem pausadas.
   */
  isPaused(job: Job, today = todayKey()): boolean {
    const charge = this.charges.find((c) => c.orderId === job.orderId && (job.period ? c.period === job.period : true) && c.status !== "cancelled");
    return !!charge && daysOverdue(charge, today) > this.settings.graceDays;
  }

  /** Situação financeira do cliente: em dia, com cobrança em aberto ou em atraso. */
  financialStatus(clientId: string, today = todayKey()): "em-dia" | "em-aberto" | "em-atraso" {
    const states = this.chargesOf(clientId).map((c) => chargeState(c, today));
    if (states.includes("overdue")) return "em-atraso";
    if (states.includes("pending")) return "em-aberto";
    return "em-dia";
  }

  // ------------------------------------------------------------------ contas

  addAccount(account: Account) {
    this.accounts.push(account);
    return this.accounts[this.accounts.length - 1];
  }

  emailInUse(email: string, exceptId?: string) {
    const e = email.trim().toLowerCase();
    return this.accounts.some((a) => a.email === e && a.id !== exceptId);
  }

  updateProfile(id: string, patch: Partial<Omit<Account, "id" | "role" | "passwordHash" | "createdAt" | "status">>): Result {
    const account = this.account(id);
    if (!account) return "Conta não encontrada.";
    if (patch.email !== undefined && this.emailInUse(patch.email, id)) return "Este e-mail já está em uso.";
    if (account.role === "designer" && patch.pixKey !== undefined && patch.pixKey.trim().length < 4) return "Informe a chave PIX para receber.";
    Object.assign(account, patch, patch.email ? { email: patch.email.trim().toLowerCase() } : {});
    return null;
  }

  updateBrand(clientId: string, brand: BrandKit): Result {
    const account = this.account(clientId);
    if (!account || account.role !== "client") return "Cliente não encontrado.";
    account.brand = brand;
    return null;
  }

  setAccountStatus(id: string, status: Account["status"]): Result {
    const account = this.account(id);
    if (!account) return "Conta não encontrada.";
    if (account.role === "admin") return "Contas da KreativeArt não podem ser alteradas aqui.";
    if (status === "suspended" && account.role === "designer" && this.ordersFor(id).some((o) => o.status === "active" || o.status === "awaiting_payment"))
      return "Este designer tem pedidos em andamento. Transfira os pedidos antes de suspender.";
    account.status = status;
    return null;
  }

  // ------------------------------------------------------------------ catálogo (admin)

  saveService(input: Omit<Service, "id"> & { id?: string }): Result {
    if (input.name.trim().length < 3) return "Informe o nome do serviço.";
    if (!(input.price > 0)) return "Informe um preço maior que zero.";
    if (!(input.deliveryDays >= 1)) return "O prazo deve ser de pelo menos 1 dia.";
    if (input.revisions < 0) return "Rodadas de ajuste inválidas.";
    const existing = input.id ? this.service(input.id) : undefined;
    if (existing) Object.assign(existing, input);
    else this.services.push({ ...input, id: newId() });
    return null;
  }

  savePlan(input: Omit<Plan, "id"> & { id?: string }): Result {
    if (input.name.trim().length < 3) return "Informe o nome do plano.";
    if (!(input.monthlyPrice > 0)) return "Informe a mensalidade.";
    const items = input.items.filter((i) => i.quantity > 0 && this.service(i.serviceId));
    if (!items.length) return "Inclua pelo menos um serviço no plano.";
    if (!(input.minMonths >= 1)) return "A fidelidade mínima é de 1 mês.";
    const existing = input.id ? this.plan(input.id) : undefined;
    if (existing) Object.assign(existing, { ...input, items });
    else this.plans.push({ ...input, items, id: newId() });
    return null;
  }

  updateSettings(patch: Partial<Settings>): Result {
    if (patch.commissionRate !== undefined && !(patch.commissionRate >= 0 && patch.commissionRate <= 0.5)) return "A comissão deve ficar entre 0% e 50%.";
    if (patch.pixKey !== undefined && patch.pixKey.trim().length < 4) return "Informe a chave PIX da KreativeArt.";
    Object.assign(this.settings, patch);
    return null;
  }

  // ------------------------------------------------------------------ contratação (cliente)

  /** Cria o pedido de um serviço avulso (quantidade) ou de um plano (meses). */
  placeOrder(client: Actor, input: { kind: "service"; serviceId: string; quantity: number; briefing: Briefing } | { kind: "plan"; planId: string; months: number; briefing: Briefing }): Order | string {
    const account = this.account(client.id);
    if (!account || account.role !== "client") return "Entre como cliente para contratar.";
    if (input.briefing.objective.trim().length < 10) return "Conte em poucas palavras o objetivo (mínimo 10 caracteres).";
    const now = new Date().toISOString();
    let lines: OrderLine[];
    let order: Order;
    const base = { id: newId(), number: this.nextNumber(), clientId: client.id, briefing: { ...input.briefing }, status: "awaiting_designer" as const, commissionRate: this.settings.commissionRate, createdAt: now };
    if (input.kind === "service") {
      const service = this.service(input.serviceId);
      if (!service?.active) return "Serviço indisponível.";
      if (!(input.quantity >= 1 && input.quantity <= 30)) return "Quantidade entre 1 e 30.";
      lines = [{ serviceId: service.id, serviceName: service.name, deliverable: service.deliverable, quantity: input.quantity, unitPrice: service.price, deliveryDays: service.deliveryDays, revisions: service.revisions }];
      order = { ...base, kind: "service", title: input.quantity > 1 ? `${input.quantity}× ${service.name}` : service.name, lines, price: service.price * input.quantity };
    } else {
      const plan = this.plan(input.planId);
      if (!plan?.active) return "Plano indisponível.";
      if (!(input.months >= plan.minMonths)) return `Este plano tem fidelidade mínima de ${plan.minMonths} meses.`;
      lines = plan.items.map((item) => {
        const s = this.service(item.serviceId)!;
        return { serviceId: s.id, serviceName: s.name, deliverable: s.deliverable, quantity: item.quantity, unitPrice: s.price, deliveryDays: s.deliveryDays, revisions: s.revisions };
      });
      order = { ...base, kind: "plan", planId: plan.id, title: `Plano ${plan.name}`, lines, price: plan.monthlyPrice, months: input.months, startMonth: firstPlanMonth(), billingDay: Math.min(new Date().getDate(), 28) };
    }
    this.orders.unshift(order);
    return this.orders[0];
  }

  cancelOrder(orderId: string, actor: Actor, reason: string): Result {
    const order = this.order(orderId);
    if (!order) return "Pedido não encontrado.";
    if (actor.role === "client" && (order.clientId !== actor.id || !["awaiting_designer", "awaiting_payment"].includes(order.status)))
      return "Pedidos em andamento só podem ser cancelados pela KreativeArt.";
    if (order.status === "completed" || order.status === "cancelled") return "Este pedido já foi encerrado.";
    if (reason.trim().length < 5) return "Informe o motivo do cancelamento.";
    order.status = "cancelled";
    order.cancelReason = reason.trim();
    order.closedAt = new Date().toISOString();
    for (const c of this.charges) if (c.orderId === orderId && c.status === "pending") c.status = "cancelled";
    return null;
  }

  // ------------------------------------------------------------------ designer

  /** O designer aceita o pedido: fica vinculado e a 1ª cobrança é gerada para a chave PIX dele. */
  acceptOrder(orderId: string, designer: Actor): Result {
    const account = this.account(designer.id);
    if (!account || account.role !== "designer") return "Entre como designer.";
    if (account.status !== "active") return "Seu cadastro ainda está em análise pela KreativeArt.";
    if (!account.pixKey) return "Cadastre sua chave PIX no perfil antes de aceitar pedidos.";
    const order = this.order(orderId);
    if (!order || order.status !== "awaiting_designer") return "Este pedido já foi aceito por outro designer.";
    this.assign(order, account);
    order.acceptedAt = new Date().toISOString();
    order.status = "awaiting_payment";
    this.createCharge(order, order.kind === "plan" ? order.startMonth : undefined, addDays(todayKey(), 2));
    return null;
  }

  /** KreativeArt atribui ou transfere o pedido para outro designer. */
  assignDesigner(orderId: string, designerId: string): Result {
    const order = this.order(orderId);
    const designer = this.account(designerId);
    if (!order || order.status === "completed" || order.status === "cancelled") return "Pedido encerrado.";
    if (!designer || designer.role !== "designer" || designer.status !== "active") return "Escolha um designer ativo.";
    if (!designer.pixKey) return "Esse designer ainda não cadastrou a chave PIX.";
    const first = order.status === "awaiting_designer";
    this.assign(order, designer);
    if (first) {
      order.acceptedAt = new Date().toISOString();
      order.status = "awaiting_payment";
      this.createCharge(order, order.kind === "plan" ? order.startMonth : undefined, addDays(todayKey(), 2));
    }
    return null;
  }

  private assign(order: Order, designer: Account) {
    order.designerId = designer.id;
    for (const job of this.jobs) if (job.orderId === order.id && job.status !== "delivered") job.designerId = designer.id;
    for (const c of this.charges) if (c.orderId === order.id && c.status === "pending") c.designerId = designer.id;
  }

  // ------------------------------------------------------------------ cobranças

  private createCharge(order: Order, period: string | undefined, dueDate: string) {
    if (this.charges.some((c) => c.orderId === order.id && c.period === period && c.status !== "cancelled")) return;
    const { platformFee, designerAmount } = splitAmount(order.price, order.commissionRate);
    this.charges.push({
      id: newId(),
      orderId: order.id,
      clientId: order.clientId,
      designerId: order.designerId!,
      description: period ? `${order.title} — mensalidade ${period.slice(5)}/${period.slice(0, 4)}` : order.title,
      period,
      amount: order.price,
      platformFee,
      designerAmount,
      dueDate,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Pagamento confirmado (hoje simulado; depois, pelo gateway com divisão automática:
   * parte do designer na chave PIX dele e a comissão para a KreativeArt).
   */
  payCharge(chargeId: string, actor: Actor): Result {
    const charge = this.charge(chargeId);
    if (!charge) return "Cobrança não encontrada.";
    if (actor.role === "client" && charge.clientId !== actor.id) return "Cobrança de outro cliente.";
    if (charge.status !== "pending") return "Esta cobrança não está em aberto.";
    charge.status = "paid";
    charge.paidAt = new Date().toISOString();
    const order = this.order(charge.orderId);
    if (!order) return null;
    if (order.status === "awaiting_payment") {
      order.status = "active";
      order.activatedAt = charge.paidAt;
    }
    this.ensureJobs(order, charge.period);
    return null;
  }

  /** Servidor: guarda o PIX gerado no Mercado Pago para a cobrança. */
  attachPayment(chargeId: string, payment: ChargePayment): Result {
    const charge = this.charge(chargeId);
    if (!charge || charge.status !== "pending") return "Esta cobrança não está em aberto.";
    charge.payment = payment;
    return null;
  }

  /** Servidor: atualiza a situação do PIX (pendente, recusado, expirado). */
  updatePaymentStatus(chargeId: string, status: ChargePayment["status"]) {
    const charge = this.charge(chargeId);
    if (charge?.payment) charge.payment.status = status;
  }

  /** Servidor: pagamento aprovado pelo Mercado Pago — confirma a cobrança e registra o repasse. */
  confirmPayment(chargeId: string, payout: Payout): Result {
    const charge = this.charge(chargeId);
    if (!charge) return "Cobrança não encontrada.";
    if (charge.status === "paid") return null;
    const err = this.payCharge(chargeId, { id: "mercadopago", name: "Mercado Pago", role: "admin" });
    if (err) return err;
    if (charge.payment) charge.payment.status = "approved";
    charge.payout = payout;
    return null;
  }

  /** KreativeArt confirma que fez o PIX da parte do designer (pagamentos sem divisão automática). */
  markPayoutDone(chargeId: string): Result {
    const charge = this.charge(chargeId);
    if (!charge || charge.status !== "paid") return "Cobrança não paga.";
    if (charge.payout?.mode !== "manual" || charge.payout.status === "done") return "Não há repasse pendente nesta cobrança.";
    charge.payout = { ...charge.payout, status: "done", doneAt: new Date().toISOString() };
    return null;
  }

  /** Servidor: conecta/desconecta a conta Mercado Pago do designer (só dados públicos; tokens ficam fora). */
  setMercadoPago(designerId: string, info: Account["mercadoPago"]) {
    const account = this.account(designerId);
    if (account?.role === "designer") account.mercadoPago = info;
  }

  private ensureJobs(order: Order, period?: string, today = todayKey()) {
    if (this.jobs.some((j) => j.orderId === order.id && j.period === period)) return;
    const now = new Date().toISOString();
    // Meses já passados (sistema ficou fechado) contam do dia 1; o mês atual, de hoje.
    const first = period ? `${period}-01` : undefined;
    // Plano que já estava ativo antes do mês começar: o mês conta do dia 1.
    const renewal = first && order.activatedAt && order.activatedAt.slice(0, 10) < first;
    const start = first && (renewal || period! < today.slice(0, 7) || first > today) ? first : today;
    for (const job of buildJobs(order, start, period)) {
      this.jobs.push({ ...job, id: newId(), createdAt: now, updatedAt: now, comments: [{ id: newId(), authorName: "KreativeArt", authorRole: "admin", kind: "status", text: "Peça criada no cronograma.", createdAt: now }] });
    }
  }

  /**
   * Rotina diária (roda ao abrir o sistema): para cada plano ativo, gera a mensalidade
   * e as peças de cada mês que já começou (a produção segue mesmo antes do pagamento;
   * se a mensalidade atrasar além da tolerância, as peças do mês ficam pausadas).
   * Também encerra pedidos cumpridos.
   */
  tick(today = todayKey()) {
    const month = today.slice(0, 7);
    for (const order of this.orders) {
      if (order.status !== "active") continue;
      if (order.kind === "plan") {
        for (const m of planMonths(order)) {
          if (m > month) continue;
          this.createCharge(order, m, monthlyDueDate(m, order.billingDay ?? 10));
          this.ensureJobs(order, m, today);
        }
      }
      const jobs = this.jobs.filter((j) => j.orderId === order.id);
      const lastMonth = planMonths(order).at(-1);
      const timeOver = order.kind === "service" || (lastMonth !== undefined && lastMonth < month);
      if (timeOver && jobs.length > 0 && jobs.every((j) => j.status === "delivered")) {
        order.status = "completed";
        order.closedAt = new Date().toISOString();
      }
    }
  }

  // ------------------------------------------------------------------ entregas

  private note(job: Job, actor: Actor, text: string, kind: CommentKind) {
    job.comments.push({ id: newId(), authorName: actor.name, authorRole: actor.role, kind, text, createdAt: new Date().toISOString() });
    job.updatedAt = new Date().toISOString();
  }

  private canWork(job: Job, actor: Actor): Result {
    if (actor.role === "designer" && job.designerId !== actor.id) return "Esta peça é de outro designer.";
    if (actor.role === "client") return "Ação exclusiva do designer.";
    return null;
  }

  /** Move no quadro: só entre "a fazer" e "em produção" (o resto tem ação própria). */
  moveJob(jobId: string, status: Extract<JobStatus, "todo" | "in_progress">, actor: Actor): Result {
    const job = this.job(jobId);
    if (!job) return "Peça não encontrada.";
    const denied = this.canWork(job, actor);
    if (denied) return denied;
    if (!["todo", "in_progress", "changes_requested"].includes(job.status)) return "Use as ações da peça para avançar.";
    if (job.status === "changes_requested" && status === "todo") return "Peças com ajuste voltam para produção.";
    job.status = status;
    this.note(job, actor, status === "in_progress" ? "Começou a produção." : "Voltou para a fila.", "status");
    return null;
  }

  /** Designer envia uma versão para o cliente aprovar (exige ao menos uma prévia). */
  submitVersion(jobId: string, actor: Actor, files: FileRef[], note: string, caption?: string): Result {
    const job = this.job(jobId);
    if (!job) return "Peça não encontrada.";
    const denied = this.canWork(job, actor);
    if (denied) return denied;
    if (!["todo", "in_progress", "changes_requested"].includes(job.status)) return "Esta peça não está em produção.";
    if (!files.some((f) => f.kind === "preview")) return "Envie pelo menos uma prévia (JPG, PNG, PDF ou vídeo) para o cliente aprovar.";
    const now = new Date().toISOString();
    job.versions.push({ number: job.versions.length + 1, files, note: note.trim(), createdAt: now });
    if (caption !== undefined) job.caption = caption.trim();
    job.firstSubmittedAt ??= now;
    job.status = "in_review";
    this.note(job, actor, `Versão ${job.versions.length} enviada para aprovação.${note.trim() ? ` ${note.trim()}` : ""}`, "submitted");
    return null;
  }

  approveJob(jobId: string, actor: Actor, text: string): Result {
    const job = this.job(jobId);
    if (!job || (actor.role === "client" && job.clientId !== actor.id)) return "Peça não encontrada.";
    if (job.status !== "in_review") return "Só é possível aprovar peças aguardando aprovação.";
    job.status = "approved";
    job.approvedAt = new Date().toISOString();
    this.note(job, actor, text.trim() || "Aprovado!", "approval");
    return null;
  }

  requestChanges(jobId: string, actor: Actor, text: string): Result {
    const job = this.job(jobId);
    if (!job || (actor.role === "client" && job.clientId !== actor.id)) return "Peça não encontrada.";
    if (job.status !== "in_review") return "Só é possível pedir ajustes em peças aguardando aprovação.";
    if (text.trim().length < 5) return "Explique quais ajustes são necessários.";
    job.status = "changes_requested";
    job.revisionsUsed += 1;
    const extra = job.revisionsUsed > job.revisionsIncluded ? ` (ajuste extra: o plano inclui ${job.revisionsIncluded})` : "";
    this.note(job, actor, text.trim() + extra, "changes");
    return null;
  }

  /** Designer confirma que publicou (rede social) ou entregou os arquivos finais. */
  markDelivered(jobId: string, actor: Actor, text: string): Result {
    const job = this.job(jobId);
    if (!job) return "Peça não encontrada.";
    const denied = this.canWork(job, actor);
    if (denied) return denied;
    if (job.status !== "approved") return "Só peças aprovadas pelo cliente podem ser entregues.";
    job.status = "delivered";
    job.deliveredAt = new Date().toISOString();
    this.note(job, actor, text.trim() || "Peça entregue.", "delivered");
    return null;
  }

  comment(jobId: string, actor: Actor, text: string): Result {
    const job = this.job(jobId);
    if (!job) return "Peça não encontrada.";
    if (!text.trim()) return "Escreva uma mensagem.";
    this.note(job, actor, text.trim(), "note");
    return null;
  }

  updateJobSchedule(jobId: string, actor: Actor, patch: Pick<Job, "publishDate" | "publishTime" | "caption">): Result {
    const job = this.job(jobId);
    if (!job) return "Peça não encontrada.";
    if (actor.role === "client" && job.clientId !== actor.id) return "Peça não encontrada.";
    Object.assign(job, patch);
    job.updatedAt = new Date().toISOString();
    return null;
  }

  // ------------------------------------------------------------------ cofre de acessos

  saveCredential(clientId: string, input: CredentialInput & { id?: string }): Result {
    if (input.login.trim().length < 3) return "Informe o usuário ou e-mail de login.";
    if (input.secret.length < 4) return "Informe a senha.";
    const now = new Date().toISOString();
    const existing = input.id ? this.credentials.find((c) => c.id === input.id && c.clientId === clientId) : undefined;
    if (existing) Object.assign(existing, { ...input, login: input.login.trim(), updatedAt: now });
    else this.credentials.push({ ...input, login: input.login.trim(), id: newId(), clientId, logs: [], createdAt: now, updatedAt: now });
    return null;
  }

  removeCredential(clientId: string, id: string) {
    this.credentials = this.credentials.filter((c) => !(c.id === id && c.clientId === clientId));
  }

  /** Designer só vê credenciais de clientes com quem tem pedido ativo — e cada revelação fica registrada. */
  canReveal(credential: Credential, designerId: string): boolean {
    return credential.shared && this.orders.some((o) => o.clientId === credential.clientId && o.designerId === designerId && o.status === "active");
  }

  revealCredential(id: string, designer: Actor): string | { secret: string } {
    const credential = this.credentials.find((c) => c.id === id);
    if (!credential) return "Acesso não encontrado.";
    if (designer.role !== "designer" || !this.canReveal(credential, designer.id)) return "Acesso não autorizado: o cliente pausou o compartilhamento ou você não tem pedido ativo com ele.";
    credential.logs.unshift({ id: newId(), designerId: designer.id, designerName: designer.name, at: new Date().toISOString() });
    return { secret: credential.secret };
  }

  // ------------------------------------------------------------------ util

  private nextNumber() {
    this.orderCounter += 1;
    return `KA-${new Date().getFullYear()}-${String(this.orderCounter).padStart(4, "0")}`;
  }
}
