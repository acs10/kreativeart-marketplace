"use client";

import { BadgeCheck, CalendarCheck, CheckCircle2, CreditCard, KeyRound, MessageSquareHeart, Palette, ShieldCheck, Upload, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatPercent } from "@/core/lib/format";
import { observer } from "@/core/state/mobx";
import { Card } from "@/core/ui/ui";
import { SPECIALTIES } from "@/modules/accounts/domain/types";
import { useMarket } from "@/modules/platform/PlatformProvider";
import { PlanCard, ServiceCard } from "./CatalogCards";
import { SitePage } from "./SiteChrome";

const STEPS = [
  { icon: <Palette className="size-6" />, title: "Escolha", text: "Um serviço avulso (um post, um logo…) ou um plano mensal com tudo incluso." },
  { icon: <Users className="size-6" />, title: "Um designer assume", text: "Designers selecionados pela KreativeArt aceitam o seu pedido e cuidam dele do início ao fim." },
  { icon: <CreditCard className="size-6" />, title: "Pague pela plataforma", text: "PIX direto para o designer, com tudo registrado. Planos: uma mensalidade por mês." },
  { icon: <MessageSquareHeart className="size-6" />, title: "Aprove ou peça ajustes", text: "Cada arte chega para você aprovar. Os ajustes ficam registrados até ficar perfeito." },
];

const FAQ = [
  { q: "Preciso criar conta para contratar?", a: "Sim. O cadastro é rápido e é por ele que você acompanha os pedidos, aprova as artes e vê as cobranças." },
  { q: "Como funciona o pagamento?", a: "Depois que um designer aceita o seu pedido, a cobrança aparece na sua área. O pagamento vai direto para o designer, e a KreativeArt fica com uma pequena taxa pela plataforma." },
  { q: "Vocês publicam no meu Instagram?", a: "Nos planos, o designer pode publicar para você. Você guarda o acesso no cofre da sua área; só o designer do seu pedido ativo consegue ver, e você vê cada acesso e pode pausar quando quiser." },
  { q: "E se eu não gostar da arte?", a: "Cada serviço já inclui rodadas de ajuste. É só pedir pela plataforma explicando o que mudar." },
  { q: "Recebo os arquivos editáveis?", a: "Sim. Além da imagem final, o designer anexa os arquivos de origem (Photoshop, Illustrator, CorelDRAW…) quando o serviço prevê." },
];

export const HomePage = observer(function HomePage() {
  const m = useMarket();
  const featured = m.activeServices.slice(0, 6);
  return (
    <SitePage>
      <section className="brand-gradient-soft">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-caption font-semibold text-purple-700 shadow-sm"><BadgeCheck className="size-4" /> Designers selecionados</p>
            <h1 className="text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl">
              Design para a sua marca, <span className="brand-text">sem complicação</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-gray-600">Posts, Reels, logos e identidades visuais feitos por designers profissionais. Você contrata, acompanha e aprova tudo num só lugar.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/planos" className="brand-gradient rounded-xl px-6 py-3 font-semibold text-white shadow-lg hover:opacity-90">Ver planos mensais</Link>
              <Link href="/servicos" className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-800 hover:bg-gray-50">Contratar um serviço</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-small text-gray-600">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-green-600" /> Aprovação de cada arte</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-green-600" /> Pagamento por PIX</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-green-600" /> Arquivos editáveis</span>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="brand-gradient absolute -inset-4 rounded-3xl opacity-20 blur-2xl" />
            <Card className="relative space-y-4 p-6">
              <p className="text-small font-semibold text-gray-500">Sua área de cliente</p>
              {[["Post — Lançamento", "Aguardando aprovação", "bg-yellow-100 text-yellow-800"], ["Reels — Bastidores", "Em produção", "bg-indigo-100 text-indigo-800"], ["Carrossel — Dicas", "Aprovada", "bg-green-100 text-green-800"]].map(([t, s, c]) => (
                <div key={t} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                  <span className="flex items-center gap-3"><span className="brand-gradient size-10 rounded-lg" /> <span className="font-medium">{t}</span></span>
                  <span className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${c}`}>{s}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-small"><span>Mensalidade de outubro</span><span className="font-semibold text-green-700">Paga ✓</span></div>
            </Card>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Como funciona</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Card key={s.title} className="p-6">
              <div className="brand-gradient mb-4 flex size-12 items-center justify-center rounded-xl text-white">{s.icon}</div>
              <p className="text-caption font-bold text-purple-600">PASSO {i + 1}</p>
              <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-small text-gray-600">{s.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">Planos mensais</h2>
          <p className="mt-2 text-center text-gray-600">Conteúdo todo mês, com um designer dedicado e preço fechado.</p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">{m.activePlans.map((p) => <PlanCard key={p.id} plan={p} services={m.services} />)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold">Serviços avulsos</h2>
            <p className="mt-1 text-gray-600">Precisa de algo pontual? Contrate só o que precisar.</p>
          </div>
          <Link href="/servicos" className="font-semibold text-purple-700 hover:underline">Ver todos →</Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{featured.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="brand-gradient grid gap-8 rounded-3xl p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">É designer? Trabalhe com a gente.</h2>
            <p className="mt-3 text-white/90">Pegue os pedidos que combinam com você, receba direto no seu PIX e organize tudo num quadro de produção.</p>
            <Link href="/designers" className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-purple-700 hover:bg-white/90">Quero ser designer KreativeArt</Link>
          </div>
          <ul className="grid gap-3 text-small sm:grid-cols-2">
            {[[<Wallet key="w" className="size-5" />, `Receba ${formatPercent(1 - m.settings.commissionRate)} do valor`], [<CalendarCheck key="c" className="size-5" />, "Prazos e cronograma claros"], [<Upload key="u" className="size-5" />, "Envie PSD, AI, CDR, PNG, MP4…"], [<ShieldCheck key="s" className="size-5" />, "Aprovação registrada"]].map(([icon, text], i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-white/15 p-4">{icon}{text}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Perguntas frequentes</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-gray-200 bg-white p-4 open:shadow-sm">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">{f.q}</summary>
              <p className="mt-2 text-gray-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </SitePage>
  );
});

export const ServicesPage = observer(function ServicesPage() {
  const m = useMarket();
  const [category, setCategory] = useState<string>("");
  const list = m.activeServices.filter((s) => !category || s.category === category);
  const categories = SPECIALTIES.filter((c) => m.activeServices.some((s) => s.category === c));
  return (
    <SitePage>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-4xl font-bold">Serviços</h1>
        <p className="mt-2 text-gray-600">Escolha o serviço, conte o que precisa e um designer KreativeArt assume.</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {["", ...categories].map((c) => (
            <button key={c || "todos"} onClick={() => setCategory(c)} className={`rounded-full px-4 py-1.5 text-small font-medium ${category === c ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{c || "Todos"}</button>
          ))}
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
        <p className="mt-10 text-center text-gray-600">Precisa de conteúdo todo mês? <Link href="/planos" className="font-semibold text-purple-700 hover:underline">Conheça os planos</Link>.</p>
      </section>
    </SitePage>
  );
});

export const PlansPage = observer(function PlansPage() {
  const m = useMarket();
  return (
    <SitePage>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="text-center text-4xl font-bold">Planos mensais</h1>
        <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600">Um contrato com quantidade fixa de peças por mês, cronograma de entregas e um designer dedicado. A mensalidade é cobrada todo mês pela plataforma.</p>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">{m.activePlans.map((p) => <PlanCard key={p.id} plan={p} services={m.services} />)}</div>
        <Card className="mx-auto mt-10 max-w-3xl p-6 text-small text-gray-600">
          <p className="mb-2 flex items-center gap-2 font-semibold text-gray-800"><KeyRound className="size-4" /> E a publicação no Instagram?</p>
          Nos planos, o designer pode publicar por você. Guarde o acesso no <strong>cofre</strong> da sua área: só o designer do seu plano ativo consegue ver, cada acesso fica registrado e você pode pausar a qualquer momento. A plataforma não se conecta ao Instagram; a publicação é feita pelo designer.
        </Card>
      </section>
    </SitePage>
  );
});

export const DesignersPage = observer(function DesignersPage() {
  const m = useMarket();
  const share = formatPercent(1 - m.settings.commissionRate);
  return (
    <SitePage>
      <section className="brand-gradient-soft">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Seja um designer <span className="brand-text">KreativeArt</span></h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">Pedidos de empresas reais, pagamento direto no seu PIX e uma plataforma que organiza a sua produção.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/cadastro/designer" className="brand-gradient rounded-xl px-6 py-3 font-semibold text-white">Quero me cadastrar</Link>
            <Link href="/entrar?perfil=designer" className="rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold">Já tenho cadastro</Link>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {[
          ["Você escolhe os pedidos", "Veja o briefing, o prazo e quanto vai receber antes de aceitar."],
          [`Recebe ${share} do valor`, `O cliente paga direto na sua chave PIX. A KreativeArt fica com ${formatPercent(m.settings.commissionRate)} pela plataforma.`],
          ["Quadro de produção", "A fazer, em produção, em aprovação, ajustes, aprovadas e entregues — tudo num lugar."],
          ["Aprovação sem ruído", "O cliente aprova ou pede ajustes pela plataforma. Cada versão e comentário ficam registrados."],
          ["Formatos profissionais", "Prévia em JPG, PNG, PDF ou MP4 e os arquivos finais em PSD, AI, CDR, SVG, EPS e outros."],
          ["Acesso seguro às redes", "Quando o plano inclui publicação, o login do cliente fica num cofre, visível só para você."],
        ].map(([t, d]) => (
          <Card key={t} className="p-6"><h3 className="font-bold">{t}</h3><p className="mt-1 text-small text-gray-600">{d}</p></Card>
        ))}
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
        <Card className="p-6 text-small text-gray-600">
          <p className="font-semibold text-gray-800">Como é a seleção?</p>
          <p className="mt-1">Depois do cadastro, a equipe KreativeArt analisa o seu portfólio. Aprovado, você já pode aceitar pedidos. Mantemos uma meta de pontualidade de {formatPercent(m.settings.onTimeGoal)} nas entregas.</p>
        </Card>
      </section>
    </SitePage>
  );
});
