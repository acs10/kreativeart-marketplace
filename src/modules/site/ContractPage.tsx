"use client";

import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { formatPrice } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Button, Card, Field, TextArea } from "@/core/ui/ui";
import { planListPrice } from "@/modules/catalog/domain/types";
import { emptyBriefing, type Briefing, type Order } from "@/modules/orders/domain/types";
import { usePlatform } from "@/modules/platform/PlatformProvider";
import { SitePage } from "./SiteChrome";

export const ContractPage = observer(function ContractPage({ kind, id }: { kind: "servico" | "plano"; id: string }) {
  const { market: m, auth, hydrated } = usePlatform();
  const router = useRouter();
  const service = kind === "servico" ? m.service(id) : undefined;
  const plan = kind === "plano" ? m.plan(id) : undefined;
  const [quantity, setQuantity] = useState(1);
  const [months, setMonths] = useState(plan?.minMonths ?? 3);
  const [briefing, setBriefing] = useState<Briefing>(emptyBriefing());
  const set = (k: keyof Briefing, v: string) => setBriefing((b) => ({ ...b, [k]: v }));
  const here = `/contratar/${kind}/${id}`;

  if (!service && !plan) return <SitePage><p className="py-20 text-center text-gray-600">Item não encontrado. <Link href="/servicos" className="font-semibold text-purple-700">Ver serviços</Link></p></SitePage>;
  const title = service?.name ?? `Plano ${plan!.name}`;
  const total = service ? service.price * quantity : plan!.monthlyPrice;

  const submit = () => {
    if (!auth.actor) return;
    const r = service ? m.placeOrder(auth.actor, { kind: "service", serviceId: service.id, quantity, briefing }) : m.placeOrder(auth.actor, { kind: "plan", planId: plan!.id, months, briefing });
    if (typeof r === "string") return toast.error(r);
    toast.success(`Pedido ${(r as Order).number} criado! Agora um designer vai aceitar.`);
    router.push("/cliente/pedidos");
  };

  const gate = !hydrated ? null : !auth.actor ? (
    <Card className="p-6 text-center">
      <Lock className="mx-auto mb-2 size-8 text-purple-500" />
      <p className="font-semibold">Para contratar, entre ou crie sua conta de cliente.</p>
      <p className="mt-1 text-small text-gray-600">É por ela que você acompanha o pedido, aprova as artes e paga.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href={`/cadastro/cliente?next=${encodeURIComponent(here)}`} className="brand-gradient rounded-lg px-4 py-2 font-semibold text-white">Criar conta</Link>
        <Link href={`/entrar?perfil=client&next=${encodeURIComponent(here)}`} className="rounded-lg border border-gray-300 px-4 py-2 font-semibold">Já tenho conta</Link>
      </div>
    </Card>
  ) : auth.role !== "client" ? (
    <Card className="p-6 text-center text-gray-600">Você está conectado como {auth.role === "designer" ? "designer" : "KreativeArt"}. Para contratar, entre com uma conta de cliente.</Card>
  ) : null;

  return (
    <SitePage>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link href={service ? "/servicos" : "/planos"} className="mb-4 inline-flex items-center gap-1 text-small font-semibold text-gray-600 hover:text-gray-900"><ArrowLeft className="size-4" /> Voltar</Link>
        <h1 className="text-3xl font-bold">Contratar: {title}</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {gate}
            {!gate && hydrated && (
              <Card className="space-y-4 p-6">
                <h2 className="text-lg font-bold">Briefing — conte o que você precisa</h2>
                <TextArea label="Objetivo *" rows={3} placeholder="Ex.: divulgar a promoção de inverno e aumentar as vendas pelo WhatsApp." value={briefing.objective} onChange={(e) => set("objective", e.target.value)} />
                <Field label="Público-alvo" placeholder="Quem você quer alcançar?" value={briefing.audience} onChange={(e) => set("audience", e.target.value)} />
                <TextArea label="Referências" rows={2} placeholder="Perfis, sites ou artes que você gosta (links)." value={briefing.references} onChange={(e) => set("references", e.target.value)} />
                <TextArea label="Textos que devem entrar" rows={2} placeholder="Títulos, preços, legendas, chamadas…" value={briefing.copy} onChange={(e) => set("copy", e.target.value)} />
                <TextArea label="Observações" rows={2} value={briefing.notes} onChange={(e) => set("notes", e.target.value)} />
                <p className="text-caption text-gray-500">Cores, fontes e logo da sua marca ficam no seu perfil e valem para todos os pedidos.</p>
              </Card>
            )}
          </div>
          <Card className="h-fit space-y-4 p-6 lg:sticky lg:top-24">
            <h2 className="font-bold">Resumo</h2>
            {service && (
              <>
                <p className="text-small text-gray-600">{service.description}</p>
                <Field label="Quantidade" type="number" min={1} max={30} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
                <p className="text-small text-gray-600">Prazo: {service.deliveryDays} dia(s) após o pagamento · {service.revisions} ajuste(s) por peça</p>
              </>
            )}
            {plan && (
              <>
                <ul className="space-y-1 text-small text-gray-700">{plan.items.map((i) => <li key={i.serviceId}>{i.quantity}× {m.service(i.serviceId)?.name} por mês</li>)}</ul>
                <Field label={`Meses (mínimo ${plan.minMonths})`} type="number" min={plan.minMonths} max={24} value={months} onChange={(e) => setMonths(Number(e.target.value) || plan.minMonths)} />
                <p className="text-caption text-green-700">Avulso sairia {formatPrice(planListPrice(plan, m.services))}/mês</p>
              </>
            )}
            <div className="border-t pt-4">
              <p className="text-small text-gray-500">{plan ? "Mensalidade" : "Total"}</p>
              <p className="text-3xl font-bold">{formatPrice(total)}{plan && <span className="text-small font-normal text-gray-500">/mês</span>}</p>
              {plan && <p className="text-caption text-gray-500">{months} meses · total {formatPrice(total * months)}</p>}
            </div>
            <ol className="list-inside list-decimal space-y-1 text-caption text-gray-600">
              <li>Um designer aceita o seu pedido.</li>
              <li>A cobrança aparece na sua área (PIX para o designer).</li>
              <li>Pagou, começa a produção; você aprova cada arte.</li>
            </ol>
            <Button className="w-full" disabled={!!gate || !hydrated} onClick={submit}>Confirmar pedido</Button>
          </Card>
        </div>
      </section>
    </SitePage>
  );
});
