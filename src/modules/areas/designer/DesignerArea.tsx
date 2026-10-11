"use client";

import { AlertTriangle, Briefcase, CalendarDays, Clock, KanbanSquare, LayoutDashboard, Sparkles, Target, UserCircle, Wallet } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { daysBetween, formatDay, formatPercent, formatPrice, maskPhone, todayKey } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Badge, Button, Card, EmptyState, Field, PageHeader, SelectField, StatCard, TextArea } from "@/core/ui/ui";
import { PIX_KEY_TYPES, SPECIALTIES, type PixKeyType, type Specialty } from "@/modules/accounts/domain/types";
import { ChargesTable, MercadoPagoCard } from "@/modules/billing/components/BillingParts";
import { chargeState, splitAmount } from "@/modules/billing/domain/types";
import { designerPerformance, LEVEL_LABEL, LEVEL_STYLE } from "@/modules/insights/performance";
import { JobDetailModal } from "@/modules/jobs/components/JobDetailModal";
import { JobCard } from "@/modules/jobs/components/JobParts";
import { JobsCalendar } from "@/modules/jobs/components/JobsCalendar";
import { BOARD_COLUMNS, isLate, JOB_STATUS_LABEL } from "@/modules/jobs/domain/types";
import { OrderDetailModal } from "@/modules/orders/components/OrderParts";
import { AreaShell } from "@/modules/platform/AreaShell";
import { usePlatform } from "@/modules/platform/PlatformProvider";

function useDesigner() {
  const { market, auth } = usePlatform();
  return { m: market, me: auth.account!, actor: auth.actor! };
}

export const DesignerLayout = observer(function DesignerLayout({ children }: { children: ReactNode }) {
  const { market, auth } = usePlatform();
  const id = auth.account?.id ?? "";
  const todo = market.jobsFor(id).filter((j) => j.status === "changes_requested" || j.status === "approved").length;
  const nav = [
    { href: "/designer", label: "Visão geral", icon: <LayoutDashboard className="size-4" /> },
    { href: "/designer/oportunidades", label: "Oportunidades", icon: <Sparkles className="size-4" />, count: auth.account?.status === "active" ? market.openOrders.length : 0 },
    { href: "/designer/quadro", label: "Quadro de produção", icon: <KanbanSquare className="size-4" />, count: todo },
    { href: "/designer/calendario", label: "Calendário", icon: <CalendarDays className="size-4" /> },
    { href: "/designer/ganhos", label: "Ganhos", icon: <Wallet className="size-4" /> },
    { href: "/designer/perfil", label: "Perfil e PIX", icon: <UserCircle className="size-4" /> },
  ];
  return <AreaShell role="designer" nav={nav}>{children}</AreaShell>;
});

const PendingBanner = observer(function PendingBanner() {
  const { me } = useDesigner();
  if (me.status !== "pending") return null;
  return <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-small text-amber-900">⏳ Seu cadastro está em análise pela KreativeArt. Enquanto isso, você pode completar o perfil; as oportunidades ficam liberadas após a aprovação.</p>;
});

export const DesignerDashboard = observer(function DesignerDashboard() {
  const { m, me } = useDesigner();
  const [jobId, setJobId] = useState<string | null>(null);
  const today = todayKey();
  const jobs = m.jobsFor(me.id);
  const active = jobs.filter((j) => !m.isPaused(j));
  const perf = designerPerformance(active, m.settings);
  const month = today.slice(0, 7);
  const charges = m.chargesFor(me.id);
  const received = charges.filter((c) => c.status === "paid" && c.paidAt?.startsWith(month)).reduce((s, c) => s + c.designerAmount, 0);
  const toReceive = charges.filter((c) => c.status === "pending").reduce((s, c) => s + c.designerAmount, 0);
  const urgent = active.filter((j) => j.status === "changes_requested" || isLate(j) || ((j.status === "todo" || j.status === "in_progress") && daysBetween(today, j.dueDate) <= 2)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const weekLoad = active.filter((j) => ["todo", "in_progress", "changes_requested"].includes(j.status) && daysBetween(today, j.dueDate) <= 7).length;
  return (
    <>
      <PageHeader title={`Olá, ${me.name.split(" ")[0]}!`} subtitle="Sua produção, seus prazos e seus ganhos." />
      <PendingBanner />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Recebido no mês" value={formatPrice(received)} icon={<Wallet className="size-5" />} color="text-green-600" />
        <StatCard label="A receber" value={formatPrice(toReceive)} icon={<Wallet className="size-5" />} color="text-blue-600" />
        <StatCard label="Atrasadas" value={perf.lateNow} icon={<AlertTriangle className="size-5" />} color={perf.lateNow ? "text-red-600" : "text-gray-900"} />
        <StatCard label="Próximos 7 dias" value={weekLoad} icon={<Clock className="size-5" />} note={`Capacidade declarada: ${me.weeklyCapacity ?? "—"}/semana`} noteClass={weekLoad > (me.weeklyCapacity ?? 99) ? "text-red-600" : "text-gray-500"} />
      </div>
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Target className="size-8 text-purple-500" />
        <div className="flex-1">
          <p className="font-semibold">Meta de pontualidade: {formatPercent(m.settings.onTimeGoal)} das peças no prazo</p>
          <p className="text-small text-gray-600">Você: {perf.onTimeRate === null ? "ainda sem entregas" : `${formatPercent(perf.onTimeRate)} no prazo (${perf.onTime}/${perf.submitted})`} · média de {perf.avgRevisions.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ajuste(s) por peça</p>
        </div>
        <Badge className={`${LEVEL_STYLE[perf.level]} text-small`}>{LEVEL_LABEL[perf.level]}</Badge>
      </Card>
      <section>
        <h2 className="mb-3 text-lg font-bold">Prioridades</h2>
        {urgent.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{urgent.slice(0, 8).map((j) => <JobCard key={j.id} job={j} subtitle={m.nameOf(j.clientId)} onOpen={() => setJobId(j.id)} />)}</div>
          : <EmptyState icon={<Sparkles className="size-10 text-purple-400" />} title="Nada urgente" text="Sem ajustes pendentes nem prazos nos próximos 2 dias." />}
      </section>
      {jobId && <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />}
    </>
  );
});

export const DesignerOpportunities = observer(function DesignerOpportunities() {
  const { m, me } = useDesigner();
  const [onlyMine, setOnlyMine] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  const mine = (category?: Specialty) => !onlyMine || !category || me.specialties?.includes(category);
  const list = m.openOrders.filter((o) => mine(m.service(o.lines[0]?.serviceId)?.category));
  return (
    <>
      <PageHeader title="Oportunidades" subtitle="Pedidos esperando um designer. Veja o briefing e quanto você recebe antes de aceitar." />
      <PendingBanner />
      <label className="flex items-center gap-2 text-small"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="accent-purple-600" /> Só das minhas especialidades ({me.specialties?.join(", ")})</label>
      {list.length === 0 ? <EmptyState icon={<Briefcase className="size-10 text-purple-400" />} title="Nenhuma oportunidade agora" text="Novos pedidos aparecem aqui assim que os clientes contratam." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((o) => {
            const { designerAmount } = splitAmount(o.price, o.commissionRate);
            const firstDue = Math.min(...o.lines.map((l) => l.deliveryDays));
            return (
              <Card key={o.id} className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-caption font-semibold text-gray-500">{o.number} · {o.kind === "plan" ? `Plano · ${o.months} meses` : "Serviço avulso"} · há {daysBetween(o.createdAt.slice(0, 10), todayKey())} dia(s)</p>
                    <p className="text-lg font-bold">{o.title}</p>
                    <p className="text-small text-gray-600">{m.nameOf(o.clientId)}</p>
                  </div>
                  <div className="text-right"><p className="text-caption text-gray-500">você recebe</p><p className="text-xl font-bold text-green-700">{formatPrice(designerAmount)}</p>{o.kind === "plan" && <p className="text-caption text-gray-500">por mês</p>}</div>
                </div>
                <p className="line-clamp-2 text-small text-gray-700">{o.briefing.objective}</p>
                <div className="flex flex-wrap gap-2 text-caption">
                  {o.lines.map((l) => <Badge key={l.serviceId} className="bg-gray-100 text-gray-700">{l.quantity}× {l.serviceName}</Badge>)}
                  <Badge className="bg-purple-50 text-purple-700">1ª entrega em {firstDue} dia(s) após o pagamento</Badge>
                </div>
                <Button variant="secondary" onClick={() => setOrderId(o.id)}>Ver briefing e aceitar</Button>
              </Card>
            );
          })}
        </div>
      )}
      {orderId && <OrderDetailModal orderId={orderId} onClose={() => setOrderId(null)} />}
    </>
  );
});

export const DesignerBoard = observer(function DesignerBoard() {
  const { m, me } = useDesigner();
  const [jobId, setJobId] = useState<string | null>(null);
  const [client, setClient] = useState("");
  const [hideOld, setHideOld] = useState(true);
  const today = todayKey();
  const jobs = m.jobsFor(me.id).filter((j) => (!client || j.clientId === client) && !(hideOld && j.status === "delivered" && j.deliveredAt && daysBetween(j.deliveredAt.slice(0, 10), today) > 14));
  const clients = [...new Set(m.jobsFor(me.id).map((j) => j.clientId))];
  return (
    <>
      <PageHeader title="Quadro de produção" subtitle="Da fila até a entrega. Clique numa peça para trabalhar nela." />
      <div className="flex flex-wrap items-end gap-4">
        <SelectField label="Cliente" className="w-56" value={client} onChange={(e) => setClient(e.target.value)}>
          <option value="">Todos</option>
          {clients.map((c) => <option key={c} value={c}>{m.nameOf(c)}</option>)}
        </SelectField>
        <label className="flex items-center gap-2 pb-2 text-small"><input type="checkbox" checked={hideOld} onChange={(e) => setHideOld(e.target.checked)} className="accent-purple-600" /> Ocultar entregues há mais de 14 dias</label>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((status) => {
          const col = jobs.filter((j) => j.status === status).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          return (
            <section key={status} className="w-72 flex-shrink-0 rounded-xl bg-gray-100 p-3" aria-label={JOB_STATUS_LABEL[status]}>
              <h2 className="mb-3 flex items-center justify-between px-1 text-small font-bold text-gray-700">{JOB_STATUS_LABEL[status]}<span className="rounded-full bg-white px-2 text-caption">{col.length}</span></h2>
              <div className="space-y-3">
                {col.map((j) => <JobCard key={j.id} job={j} compact={status === "todo" || status === "in_progress"} subtitle={m.nameOf(j.clientId)} onOpen={() => setJobId(j.id)} />)}
                {!col.length && <p className="px-1 py-6 text-center text-caption text-gray-400">vazio</p>}
              </div>
            </section>
          );
        })}
      </div>
      {jobId && <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />}
    </>
  );
});

export const DesignerCalendar = observer(function DesignerCalendar() {
  const { m, me } = useDesigner();
  const [jobId, setJobId] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Calendário" subtitle="Prazos de entrega e datas de publicação." />
      <JobsCalendar jobs={m.jobsFor(me.id)} describe={(j) => `${m.nameOf(j.clientId)} · prazo ${formatDay(j.dueDate)}`} onOpen={(j) => setJobId(j.id)} />
      {jobId && <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />}
    </>
  );
});

export const DesignerEarnings = observer(function DesignerEarnings() {
  const { m, me } = useDesigner();
  const { payments } = usePlatform();
  const charges = m.chargesFor(me.id);
  const today = todayKey();
  const sum = (f: (c: (typeof charges)[number]) => boolean) => charges.filter(f).reduce((s, c) => s + c.designerAmount, 0);
  return (
    <>
      <PageHeader title="Ganhos" subtitle={payments.enabled
        ? `Os clientes pagam por PIX no Mercado Pago. ${me.mercadoPago ? "Sua parte cai direto na sua conta Mercado Pago" : `A KreativeArt recebe e repassa sua parte para a chave PIX (${me.pixKeyType}: ${me.pixKey})`}; a KreativeArt fica com ${formatPercent(m.settings.commissionRate)}.`
        : `Os clientes pagam direto na sua chave PIX (${me.pixKeyType}: ${me.pixKey}). A KreativeArt fica com ${formatPercent(m.settings.commissionRate)}.`} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Recebido (total)" value={formatPrice(sum((c) => c.status === "paid"))} icon={<Wallet className="size-5" />} color="text-green-600" />
        <StatCard label="A receber" value={formatPrice(sum((c) => chargeState(c, today) === "pending"))} icon={<Wallet className="size-5" />} color="text-blue-600" />
        <StatCard label="Atrasado pelo cliente" value={formatPrice(sum((c) => chargeState(c, today) === "overdue"))} icon={<AlertTriangle className="size-5" />} color="text-red-600" note="Produção pausada após a tolerância" />
      </div>
      <ChargesTable charges={charges} showClient />
      {payments.enabled && !me.mercadoPago && <p className="text-caption text-gray-500">Dica: conecte sua conta Mercado Pago em <Link href="/designer/perfil" className="font-semibold text-purple-700 hover:underline">Perfil e PIX</Link> para receber na hora, sem esperar o repasse.</p>}
    </>
  );
});

export const DesignerProfile = observer(function DesignerProfile() {
  const { m, me } = useDesigner();
  const [p, setP] = useState({ name: me.name, email: me.email, phone: me.phone, document: me.document ?? "", bio: me.bio ?? "", portfolioUrl: me.portfolioUrl ?? "", pixKeyType: me.pixKeyType ?? ("CPF" as PixKeyType), pixKey: me.pixKey ?? "", weeklyCapacity: me.weeklyCapacity ?? 5, specialties: me.specialties ?? [] });
  const save = () => {
    const err = m.updateProfile(me.id, p);
    if (err) return toast.error(err);
    toast.success("Perfil atualizado.");
  };
  return (
    <>
      <PageHeader title="Perfil e PIX" subtitle={me.status === "active" ? "Cadastro aprovado ✓" : "Cadastro em análise"} action={<Button onClick={save}>Salvar</Button>} />
      <PendingBanner />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Dados</h2>
          <Field label="Nome" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
          <Field label="CPF / CNPJ" value={p.document} onChange={(e) => setP({ ...p, document: e.target.value })} />
          <Field label="E-mail" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} />
          <Field label="Telefone" value={p.phone} onChange={(e) => setP({ ...p, phone: maskPhone(e.target.value) })} />
          <Field label="Portfólio" type="url" value={p.portfolioUrl} onChange={(e) => setP({ ...p, portfolioUrl: e.target.value })} />
          <Field label="Peças por semana" type="number" min={1} value={p.weeklyCapacity} onChange={(e) => setP({ ...p, weeklyCapacity: Number(e.target.value) })} />
          <TextArea className="sm:col-span-2" label="Sobre você" rows={3} value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} />
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-small font-medium text-gray-700">Especialidades</legend>
            <div className="flex flex-wrap gap-2">{SPECIALTIES.map((s) => <button key={s} type="button" aria-pressed={p.specialties.includes(s)} onClick={() => setP({ ...p, specialties: p.specialties.includes(s) ? p.specialties.filter((x) => x !== s) : [...p.specialties, s] })} className={`rounded-full border px-3 py-1 text-small ${p.specialties.includes(s) ? "border-purple-500 bg-purple-50 font-semibold text-purple-700" : "border-gray-300 text-gray-600"}`}>{s}</button>)}</div>
          </fieldset>
        </Card>
        <Card className="h-fit space-y-4 p-6">
          <h2 className="font-bold">Recebimento</h2>
          <p className="text-small text-gray-600">Os clientes dos seus pedidos pagam nesta chave. Mudanças valem para as próximas cobranças.</p>
          <SelectField label="Tipo da chave PIX" value={p.pixKeyType} onChange={(e) => setP({ ...p, pixKeyType: e.target.value as PixKeyType })}>{PIX_KEY_TYPES.map((t) => <option key={t}>{t}</option>)}</SelectField>
          <Field label="Chave PIX" value={p.pixKey} onChange={(e) => setP({ ...p, pixKey: e.target.value })} />
          <Link href="/designer/ganhos" className="inline-block text-small font-semibold text-purple-700 hover:underline">Ver meus ganhos →</Link>
        </Card>
        <MercadoPagoCard />
      </div>
    </>
  );
});
