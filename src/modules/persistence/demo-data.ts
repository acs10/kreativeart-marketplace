import { addDays, toDay } from "@/core/lib/format";
import { emptyBrand, type Account } from "@/modules/accounts/domain/types";
import type { Plan, Service } from "@/modules/catalog/domain/types";
import type { FileRef, Job } from "@/modules/jobs/domain/types";
import { addMonths, emptyBriefing, type Order } from "@/modules/orders/domain/types";
import { MarketplaceStore, type Actor, type MarketplaceData } from "@/modules/platform/marketplace-store";
import { defaultSettings } from "@/modules/settings/types";

/** Hash de "demo123" (senha de todas as contas demonstrativas). */
const DEMO_HASH = "9ae95bb240280cfc6eb5946460a699ad091c4f660c3a8654ccf3e70f44e6efef";

const IMAGES = [
  "https://images.unsplash.com/photo-1663153205426-2b93a5a8dca9?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1678330197184-125080fa5eea?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1614762586156-8b9a22069f23?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1080&q=80",
];

const services: Service[] = [
  { id: "s-post", name: "Post para feed", description: "Arte única para o feed do Instagram/Facebook, com legenda revisada.", category: "Social media", deliverable: "Post de feed", price: 70, deliveryDays: 3, revisions: 2, active: true },
  { id: "s-carrossel", name: "Carrossel", description: "Até 8 lâminas com narrativa e chamada para ação.", category: "Social media", deliverable: "Carrossel", price: 140, deliveryDays: 4, revisions: 2, active: true },
  { id: "s-reels", name: "Reels editado", description: "Vídeo vertical até 60 s com cortes, legendas e trilha.", category: "Reels e vídeo", deliverable: "Reels", price: 180, deliveryDays: 5, revisions: 1, active: true },
  { id: "s-stories", name: "Stories", description: "Sequência de stories estáticos ou animados.", category: "Social media", deliverable: "Stories", price: 45, deliveryDays: 2, revisions: 1, active: true },
  { id: "s-logo", name: "Logo", description: "3 propostas de logotipo, versão final em vetor e PNG.", category: "Identidade visual", deliverable: "Logo", price: 650, deliveryDays: 10, revisions: 3, active: true },
  { id: "s-identidade", name: "Identidade visual completa", description: "Logo, paleta, tipografia, aplicações e manual da marca.", category: "Identidade visual", deliverable: "Identidade visual", price: 1800, deliveryDays: 20, revisions: 3, active: true },
  { id: "s-banner", name: "Banner / capa", description: "Capa de destaque, banner de site ou de evento.", category: "Web e banners", deliverable: "Banner / capa", price: 90, deliveryDays: 3, revisions: 2, active: true },
  { id: "s-impresso", name: "Material impresso", description: "Cardápio, flyer, cartão de visita ou folder pronto para gráfica.", category: "Impressos", deliverable: "Material impresso", price: 260, deliveryDays: 6, revisions: 2, active: true },
  { id: "s-ilustracao", name: "Ilustração", description: "Ilustração digital exclusiva para posts ou produtos.", category: "Ilustração", deliverable: "Ilustração", price: 320, deliveryDays: 7, revisions: 2, active: true },
];

const plans: Plan[] = [
  { id: "p-essencial", name: "Essencial", tagline: "Presença constante no Instagram", items: [{ serviceId: "s-post", quantity: 8 }, { serviceId: "s-stories", quantity: 4 }], monthlyPrice: 590, minMonths: 3, highlight: false, active: true },
  { id: "p-crescimento", name: "Crescimento", tagline: "Conteúdo variado para engajar e vender", items: [{ serviceId: "s-post", quantity: 8 }, { serviceId: "s-carrossel", quantity: 4 }, { serviceId: "s-reels", quantity: 4 }, { serviceId: "s-stories", quantity: 8 }], monthlyPrice: 1390, minMonths: 3, highlight: true, active: true },
  { id: "p-profissional", name: "Profissional", tagline: "Marca forte em todas as frentes", items: [{ serviceId: "s-post", quantity: 12 }, { serviceId: "s-carrossel", quantity: 6 }, { serviceId: "s-reels", quantity: 8 }, { serviceId: "s-stories", quantity: 12 }, { serviceId: "s-banner", quantity: 1 }], monthlyPrice: 2390, minMonths: 6, highlight: false, active: true },
];

function accounts(now: Date): Account[] {
  const created = (daysAgo: number) => new Date(now.getTime() - daysAgo * 864e5).toISOString();
  const base = { passwordHash: DEMO_HASH, status: "active" as const };
  return [
    { ...base, id: "u-admin", role: "admin", name: "Equipe KreativeArt", email: "admin@kreativeart.com", phone: "(63) 99999-0000", createdAt: created(400) },
    { ...base, id: "u-ana", role: "designer", name: "Ana Ribeiro", email: "ana@kreativeart.com", phone: "(63) 99111-1111", createdAt: created(300), bio: "Designer de social media há 6 anos, foco em marcas de tecnologia e serviços.", specialties: ["Social media", "Identidade visual"], portfolioUrl: "https://www.behance.net/", pixKeyType: "E-mail", pixKey: "ana.pix@exemplo.com", document: "000.000.001-91", weeklyCapacity: 12 },
    { ...base, id: "u-bruno", role: "designer", name: "Bruno Martins", email: "bruno@kreativeart.com", phone: "(63) 99222-2222", createdAt: created(200), bio: "Motion designer e editor de Reels.", specialties: ["Reels e vídeo", "Social media"], portfolioUrl: "https://www.behance.net/", pixKeyType: "CPF", pixKey: "000.000.002-72", document: "000.000.002-72", weeklyCapacity: 8 },
    { ...base, id: "u-diego", role: "designer", name: "Diego Souza", email: "diego@kreativeart.com", phone: "(63) 99333-3333", createdAt: created(60), bio: "Branding e ilustração.", specialties: ["Identidade visual", "Ilustração", "Impressos"], portfolioUrl: "https://dribbble.com/", pixKeyType: "Telefone", pixKey: "(63) 99333-3333", document: "000.000.003-53", weeklyCapacity: 6 },
    { ...base, id: "u-carla", role: "designer", name: "Carla Mendes", email: "carla@kreativeart.com", phone: "(63) 99444-4444", createdAt: created(2), status: "pending", bio: "Recém-formada em design gráfico, apaixonada por tipografia.", specialties: ["Social media", "Impressos"], portfolioUrl: "https://www.instagram.com/", pixKeyType: "Chave aleatória", pixKey: "a1b2c3d4-0000-0000-0000-000000000000", document: "000.000.004-34", weeklyCapacity: 5 },
    { ...base, id: "u-tech", role: "client", name: "Marcos Lima", email: "contato@techsolutions.com", phone: "(63) 98111-0000", createdAt: created(120), company: "Tech Solutions", document: "00.000.000/0002-00", instagram: "@techsolutions", brand: { logoUrl: IMAGES[0], colors: ["#1e3a8a", "#38bdf8", "#f8fafc"], fonts: "Montserrat (títulos) e Inter (textos)", tone: "Profissional, próximo e didático", notes: "Evitar fotos de banco muito genéricas." } },
    { ...base, id: "u-fashion", role: "client", name: "Juliana Prado", email: "comercial@fashionstore.com", phone: "(63) 98222-0000", createdAt: created(40), company: "Fashion Store", document: "00.000.000/0003-00", instagram: "@fashionstore", brand: { logoUrl: IMAGES[2], colors: ["#111827", "#f472b6", "#fde68a"], fonts: "Playfair Display e Poppins", tone: "Elegante e divertido", notes: "Sempre mostrar preço nas peças de produto." } },
    { ...base, id: "u-cafe", role: "client", name: "Rafael Costa", email: "contato@cafearoma.com", phone: "(63) 98333-0000", createdAt: created(70), company: "Café Aroma", document: "00.000.000/0004-00", instagram: "@cafearoma", brand: { ...emptyBrand(), colors: ["#78350f", "#fef3c7"], tone: "Aconchegante" } },
  ];
}

const preview = (i: number, name = "arte.jpg"): FileRef => ({ id: `demo-${i}-${name}`, name, size: 380_000, mime: "image/jpeg", ext: "jpg", kind: "preview", url: IMAGES[i % IMAGES.length] });
const source = (name: string, ext: string, size: number): FileRef => ({ id: `demo-src-${name}`, name, size, mime: "application/octet-stream", ext, kind: "source", url: "#" });

/**
 * Dados demonstrativos montados com as PRÓPRIAS regras da plataforma (mesmos métodos das telas),
 * depois "envelhecidos" para criar histórico: meses pagos, peças entregues, atrasos e cobranças vencidas.
 */
export function createDemoData(now = new Date()): MarketplaceData {
  const today = toDay(now);
  const month = today.slice(0, 7);
  const iso = (day: string, hour = 10) => `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`;
  const m = new MarketplaceStore({ accounts: accounts(now), services, plans, orders: [], jobs: [], charges: [], credentials: [], settings: defaultSettings(), orderCounter: 0 });
  const actor = (id: string): Actor => ({ id, name: m.nameOf(id), role: m.account(id)!.role });
  const brief = (objective: string, extra: Partial<ReturnType<typeof emptyBriefing>> = {}) => ({ ...emptyBriefing(), objective, ...extra });
  let img = 0;

  /** Leva uma peça até um estado, com datas coerentes. */
  const progress = (job: Job, to: "in_progress" | "in_review" | "changes_requested" | "approved" | "delivered", submittedDay: string) => {
    const designer = actor(job.designerId!);
    const client = actor(job.clientId);
    m.moveJob(job.id, "in_progress", designer);
    if (to === "in_progress") return;
    m.submitVersion(job.id, designer, [preview(img++)], "", "Legenda sugerida pelo designer. ✨");
    job.firstSubmittedAt = iso(submittedDay);
    job.versions[0].createdAt = iso(submittedDay);
    if (to === "in_review") return;
    if (to === "changes_requested") return void m.requestChanges(job.id, client, "Pode deixar o logo maior e trocar a cor do fundo para o azul da marca?");
    m.approveJob(job.id, client, "Ficou ótimo!");
    job.approvedAt = iso(addDays(submittedDay, 1));
    if (to === "delivered") {
      m.markDelivered(job.id, designer, job.publishDate ? "Publicado no Instagram." : "Arquivos finais entregues.");
      job.deliveredAt = iso(addDays(submittedDay, 2));
      job.versions[0].files.push(source(`${job.id}.psd`, "psd", 24_000_000));
    }
  };
  const jobsOf = (o: Order, period?: string) => m.jobs.filter((j) => j.orderId === o.id && j.period === period).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const backdate = (o: Order, daysAgo: number) => {
    o.createdAt = iso(addDays(today, -daysAgo));
    o.acceptedAt = iso(addDays(today, -daysAgo + 1));
    o.activatedAt = iso(addDays(today, -daysAgo + 2));
  };

  // 1) Tech Solutions — Identidade visual concluída (Ana), há ~2 meses.
  const identidade = m.placeOrder(actor("u-tech"), { kind: "service", serviceId: "s-identidade", quantity: 1, briefing: brief("Renovar a identidade da empresa para o novo posicionamento em nuvem.") }) as Order;
  m.acceptOrder(identidade.id, actor("u-ana"));
  m.payCharge(m.charges.find((c) => c.orderId === identidade.id)!.id, actor("u-tech"));
  backdate(identidade, 70);
  for (const c of m.charges.filter((c) => c.orderId === identidade.id)) Object.assign(c, { dueDate: addDays(today, -66), paidAt: iso(addDays(today, -67)), createdAt: iso(addDays(today, -69)) });
  for (const j of jobsOf(identidade)) {
    j.dueDate = addDays(today, -48);
    progress(j, "delivered", addDays(today, -50));
    j.versions[0].files.push(source("manual-da-marca.ai", "ai", 18_500_000), source("logo-final.cdr", "cdr", 4_200_000));
  }

  // 2) Tech Solutions — Plano Crescimento há 2 meses (Ana): meses anteriores pagos e entregues; mês atual em produção.
  const crescimento = m.placeOrder(actor("u-tech"), { kind: "plan", planId: "p-crescimento", months: 6, briefing: brief("Gerar leads para o plano empresarial e educar sobre segurança em nuvem.", { audience: "Pequenas e médias empresas do Tocantins", references: "@rdstation, @nubank", copy: "Tom didático, sempre com chamada para o WhatsApp." }) }) as Order;
  crescimento.startMonth = addMonths(month, -2);
  crescimento.billingDay = 5;
  m.acceptOrder(crescimento.id, actor("u-ana"));
  const firstCharge = m.charges.find((c) => c.orderId === crescimento.id)!;
  Object.assign(firstCharge, { dueDate: `${crescimento.startMonth}-05` });
  m.payCharge(firstCharge.id, actor("u-tech"));
  backdate(crescimento, 62);
  m.jobs = m.jobs.filter((j) => j.orderId !== crescimento.id); // refaz o 1º mês com as datas do passado
  m.tick(today);
  for (const c of m.charges.filter((c) => c.orderId === crescimento.id)) {
    if (c.period! < month) {
      if (c.status === "pending") m.payCharge(c.id, actor("u-tech"));
      c.paidAt = iso(addDays(c.dueDate, -1));
    } else if (c.period === month) {
      c.dueDate = addDays(today, 3);
    }
  }
  for (const period of [addMonths(month, -2), addMonths(month, -1)]) {
    jobsOf(crescimento, period).forEach((j, i) => progress(j, "delivered", addDays(j.dueDate, i % 12 === 5 ? 1 : -1)));
  }
  const current = jobsOf(crescimento, month);
  current.forEach((j, i) => {
    if (j.dueDate < addDays(today, -3)) progress(j, "delivered", addDays(j.dueDate, -1));
    else if (j.dueDate <= today) progress(j, i % 3 === 0 ? "changes_requested" : "in_review", addDays(j.dueDate, -1));
    else if (i % 4 === 0) progress(j, "in_progress", today);
  });
  // garante peças para o cliente aprovar hoje
  const toReview = current.filter((j) => j.status === "todo" || j.status === "in_progress").slice(0, 2);
  toReview.forEach((j) => progress(j, "in_review", today));

  // 3) Fashion Store — Plano Essencial neste mês (Bruno), com peças atrasadas.
  const essencial = m.placeOrder(actor("u-fashion"), { kind: "plan", planId: "p-essencial", months: 3, briefing: brief("Divulgar a coleção de verão e as promoções da semana.", { references: "@zara, @farmrio" }) }) as Order;
  essencial.startMonth = month;
  m.acceptOrder(essencial.id, actor("u-bruno"));
  m.payCharge(m.charges.find((c) => c.orderId === essencial.id)!.id, actor("u-fashion"));
  backdate(essencial, 14);
  const fashionJobs = jobsOf(essencial, month);
  fashionJobs.slice(0, 3).forEach((j, i) => (j.dueDate = addDays(today, -(4 - i))));
  progress(fashionJobs[3], "in_review", addDays(today, -1));
  progress(fashionJobs[4], "in_progress", today);

  // 4) Café Aroma — Plano Essencial desde o mês passado (Bruno); mensalidade atual vencida há 8 dias → produção pausada.
  const cafe = m.placeOrder(actor("u-cafe"), { kind: "plan", planId: "p-essencial", months: 3, briefing: brief("Aumentar o movimento nas manhãs de semana com promoções de café da manhã.") }) as Order;
  cafe.startMonth = addMonths(month, -1);
  cafe.billingDay = 1;
  m.acceptOrder(cafe.id, actor("u-bruno"));
  const cafeFirst = m.charges.find((c) => c.orderId === cafe.id)!;
  cafeFirst.dueDate = `${cafe.startMonth}-01`;
  m.payCharge(cafeFirst.id, actor("u-cafe"));
  backdate(cafe, 40);
  m.jobs = m.jobs.filter((j) => j.orderId !== cafe.id);
  m.tick(today);
  jobsOf(cafe, addMonths(month, -1)).forEach((j, i) => progress(j, "delivered", addDays(j.dueDate, i % 3 === 0 ? 2 : 0)));
  const cafeNow = m.charges.find((c) => c.orderId === cafe.id && c.period === month)!;
  cafeNow.dueDate = addDays(today, -8);

  // 5) Oportunidades abertas e pedido aguardando pagamento.
  m.placeOrder(actor("u-cafe"), { kind: "service", serviceId: "s-impresso", quantity: 1, briefing: brief("Cardápio novo com fotos dos cafés especiais e preços atualizados.", { copy: "Lista de itens e preços enviada no WhatsApp." }) });
  m.placeOrder(actor("u-fashion"), { kind: "service", serviceId: "s-reels", quantity: 2, briefing: brief("Dois Reels mostrando os looks da nova coleção em movimento.") });
  const logo = m.placeOrder(actor("u-fashion"), { kind: "service", serviceId: "s-logo", quantity: 1, briefing: brief("Logo para a nova linha infantil da loja, a Fashion Kids.") }) as Order;
  m.acceptOrder(logo.id, actor("u-diego"));
  m.charges.find((c) => c.orderId === logo.id)!.dueDate = addDays(today, 1);

  // 6) Cofre de acessos.
  m.saveCredential("u-tech", { platform: "Instagram", login: "@techsolutions", secret: "Senha-Demo-123", twoFactor: "Código por SMS para o celular do Marcos", notes: "Publicar sempre às 18h.", shared: true });
  m.saveCredential("u-fashion", { platform: "Instagram", login: "@fashionstore", secret: "Demo-Fashion-2026", twoFactor: "App autenticador — pedir o código no WhatsApp", notes: "", shared: true });
  m.saveCredential("u-cafe", { platform: "Instagram", login: "@cafearoma", secret: "Cafe-Demo-1", twoFactor: "", notes: "Acesso pausado até regularizar a mensalidade.", shared: false });
  const techCred = m.credentials.find((c) => c.clientId === "u-tech")!;
  techCred.logs.push({ id: "log-1", designerId: "u-ana", designerName: "Ana Ribeiro", at: iso(addDays(today, -3), 18) });

  return JSON.parse(JSON.stringify(m.snapshot)) as MarketplaceData;
}
