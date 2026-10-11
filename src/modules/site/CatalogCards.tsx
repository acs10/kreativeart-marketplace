"use client";

import { Check, Clock, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/core/lib/format";
import { Badge, Card } from "@/core/ui/ui";
import { planListPrice, type Plan, type Service } from "@/modules/catalog/domain/types";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Card className="flex flex-col p-6 transition-shadow hover:shadow-lg">
      <Badge className="mb-3 self-start bg-purple-50 text-purple-700">{service.category}</Badge>
      <h3 className="text-lg font-bold">{service.name}</h3>
      <p className="mt-1 flex-1 text-small text-gray-600">{service.description}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-caption text-gray-500">
        <span className="flex items-center gap-1"><Clock className="size-3.5" /> {service.deliveryDays} dia(s)</span>
        <span className="flex items-center gap-1"><RefreshCw className="size-3.5" /> {service.revisions} ajuste(s)</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p><span className="text-caption text-gray-500">a partir de</span><br /><span className="text-2xl font-bold">{formatPrice(service.price)}</span></p>
        <Link href={`/contratar/servico/${service.id}`} className="brand-gradient rounded-lg px-4 py-2 text-small font-semibold text-white hover:opacity-90">Contratar</Link>
      </div>
    </Card>
  );
}

export function PlanCard({ plan, services }: { plan: Plan; services: Service[] }) {
  const list = planListPrice(plan, services);
  const saving = list > plan.monthlyPrice ? Math.round((1 - plan.monthlyPrice / list) * 100) : 0;
  return (
    <div className={`relative flex flex-col rounded-2xl p-[2px] ${plan.highlight ? "brand-gradient shadow-xl" : "bg-gray-200"}`}>
      <div className="flex flex-1 flex-col rounded-[14px] bg-white p-6">
        {plan.highlight && <span className="brand-gradient absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1 text-caption font-bold text-white"><Sparkles className="size-3.5" /> Mais escolhido</span>}
        <h3 className="text-xl font-bold">{plan.name}</h3>
        <p className="text-small text-gray-600">{plan.tagline}</p>
        <p className="mt-4"><span className="text-3xl font-bold">{formatPrice(plan.monthlyPrice)}</span><span className="text-gray-500">/mês</span></p>
        {saving > 0 && <p className="text-caption font-semibold text-green-700">Economia de {saving}% sobre os avulsos ({formatPrice(list)})</p>}
        <ul className="my-5 flex-1 space-y-2 text-small">
          {plan.items.map((item) => {
            const s = services.find((x) => x.id === item.serviceId);
            return s ? <li key={item.serviceId} className="flex gap-2"><Check className="size-4 flex-shrink-0 text-green-600" /> {item.quantity}× {s.name}</li> : null;
          })}
          <li className="flex gap-2 text-gray-500"><Check className="size-4 flex-shrink-0 text-green-600" /> Designer dedicado e aprovação pela plataforma</li>
          <li className="flex gap-2 text-gray-500"><Check className="size-4 flex-shrink-0 text-green-600" /> Fidelidade mínima de {plan.minMonths} meses</li>
        </ul>
        <Link href={`/contratar/plano/${plan.id}`} className={`rounded-lg px-4 py-2.5 text-center font-semibold ${plan.highlight ? "brand-gradient text-white" : "border border-gray-300 text-gray-800 hover:bg-gray-50"}`}>Contratar plano</Link>
      </div>
    </div>
  );
}
