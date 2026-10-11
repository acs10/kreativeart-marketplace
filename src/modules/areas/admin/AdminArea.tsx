"use client";

import { AlertTriangle, BarChart3, Briefcase, CheckCircle2, CreditCard, LayoutDashboard, Package, PauseCircle, Settings2, ShoppingBag, Users, UserSquare2, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { daysBetween, formatDay, formatPercent, formatPrice, todayKey } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { BarList, ChartCard, ColumnChart, Donut } from "@/core/ui/charts";
import { Badge, Button, Card, Field, Modal, PageHeader, SelectField, StatCard, Tabs } from "@/core/ui/ui";
import { PIX_KEY_TYPES, type Account, type PixKeyType } from "@/modules/accounts/domain/types";
import { ChargesTable } from "@/modules/billing/components/BillingParts";
import { chargeState, type ChargeState } from "@/modules/billing/domain/types";
import { adminMetrics } from "@/modules/insights/metrics";
import { LEVEL_LABEL, LEVEL_STYLE } from "@/modules/insights/performance";
import { JobDetailModal } from "@/modules/jobs/components/JobDetailModal";
import { JobFlags, JobStatusBadge } from "@/modules/jobs/components/JobParts";
import { isLate, JOB_STATUS_LABEL, type JobStatus } from "@/modules/jobs/domain/types";
import { OrderDetailModal, OrderRow } from "@/modules/orders/components/OrderParts";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/modules/orders/domain/types";
import { AreaShell } from "@/modules/platform/AreaShell";
import { usePlatform } from "@/modules/platform/PlatformProvider";
import { CatalogManager } from "./CatalogManager";

const th = "px-3 py-2 text-left text-caption font-semibold uppercase tracking-wide text-gray-500";
const td = "px-3 py-2";

export const AdminLayout = observer(function AdminLayout({ children }: { children: ReactNode }) {
  const { market } = usePlatform();
  const today = todayKey();
  const nav = [
    { href: "/admin", label: "Painel", icon: <LayoutDashboard className="size-4" /> },
    { href: "/admin/inteligencia", label: "Inteligência", icon: <BarChart3 className="size-4" /> },
    { href: "/admin/pedidos", label: "Pedidos", icon: <ShoppingBag className="size-4" />, count: market.openOrders.length },
    { href: "/admin/entregas", label: "Entregas", icon: <Package className="size-4" />, count: market.jobs.filter((j) => isLate(j) && !market.isPaused(j, today)).length },
    { href: "/admin/designers", label: "Designers", icon: <UserSquare2 className="size-4" />, count: market.designers.filter((d) => d.status === "pending").length },
    { href: "/admin/clientes", label: "Clientes", icon: <Users className="size-4" /> },
    { href: "/admin/financeiro", label: "Financeiro", icon: <Wallet className="size-4" /> },
    { href: "/admin/catalogo", label: "Serviços e planos", icon: <Briefcase className="size-4" /> },
    { href: "/admin/configuracoes", label: "Configurações", icon: <Settings2 className="size-4" /> },
  ];
  return <AreaShell role="admin" nav={nav}>{children}</AreaShell>;
});

const DesignerRanking = observer(function DesignerRanking({ limit }: { limit?: number }) {
  const { market: m } = usePlatform();
  const rows = adminMetrics(m, todayKey()).designers.slice(0, limit);
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[640px] text-small">
        <thead className="bg-gray-50"><tr><th className={th}>Designer</th><th className={th}>Meta</th><th className={`${th} text-right`}>No prazo</th><th className={`${th} text-right`}>Atrasadas</th><th className={`${th} text-right`}>Em aberto</th><th className={`${th} text-right`}>Ajustes/peça</th><th className={`${th} text-right`}>Recebido</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ account: d, perf, earned, load }) => (
            <tr key={d.id}>
              <td className={td}><p className="font-semibold">{d.name}</p><p className="text-caption text-gray-500">{d.specialties?.join(", ")}{d.status === "suspended" && " · suspenso"}</p></td>
              <td className={td}><Badge className={LEVEL_STYLE[perf.level]}>{LEVEL_LABEL[perf.level]}</Badge></td>
              <td className={`${td} text-right`}>{perf.onTimeRate === null ? "—" : `${formatPercent(perf.onTimeRate)} (${perf.onTime}/${perf.submitted})`}</td>
              <td className={`${td} text-right ${perf.lateNow ? "font-bold text-red-600" : ""}`}>{perf.lateNow}</td>
              <td className={`${td} text-right`}>{load} <span className="text-caption text-gray-400">/ {d.weeklyCapacity}/sem</span></td>
              <td className={`${td} text-right`}>{perf.avgRevisions.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
              <td className={`${td} text-right`}>{formatPrice(earned)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export const AdminDashboard = observer(function AdminDashboard() {
  const { market: m } = usePlatform();
  const today = todayKey();
  const k = adminMetrics(m, today);
  const alerts = k.designers.filter((d) => d.perf.level === "atrasando" || d.perf.level === "atencao");
  return (
    <>
      <PageHeader title="Painel da KreativeArt" subtitle={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Faturamento do mês" value={formatPrice(k.gmvMonth)} icon={<CreditCard className="size-5" />} note="pago pelos clientes aos designers" />
        <StatCard label="Comissão do mês" value={formatPrice(k.commissionMonth)} icon={<Wallet className="size-5" />} color="text-purple-700" note={`${formatPercent(m.settings.commissionRate)} · a receber ${formatPrice(k.toReceiveFee)}`} />
        <StatCard label="Peças atrasadas" value={k.lateJobs} icon={<AlertTriangle className="size-5" />} color={k.lateJobs ? "text-red-600" : "text-gray-900"} note={`${k.pausedJobs} pausada(s) por pagamento`} />
        <StatCard label="No prazo (mês)" value={k.onTimeMonth === null ? "—" : formatPercent(k.onTimeMonth)} icon={<CheckCircle2 className="size-5" />} color="text-green-600" note={`${k.deliveredMonth} entregue(s) no mês`} />
        <StatCard label="Pedidos ativos" value={k.activeOrders} icon={<ShoppingBag className="size-5" />} note={`${k.openOrders} esperando designer`} />
        <StatCard label="Clientes ativos" value={k.activeClients} icon={<Users className="size-5" />} />
        <StatCard label="Designers ativos" value={k.activeDesigners} icon={<UserSquare2 className="size-5" />} note={k.pendingDesigners ? `${k.pendingDesigners} aguardando aprovação` : undefined} noteClass="text-amber-700" />
        <StatCard label="Cobranças em atraso" value={k.overdueCharges.length} icon={<PauseCircle className="size-5" />} color={k.overdueCharges.length ? "text-red-600" : "text-gray-900"} note={formatPrice(k.overdueCharges.reduce((s, c) => s + c.amount, 0))} />
      </div>
      {alerts.length > 0 && (
        <Card className="space-y-2 border-red-200 p-5">
          <h2 className="flex items-center gap-2 font-bold text-red-800"><AlertTriangle className="size-5" /> Designers que precisam de atenção</h2>
          {alerts.map(({ account: d, perf }) => (
            <p key={d.id} className="text-small"><Badge className={LEVEL_STYLE[perf.level]}>{LEVEL_LABEL[perf.level]}</Badge> <strong>{d.name}</strong>: {perf.lateNow} atrasada(s), {perf.onTimeRate === null ? "sem histórico" : `${formatPercent(perf.onTimeRate)} no prazo`} (meta {formatPercent(m.settings.onTimeGoal)})</p>
          ))}
        </Card>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Faturamento x comissão (6 meses)" subtitle="Valores pagos pelos clientes">
          <ColumnChart data={k.revenueSeries.map((r) => ({ label: r.label, value: r.gmv, hint: `comissão ${formatPrice(r.fee)}` }))} format={formatPrice} height={180} />
        </ChartCard>
        <ChartCard title="Pedidos por situação">
          <Donut data={k.ordersByStatus.filter((s) => s.value).map((s) => ({ label: ORDER_STATUS_LABEL[s.status], value: s.value }))} format={(n) => `${n} pedido(s)`} />
        </ChartCard>
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Desempenho dos designers</h2><Link href="/admin/designers" className="text-small font-semibold text-purple-700">Gerenciar →</Link></div>
        <DesignerRanking />
      </section>
    </>
  );
});

export const AdminInsights = observer(function AdminInsights() {
  const { market: m } = usePlatform();
  const k = adminMetrics(m, todayKey());
  return (
    <>
      <PageHeader title="Inteligência do negócio" subtitle="Receita, entregas e clientes para decidir onde crescer." />
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Comissão da KreativeArt por mês"><ColumnChart data={k.revenueSeries.map((r) => ({ label: r.label, value: r.fee }))} format={formatPrice} height={180} /></ChartCard>
        <ChartCard title="Peças entregues por mês"><ColumnChart data={k.deliveredSeries} format={(n) => `${n} peça(s)`} height={180} /></ChartCard>
        <ChartCard title="Faturamento por cliente"><BarList rows={k.revenueByClient} format={formatPrice} /></ChartCard>
        <ChartCard title="Peças por tipo"><Donut data={k.jobsByType} format={(n) => `${n} peça(s)`} /></ChartCard>
      </div>
      <Card className="grid gap-4 p-5 text-small sm:grid-cols-3">
        <div><p className="text-gray-500">Comissão acumulada</p><p className="text-2xl font-bold text-purple-700">{formatPrice(k.commissionTotal)}</p></div>
        <div><p className="text-gray-500">Ticket médio mensal (planos ativos)</p><p className="text-2xl font-bold">{formatPrice(avg(m.orders.filter((o) => o.status === "active" && o.kind === "plan").map((o) => o.price)))}</p></div>
        <div><p className="text-gray-500">Taxa de cancelamento</p><p className="text-2xl font-bold">{m.orders.length ? formatPercent(m.orders.filter((o) => o.status === "cancelled").length / m.orders.length) : "—"}</p></div>
      </Card>
      <section><h2 className="mb-3 text-lg font-bold">Ranking de pontualidade</h2><DesignerRanking /></section>
    </>
  );
});
const avg = (list: number[]) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

export const AdminOrders = observer(function AdminOrders() {
  const { market: m } = usePlatform();
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [orderId, setOrderId] = useState<string | null>(null);
  const list = m.orders.filter((o) => status === "all" || o.status === status);
  return (
    <>
      <PageHeader title="Pedidos" subtitle="Todos os pedidos da plataforma. Atribua designers aos que estão parados." />
      <Tabs value={status} onChange={setStatus} options={[{ value: "all", label: "Todos", count: m.orders.length }, ...(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s], count: m.orders.filter((o) => o.status === s).length }))]} />
      <div className="grid gap-4 lg:grid-cols-2">{list.map((o) => <OrderRow key={o.id} order={o} showClient showDesigner onOpen={() => setOrderId(o.id)} />)}</div>
      {orderId && <OrderDetailModal orderId={orderId} onClose={() => setOrderId(null)} />}
    </>
  );
});

export const AdminJobs = observer(function AdminJobs() {
  const { market: m } = usePlatform();
  const [filter, setFilter] = useState<"late" | "open" | "review" | "all">("late");
  const [designer, setDesigner] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const today = todayKey();
  const match = (status: JobStatus, j: (typeof m.jobs)[number]) =>
    filter === "all" || (filter === "late" ? isLate(j) && !m.isPaused(j, today) : filter === "review" ? status === "in_review" : !["approved", "delivered"].includes(status));
  const list = m.jobs.filter((j) => match(j.status, j) && (!designer || j.designerId === designer)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <>
      <PageHeader title="Entregas" subtitle="Acompanhe prazos de todas as peças." />
      <div className="flex flex-wrap items-end gap-3">
        <Tabs value={filter} onChange={setFilter} options={[{ value: "late", label: "Atrasadas" }, { value: "open", label: "Em aberto" }, { value: "review", label: "Com o cliente" }, { value: "all", label: "Todas" }]} />
        <SelectField label="Designer" className="w-56" value={designer} onChange={(e) => setDesigner(e.target.value)}><option value="">Todos</option>{m.designers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</SelectField>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-small">
          <thead className="bg-gray-50"><tr><th className={th}>Peça</th><th className={th}>Cliente</th><th className={th}>Designer</th><th className={th}>Prazo</th><th className={th}>Situação</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {list.slice(0, 200).map((j) => (
              <tr key={j.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setJobId(j.id)}>
                <td className={`${td} font-medium`}>{j.title}</td>
                <td className={td}>{m.nameOf(j.clientId)}</td>
                <td className={td}>{m.nameOf(j.designerId)}</td>
                <td className={`${td} whitespace-nowrap ${isLate(j) ? "font-semibold text-red-600" : ""}`}>{formatDay(j.dueDate)}{isLate(j) && ` (${daysBetween(j.dueDate, today)}d)`}</td>
                <td className={td}><div className="flex flex-wrap gap-1"><JobStatusBadge status={j.status} /><JobFlags job={j} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-6 text-center text-small text-gray-500">Nenhuma peça neste filtro. {filter === "late" && "🎉"}</p>}
      </div>
      {jobId && <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />}
    </>
  );
});

export const AdminDesigners = observer(function AdminDesigners() {
  const { market: m } = usePlatform();
  const [view, setView] = useState<Account | null>(null);
  const pending = m.designers.filter((d) => d.status === "pending");
  const setStatus = (d: Account, s: Account["status"]) => {
    const err = m.setAccountStatus(d.id, s);
    if (err) return toast.error(err);
    toast.success(s === "active" ? `${d.name} aprovado(a).` : `${d.name} suspenso(a).`);
    setView(null);
  };
  return (
    <>
      <PageHeader title="Designers" subtitle={`Meta: ${formatPercent(m.settings.onTimeGoal)} das peças no prazo · alerta a partir de ${m.settings.lateAlert} atrasadas`} />
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Aguardando aprovação</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((d) => (
              <Card key={d.id} className="space-y-2 p-5">
                <p className="text-lg font-bold">{d.name}</p>
                <p className="text-small text-gray-600">{d.email} · {d.phone}</p>
                <p className="text-small">{d.bio}</p>
                <p className="text-small"><span className="text-gray-500">Especialidades:</span> {d.specialties?.join(", ")}</p>
                {d.portfolioUrl && <a href={d.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-small font-semibold text-purple-700 hover:underline">Ver portfólio ↗</a>}
                <div className="flex gap-2 pt-2"><Button variant="success" size="sm" onClick={() => setStatus(d, "active")}>Aprovar</Button><Button variant="danger" size="sm" onClick={() => setStatus(d, "suspended")}>Recusar</Button></div>
              </Card>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-bold">Equipe e desempenho</h2>
        <DesignerRanking />
        <div className="mt-3 flex flex-wrap gap-2">{m.designers.filter((d) => d.status !== "pending").map((d) => <Button key={d.id} size="sm" variant="secondary" onClick={() => setView(d)}>{d.name}</Button>)}</div>
      </section>
      {view && (
        <Modal title={view.name} description={`${view.email} · ${view.phone}`} onClose={() => setView(null)} footer={view.status === "active" ? <Button variant="danger" onClick={() => setStatus(view, "suspended")}>Suspender</Button> : <Button variant="success" onClick={() => setStatus(view, "active")}>Reativar</Button>}>
          <p className="text-small">{view.bio}</p>
          <p className="text-small"><span className="text-gray-500">PIX:</span> {view.pixKeyType} {view.pixKey} · <span className="text-gray-500">Documento:</span> {view.document}</p>
          <p className="text-small"><span className="text-gray-500">Pedidos ativos:</span> {m.ordersFor(view.id).filter((o) => o.status === "active").map((o) => `${o.number} (${m.nameOf(o.clientId)})`).join(", ") || "nenhum"}</p>
        </Modal>
      )}
    </>
  );
});

const FIN_LABEL = { "em-dia": ["Em dia", "bg-green-100 text-green-800"], "em-aberto": ["Em aberto", "bg-blue-100 text-blue-800"], "em-atraso": ["Em atraso", "bg-red-100 text-red-800"] } as const;

export const AdminClients = observer(function AdminClients() {
  const { market: m } = usePlatform();
  return (
    <>
      <PageHeader title="Clientes" subtitle="Contratos, situação financeira e acompanhamento." />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[720px] text-small">
          <thead className="bg-gray-50"><tr><th className={th}>Cliente</th><th className={th}>Contratos ativos</th><th className={th}>Financeiro</th><th className={`${th} text-right`}>Para aprovar</th><th className={`${th} text-right`}>Total pago</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {m.clients.map((c) => {
              const fin = FIN_LABEL[m.financialStatus(c.id)];
              return (
                <tr key={c.id}>
                  <td className={td}><p className="font-semibold">{c.company}</p><p className="text-caption text-gray-500">{c.name} · {c.email} · {c.phone}</p></td>
                  <td className={td}>{m.ordersOf(c.id).filter((o) => o.status === "active").map((o) => o.title).join(", ") || "—"}</td>
                  <td className={td}><Badge className={fin[1]}>{fin[0]}</Badge></td>
                  <td className={`${td} text-right`}>{m.jobsOf(c.id).filter((j) => j.status === "in_review").length}</td>
                  <td className={`${td} text-right`}>{formatPrice(m.chargesOf(c.id).filter((x) => x.status === "paid").reduce((s, x) => s + x.amount, 0))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
});

export const AdminFinance = observer(function AdminFinance() {
  const { market: m } = usePlatform();
  const today = todayKey();
  const [state, setState] = useState<ChargeState | "all">("all");
  const k = adminMetrics(m, today);
  const list = m.charges.filter((c) => state === "all" || chargeState(c, today) === state);
  return (
    <>
      <PageHeader title="Financeiro" subtitle={`Comissão de ${formatPercent(m.settings.commissionRate)} sobre cada cobrança paga · recebimento na chave ${m.settings.pixKeyType} ${m.settings.pixKey}`} action={<Link href="/admin/configuracoes"><Button variant="secondary">Alterar chave/comissão</Button></Link>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Faturamento do mês" value={formatPrice(k.gmvMonth)} icon={<CreditCard className="size-5" />} />
        <StatCard label="Comissão do mês" value={formatPrice(k.commissionMonth)} icon={<Wallet className="size-5" />} color="text-purple-700" />
        <StatCard label="Comissão a receber" value={formatPrice(k.toReceiveFee)} icon={<Wallet className="size-5" />} color="text-blue-600" note="de cobranças em aberto" />
        <StatCard label="Em atraso" value={formatPrice(k.overdueCharges.reduce((s, c) => s + c.amount, 0))} icon={<AlertTriangle className="size-5" />} color="text-red-600" note={`${k.overdueCharges.length} cobrança(s)`} />
      </div>
      <Tabs value={state} onChange={setState} options={[{ value: "all", label: "Todas" }, { value: "overdue", label: "Em atraso", count: k.overdueCharges.length }, { value: "pending", label: "Em aberto" }, { value: "paid", label: "Pagas" }, { value: "cancelled", label: "Canceladas" }]} />
      <ChargesTable charges={list} showClient showDesigner />
    </>
  );
});

export const AdminCatalog = CatalogManager;

export const AdminSettings = observer(function AdminSettings() {
  const { market: m } = usePlatform();
  const [s, setS] = useState({ ...m.settings, commissionPct: Math.round(m.settings.commissionRate * 100), goalPct: Math.round(m.settings.onTimeGoal * 100) });
  const save = () => {
    const { commissionPct, goalPct, ...rest } = s;
    const err = m.updateSettings({ ...rest, commissionRate: commissionPct / 100, onTimeGoal: goalPct / 100 });
    if (err) return toast.error(err);
    toast.success("Configurações salvas. A nova comissão vale para os próximos pedidos.");
  };
  return (
    <>
      <PageHeader title="Configurações" subtitle="Dados da empresa, recebimento e regras da plataforma (dados fictícios até você informar os reais)." action={<Button onClick={save}>Salvar</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Empresa</h2>
          <Field label="Razão social" value={s.companyName} onChange={(e) => setS({ ...s, companyName: e.target.value })} />
          <Field label="CNPJ" value={s.cnpj} onChange={(e) => setS({ ...s, cnpj: e.target.value })} />
          <Field label="E-mail" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} />
          <Field label="Telefone" value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} />
          <Field label="Cidade" value={s.city} onChange={(e) => setS({ ...s, city: e.target.value })} />
          <Field label="Instagram" value={s.instagram} onChange={(e) => setS({ ...s, instagram: e.target.value })} />
        </Card>
        <Card className="grid h-fit gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Recebimento e regras</h2>
          <SelectField label="Tipo da chave PIX" value={s.pixKeyType} onChange={(e) => setS({ ...s, pixKeyType: e.target.value as PixKeyType })}>{PIX_KEY_TYPES.map((t) => <option key={t}>{t}</option>)}</SelectField>
          <Field label="Chave PIX da KreativeArt" value={s.pixKey} onChange={(e) => setS({ ...s, pixKey: e.target.value })} />
          <Field label="Comissão (%)" type="number" min={0} max={50} value={s.commissionPct} onChange={(e) => setS({ ...s, commissionPct: Number(e.target.value) })} hint="Vale para pedidos novos." />
          <Field label="Tolerância de atraso (dias)" type="number" min={0} max={30} value={s.graceDays} onChange={(e) => setS({ ...s, graceDays: Number(e.target.value) })} hint="Depois disso, a produção pausa." />
          <Field label="Meta de pontualidade (%)" type="number" min={50} max={100} value={s.goalPct} onChange={(e) => setS({ ...s, goalPct: Number(e.target.value) })} />
          <Field label="Alerta a partir de N atrasadas" type="number" min={1} max={20} value={s.lateAlert} onChange={(e) => setS({ ...s, lateAlert: Number(e.target.value) })} />
        </Card>
      </div>
      <p className="text-caption text-gray-500">Status das peças: {Object.values(JOB_STATUS_LABEL).join(" → ")}.</p>
    </>
  );
});
