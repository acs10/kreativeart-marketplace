"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Badge, Button, Card, Field, Modal, PageHeader, SelectField, Tabs, TextArea } from "@/core/ui/ui";
import { SPECIALTIES, type Specialty } from "@/modules/accounts/domain/types";
import { DELIVERABLE_TYPES, planListPrice, type DeliverableType, type Plan, type Service } from "@/modules/catalog/domain/types";
import { usePlatform } from "@/modules/platform/PlatformProvider";

type ServiceDraft = Omit<Service, "id"> & { id?: string };
type PlanDraft = Omit<Plan, "id"> & { id?: string };

const newService = (): ServiceDraft => ({ name: "", description: "", category: "Social media", deliverable: "Post de feed", price: 0, deliveryDays: 3, revisions: 2, active: true });
const newPlan = (): PlanDraft => ({ name: "", tagline: "", items: [], monthlyPrice: 0, minMonths: 3, highlight: false, active: true });

/** Serviços e planos à venda no site (os preços podem ser ajustados a qualquer momento). */
export const CatalogManager = observer(function CatalogManager() {
  const { market: m } = usePlatform();
  const [tab, setTab] = useState<"services" | "plans">("services");
  const [svc, setSvc] = useState<ServiceDraft | null>(null);
  const [plan, setPlan] = useState<PlanDraft | null>(null);
  const saveSvc = () => {
    const err = m.saveService(svc!);
    if (err) return toast.error(err);
    toast.success("Serviço salvo.");
    setSvc(null);
  };
  const savePlan = () => {
    const err = m.savePlan(plan!);
    if (err) return toast.error(err);
    toast.success("Plano salvo.");
    setPlan(null);
  };
  const qty = (serviceId: string) => plan?.items.find((i) => i.serviceId === serviceId)?.quantity ?? 0;
  const setQty = (serviceId: string, q: number) => setPlan((p) => p && { ...p, items: [...p.items.filter((i) => i.serviceId !== serviceId), ...(q > 0 ? [{ serviceId, quantity: q }] : [])] });

  return (
    <>
      <PageHeader title="Serviços e planos" subtitle="O que aparece à venda no site. Alterações de preço valem para os próximos pedidos." action={<Button onClick={() => (tab === "services" ? setSvc(newService()) : setPlan(newPlan()))}><Plus className="size-4" /> {tab === "services" ? "Novo serviço" : "Novo plano"}</Button>} />
      <Tabs value={tab} onChange={setTab} options={[{ value: "services", label: "Serviços avulsos", count: m.services.length }, { value: "plans", label: "Planos mensais", count: m.plans.length }]} />
      {tab === "services" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {m.services.map((s) => (
            <Card key={s.id} className={`space-y-2 p-5 ${s.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2"><p className="font-bold">{s.name}</p>{!s.active && <Badge>inativo</Badge>}</div>
              <p className="text-caption text-gray-500">{s.category} · {s.deliverable}</p>
              <p className="text-small text-gray-600">{s.description}</p>
              <p className="text-small"><strong>{formatPrice(s.price)}</strong> · {s.deliveryDays} dia(s) · {s.revisions} ajuste(s)</p>
              <Button size="sm" variant="secondary" onClick={() => setSvc({ ...s })}><Pencil className="size-4" /> Editar</Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {m.plans.map((p) => (
            <Card key={p.id} className={`space-y-2 p-5 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2"><p className="text-lg font-bold">{p.name}</p><div className="flex gap-1">{p.highlight && <Badge className="bg-purple-100 text-purple-700">destaque</Badge>}{!p.active && <Badge>inativo</Badge>}</div></div>
              <p className="text-small text-gray-600">{p.tagline}</p>
              <ul className="text-small text-gray-700">{p.items.map((i) => <li key={i.serviceId}>{i.quantity}× {m.service(i.serviceId)?.name}</li>)}</ul>
              <p className="text-small"><strong>{formatPrice(p.monthlyPrice)}/mês</strong> · avulso {formatPrice(planListPrice(p, m.services))} · fidelidade {p.minMonths} meses</p>
              <Button size="sm" variant="secondary" onClick={() => setPlan({ ...p, items: p.items.map((i) => ({ ...i })) })}><Pencil className="size-4" /> Editar</Button>
            </Card>
          ))}
        </div>
      )}

      {svc && (
        <Modal title={svc.id ? "Editar serviço" : "Novo serviço"} onClose={() => setSvc(null)} footer={<><Button variant="secondary" onClick={() => setSvc(null)}>Cancelar</Button><Button onClick={saveSvc}>Salvar</Button></>}>
          <Field label="Nome" value={svc.name} onChange={(e) => setSvc({ ...svc, name: e.target.value })} />
          <TextArea label="Descrição" rows={2} value={svc.description} onChange={(e) => setSvc({ ...svc, description: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Categoria" value={svc.category} onChange={(e) => setSvc({ ...svc, category: e.target.value as Specialty })}>{SPECIALTIES.map((c) => <option key={c}>{c}</option>)}</SelectField>
            <SelectField label="Tipo de peça" value={svc.deliverable} onChange={(e) => setSvc({ ...svc, deliverable: e.target.value as DeliverableType })}>{DELIVERABLE_TYPES.map((d) => <option key={d}>{d}</option>)}</SelectField>
            <Field label="Preço (R$)" type="number" min={0} step="0.01" value={svc.price} onChange={(e) => setSvc({ ...svc, price: Number(e.target.value) })} />
            <Field label="Prazo (dias)" type="number" min={1} value={svc.deliveryDays} onChange={(e) => setSvc({ ...svc, deliveryDays: Number(e.target.value) })} />
            <Field label="Ajustes incluídos" type="number" min={0} value={svc.revisions} onChange={(e) => setSvc({ ...svc, revisions: Number(e.target.value) })} />
          </div>
          <label className="flex items-center gap-2 text-small"><input type="checkbox" checked={svc.active} onChange={(e) => setSvc({ ...svc, active: e.target.checked })} className="accent-purple-600" /> À venda no site</label>
        </Modal>
      )}

      {plan && (
        <Modal size="lg" title={plan.id ? "Editar plano" : "Novo plano"} onClose={() => setPlan(null)} footer={<><Button variant="secondary" onClick={() => setPlan(null)}>Cancelar</Button><Button onClick={savePlan}>Salvar</Button></>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
            <Field label="Frase de apoio" value={plan.tagline} onChange={(e) => setPlan({ ...plan, tagline: e.target.value })} />
            <Field label="Mensalidade (R$)" type="number" min={0} step="0.01" value={plan.monthlyPrice} onChange={(e) => setPlan({ ...plan, monthlyPrice: Number(e.target.value) })} />
            <Field label="Fidelidade mínima (meses)" type="number" min={1} value={plan.minMonths} onChange={(e) => setPlan({ ...plan, minMonths: Number(e.target.value) })} />
          </div>
          <div>
            <p className="mb-2 text-small font-medium text-gray-700">Peças por mês</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {m.services.map((s) => (
                <label key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-small">
                  <span>{s.name} <span className="text-caption text-gray-400">({formatPrice(s.price)})</span></span>
                  <input type="number" min={0} max={60} value={qty(s.id)} onChange={(e) => setQty(s.id, Number(e.target.value))} className="w-16 rounded border border-gray-300 px-2 py-1 text-right" />
                </label>
              ))}
            </div>
            <p className="mt-2 text-caption text-gray-500">Valor avulso equivalente: {formatPrice(planListPrice({ ...plan, id: "" }, m.services))}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-small">
            <label className="flex items-center gap-2"><input type="checkbox" checked={plan.highlight} onChange={(e) => setPlan({ ...plan, highlight: e.target.checked })} className="accent-purple-600" /> Destacar no site</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={plan.active} onChange={(e) => setPlan({ ...plan, active: e.target.checked })} className="accent-purple-600" /> À venda</label>
          </div>
        </Modal>
      )}
    </>
  );
});
