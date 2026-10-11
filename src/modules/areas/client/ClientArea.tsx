"use client";

import { CalendarDays, CheckSquare, CreditCard, KeyRound, LayoutDashboard, Package, Plus, ShieldCheck, Trash2, UserCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { formatDateTime, formatDay, formatPrice, maskPhone, todayKey } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, SelectField, StatCard, Tabs, TextArea } from "@/core/ui/ui";
import { emptyBrand, type BrandKit } from "@/modules/accounts/domain/types";
import { ChargesTable } from "@/modules/billing/components/BillingParts";
import { chargeState } from "@/modules/billing/domain/types";
import { JobDetailModal } from "@/modules/jobs/components/JobDetailModal";
import { JobCard } from "@/modules/jobs/components/JobParts";
import { JobsCalendar } from "@/modules/jobs/components/JobsCalendar";
import type { JobStatus } from "@/modules/jobs/domain/types";
import { OrderDetailModal, OrderRow } from "@/modules/orders/components/OrderParts";
import { AreaShell } from "@/modules/platform/AreaShell";
import { usePlatform } from "@/modules/platform/PlatformProvider";
import { VAULT_PLATFORMS, type CredentialInput, type VaultPlatform } from "@/modules/vault/domain/types";

function useClient() {
  const { market, auth } = usePlatform();
  return { m: market, me: auth.account!, actor: auth.actor! };
}

export const ClientLayout = observer(function ClientLayout({ children }: { children: ReactNode }) {
  const { market, auth } = usePlatform();
  const id = auth.account?.id ?? "";
  const review = market.jobsOf(id).filter((j) => j.status === "in_review").length;
  const open = market.chargesOf(id).filter((c) => c.status === "pending").length;
  const nav = [
    { href: "/cliente", label: "Visão geral", icon: <LayoutDashboard className="size-4" /> },
    { href: "/cliente/aprovacoes", label: "Aprovações", icon: <CheckSquare className="size-4" />, count: review },
    { href: "/cliente/pedidos", label: "Meus pedidos", icon: <Package className="size-4" /> },
    { href: "/cliente/financeiro", label: "Financeiro", icon: <CreditCard className="size-4" />, count: open },
    { href: "/cliente/calendario", label: "Calendário", icon: <CalendarDays className="size-4" /> },
    { href: "/cliente/acessos", label: "Acessos (cofre)", icon: <KeyRound className="size-4" /> },
    { href: "/cliente/perfil", label: "Perfil e marca", icon: <UserCircle className="size-4" /> },
  ];
  return <AreaShell role="client" nav={nav}>{children}</AreaShell>;
});

const FIN = { "em-dia": ["Em dia", "text-green-600"], "em-aberto": ["Cobrança em aberto", "text-blue-600"], "em-atraso": ["Em atraso", "text-red-600"] } as const;

export const ClientDashboard = observer(function ClientDashboard() {
  const { m, me } = useClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const jobs = m.jobsOf(me.id);
  const review = jobs.filter((j) => j.status === "in_review");
  const producing = jobs.filter((j) => ["todo", "in_progress", "changes_requested"].includes(j.status)).length;
  const orders = m.ordersOf(me.id).filter((o) => o.status !== "cancelled" && o.status !== "completed");
  const fin = FIN[m.financialStatus(me.id)];
  const nextCharge = m.chargesOf(me.id).filter((c) => c.status === "pending").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return (
    <>
      <PageHeader title={`Olá, ${me.name.split(" ")[0]}! 👋`} subtitle={`${me.company} · acompanhe seus pedidos e aprove as artes`} action={<Link href="/servicos"><Button><Plus className="size-4" /> Contratar</Button></Link>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Para aprovar" value={review.length} icon={<CheckSquare className="size-5" />} color="text-yellow-600" />
        <StatCard label="Em produção" value={producing} icon={<Package className="size-5" />} color="text-indigo-600" />
        <StatCard label="Pedidos ativos" value={orders.length} icon={<ShieldCheck className="size-5" />} />
        <StatCard label="Financeiro" value={<span className={`text-xl ${fin[1]}`}>{fin[0]}</span>} icon={<CreditCard className="size-5" />} note={nextCharge ? `Próxima: ${formatPrice(nextCharge.amount)} em ${formatDay(nextCharge.dueDate)}` : undefined} />
      </div>
      {review.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Aguardando sua aprovação</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{review.slice(0, 4).map((j) => <JobCard key={j.id} job={j} subtitle={m.order(j.orderId)?.title} onOpen={() => setJobId(j.id)} />)}</div>
          {review.length > 4 && <Link href="/cliente/aprovacoes" className="mt-3 inline-block font-semibold text-purple-700">Ver todas ({review.length}) →</Link>}
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-bold">Pedidos em andamento</h2>
        {orders.length ? <div className="grid gap-4 lg:grid-cols-2">{orders.map((o) => <OrderRow key={o.id} order={o} showDesigner onOpen={() => setOrderId(o.id)} />)}</div>
          : <EmptyState icon={<Package className="size-10 text-purple-400" />} title="Nenhum pedido em andamento" text="Escolha um serviço avulso ou um plano mensal para começar." />}
      </section>
      {jobId && <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />}
      {orderId && <OrderDetailModal orderId={orderId} onClose={() => setOrderId(null)} />}
    </>
  );
});

type Filter = "in_review" | "changes_requested" | "in_progress" | "approved";
const FILTERS: { value: Filter; label: string; statuses: JobStatus[] }[] = [
  { value: "in_review", label: "Para aprovar", statuses: ["in_review"] },
  { value: "changes_requested", label: "Em ajuste", statuses: ["changes_requested"] },
  { value: "in_progress", label: "Em produção", statuses: ["todo", "in_progress"] },
  { value: "approved", label: "Aprovadas e entregues", statuses: ["approved", "delivered"] },
];

export const ClientApprovals = observer(function ClientApprovals() {
  const { m, me } = useClient();
  const [filter, setFilter] = useState<Filter>("in_review");
  const [jobId, setJobId] = useState<string | null>(null);
  const jobs = m.jobsOf(me.id);
  const current = FILTERS.find((f) => f.value === filter)!;
  const list = jobs.filter((j) => current.statuses.includes(j.status)).sort((a, b) => (filter === "approved" ? b.updatedAt.localeCompare(a.updatedAt) : a.dueDate.localeCompare(b.dueDate)));
  return (
    <>
      <PageHeader title="Aprovações" subtitle="Veja cada arte, aprove ou peça ajustes. Tudo fica registrado." />
      <Tabs value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f.value, label: f.label, count: jobs.filter((j) => f.statuses.includes(j.status)).length }))} />
      {list.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{list.map((j) => <JobCard key={j.id} job={j} subtitle={`${m.order(j.orderId)?.title} · ${m.nameOf(j.designerId)}`} onOpen={() => setJobId(j.id)} />)}</div>
        : <EmptyState icon={<CheckSquare className="size-10 text-purple-400" />} title="Nada por aqui" text="Quando houver peças nesta etapa, elas aparecem aqui." />}
      {jobId && <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />}
    </>
  );
});

export const ClientOrders = observer(function ClientOrders() {
  const { m, me } = useClient();
  const [orderId, setOrderId] = useState<string | null>(null);
  const orders = m.ordersOf(me.id);
  return (
    <>
      <PageHeader title="Meus pedidos" subtitle="Planos mensais e serviços avulsos contratados." action={<div className="flex gap-2"><Link href="/planos"><Button variant="secondary">Planos</Button></Link><Link href="/servicos"><Button><Plus className="size-4" /> Novo pedido</Button></Link></div>} />
      {orders.length ? <div className="grid gap-4 lg:grid-cols-2">{orders.map((o) => <OrderRow key={o.id} order={o} showDesigner onOpen={() => setOrderId(o.id)} />)}</div>
        : <EmptyState icon={<Package className="size-10 text-purple-400" />} title="Você ainda não contratou nada" text="Escolha um serviço avulso ou um plano mensal." />}
      {orderId && <OrderDetailModal orderId={orderId} onClose={() => setOrderId(null)} />}
    </>
  );
});

export const ClientFinance = observer(function ClientFinance() {
  const { m, me } = useClient();
  const charges = m.chargesOf(me.id);
  const today = todayKey();
  const open = charges.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);
  const overdue = charges.filter((c) => chargeState(c, today) === "overdue");
  const paid = charges.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);
  return (
    <>
      <PageHeader title="Financeiro" subtitle="Mensalidades e serviços. O pagamento vai direto para o designer, por PIX." />
      {overdue.length > 0 && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-small text-red-800">Você tem {overdue.length} cobrança(s) em atraso. Após {m.settings.graceDays} dias de atraso, a produção do período fica pausada até o pagamento.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Em aberto" value={formatPrice(open)} icon={<CreditCard className="size-5" />} color="text-blue-600" />
        <StatCard label="Em atraso" value={overdue.length} icon={<CreditCard className="size-5" />} color={overdue.length ? "text-red-600" : "text-gray-900"} />
        <StatCard label="Total pago" value={formatPrice(paid)} icon={<CreditCard className="size-5" />} color="text-green-600" />
      </div>
      <ChargesTable charges={charges} showDesigner />
    </>
  );
});

export const ClientCalendar = observer(function ClientCalendar() {
  const { m, me } = useClient();
  const [jobId, setJobId] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Calendário" subtitle="Datas de publicação e de entrega das suas peças." />
      <JobsCalendar jobs={m.jobsOf(me.id)} describe={(j) => `${m.order(j.orderId)?.title} · ${m.nameOf(j.designerId)}`} onOpen={(j) => setJobId(j.id)} />
      {jobId && <JobDetailModal jobId={jobId} onClose={() => setJobId(null)} />}
    </>
  );
});

const emptyCred = (): CredentialInput & { id?: string } => ({ platform: "Instagram", login: "", secret: "", twoFactor: "", notes: "", shared: true });

export const ClientVault = observer(function ClientVault() {
  const { m, me } = useClient();
  const [editing, setEditing] = useState<(CredentialInput & { id?: string }) | null>(null);
  const creds = m.credentialsOf(me.id);
  const designers = [...new Set(m.ordersOf(me.id).filter((o) => o.status === "active").map((o) => o.designerId))].map((id) => m.nameOf(id));
  const save = () => {
    const err = m.saveCredential(me.id, editing!);
    if (err) return toast.error(err);
    toast.success("Acesso salvo.");
    setEditing(null);
  };
  return (
    <>
      <PageHeader title="Acessos (cofre)" subtitle="Login das suas redes para o designer publicar por você." action={<Button onClick={() => setEditing(emptyCred())}><Plus className="size-4" /> Adicionar acesso</Button>} />
      <Card className="flex gap-3 p-4 text-small text-gray-700">
        <ShieldCheck className="size-5 flex-shrink-0 text-green-600" />
        <div>
          <p><strong>Quem pode ver:</strong> só o designer de um pedido seu <strong>ativo</strong>{designers.length ? ` (hoje: ${designers.join(", ")})` : ""}. A KreativeArt não exibe a senha para mais ninguém.</p>
          <p className="mt-1">Cada vez que o designer revela a senha, fica registrado abaixo. Use <strong>Pausar</strong> para bloquear na hora. <strong>Dica:</strong> no Instagram/Facebook você também pode adicionar o designer como parceiro pelo Meta Business, sem compartilhar a senha.</p>
          <p className="mt-1 text-caption text-amber-700">Protótipo: os dados ficam no navegador. Na versão com servidor, serão criptografados.</p>
        </div>
      </Card>
      {creds.length === 0 ? <EmptyState icon={<KeyRound className="size-10 text-purple-400" />} title="Nenhum acesso cadastrado" text="Cadastre o login do Instagram se o seu plano inclui publicação." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {creds.map((c) => (
            <Card key={c.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold">{c.platform}</p>
                  <p className="text-gray-600">{c.login} · senha ••••••••</p>
                </div>
                <Badge className={c.shared ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}>{c.shared ? "Compartilhado" : "Pausado"}</Badge>
              </div>
              {c.twoFactor && <p className="text-small text-gray-600">2 fatores: {c.twoFactor}</p>}
              <div>
                <p className="mb-1 text-small font-semibold">Registro de acessos</p>
                {c.logs.length ? <ul className="space-y-1 text-caption text-gray-600">{c.logs.slice(0, 5).map((l) => <li key={l.id}>👁️ {l.designerName} revelou em {formatDateTime(l.at)}</li>)}</ul> : <p className="text-caption text-gray-400">Ninguém acessou ainda.</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => m.saveCredential(me.id, { ...c, shared: !c.shared })}>{c.shared ? "Pausar acesso" : "Liberar acesso"}</Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing({ ...c })}>Editar</Button>
                <Button size="sm" variant="danger" onClick={() => window.confirm("Excluir este acesso?") && m.removeCredential(me.id, c.id)}><Trash2 className="size-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing.id ? "Editar acesso" : "Novo acesso"} onClose={() => setEditing(null)} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={save}>Salvar</Button></>}>
          <SelectField label="Rede" value={editing.platform} onChange={(e) => setEditing({ ...editing, platform: e.target.value as VaultPlatform })}>{VAULT_PLATFORMS.map((p) => <option key={p}>{p}</option>)}</SelectField>
          <Field label="Usuário ou e-mail de login" value={editing.login} onChange={(e) => setEditing({ ...editing, login: e.target.value })} autoComplete="off" />
          <Field label="Senha" type="password" value={editing.secret} onChange={(e) => setEditing({ ...editing, secret: e.target.value })} autoComplete="new-password" />
          <Field label="Verificação em 2 etapas" placeholder="Ex.: código por SMS — me chame no WhatsApp" value={editing.twoFactor} onChange={(e) => setEditing({ ...editing, twoFactor: e.target.value })} />
          <TextArea label="Observações" rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
          <label className="flex items-center gap-2 text-small"><input type="checkbox" checked={editing.shared} onChange={(e) => setEditing({ ...editing, shared: e.target.checked })} className="accent-purple-600" /> Liberar para o designer do meu pedido ativo</label>
        </Modal>
      )}
    </>
  );
});

export const ClientProfile = observer(function ClientProfile() {
  const { m, me } = useClient();
  const [p, setP] = useState({ name: me.name, company: me.company ?? "", email: me.email, phone: me.phone, document: me.document ?? "", instagram: me.instagram ?? "" });
  const [brand, setBrand] = useState<BrandKit>(me.brand ?? emptyBrand());
  const [colors, setColors] = useState((me.brand?.colors ?? []).join(", "));
  const save = () => {
    const err = m.updateProfile(me.id, p) ?? m.updateBrand(me.id, { ...brand, colors: colors.split(/[,\s]+/).filter((c) => /^#?[0-9a-f]{3,8}$/i.test(c)).map((c) => (c.startsWith("#") ? c : `#${c}`)) });
    if (err) return toast.error(err);
    toast.success("Perfil atualizado.");
  };
  return (
    <>
      <PageHeader title="Perfil e marca" subtitle="Seus dados e a identidade visual que os designers usam em todos os pedidos." action={<Button onClick={save}>Salvar</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Dados</h2>
          <Field label="Nome" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
          <Field label="Empresa / marca" value={p.company} onChange={(e) => setP({ ...p, company: e.target.value })} />
          <Field label="E-mail" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} />
          <Field label="Telefone" value={p.phone} onChange={(e) => setP({ ...p, phone: maskPhone(e.target.value) })} />
          <Field label="CPF / CNPJ" value={p.document} onChange={(e) => setP({ ...p, document: e.target.value })} />
          <Field label="Instagram" value={p.instagram} onChange={(e) => setP({ ...p, instagram: e.target.value })} />
        </Card>
        <Card className="grid gap-4 p-6">
          <h2 className="font-bold">Identidade da marca</h2>
          <Field label="Link do logo" type="url" placeholder="https://" value={brand.logoUrl} onChange={(e) => setBrand({ ...brand, logoUrl: e.target.value })} />
          <Field label="Cores (hex, separadas por vírgula)" placeholder="#1e3a8a, #38bdf8" value={colors} onChange={(e) => setColors(e.target.value)} />
          <div className="flex flex-wrap gap-2">{colors.split(/[,\s]+/).filter((c) => /^#?[0-9a-f]{3,8}$/i.test(c)).map((c) => <span key={c} className="size-8 rounded-lg border border-gray-200" style={{ background: c.startsWith("#") ? c : `#${c}` }} />)}</div>
          <Field label="Fontes" value={brand.fonts} onChange={(e) => setBrand({ ...brand, fonts: e.target.value })} />
          <Field label="Tom de voz" value={brand.tone} onChange={(e) => setBrand({ ...brand, tone: e.target.value })} />
          <TextArea label="Observações para o designer" rows={3} value={brand.notes} onChange={(e) => setBrand({ ...brand, notes: e.target.value })} />
        </Card>
      </div>
    </>
  );
});
