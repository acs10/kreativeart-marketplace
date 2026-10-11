// Fluxos completos com navegador real (Chrome + puppeteer-core), num único navegador
// (mesmo armazenamento local), trocando de usuário como na vida real.
// Uso: com `npx next dev -p 3002` rodando →  node tests/e2e/flows.mjs [baseUrl]
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:3002";
const FIX = path.resolve("tests/e2e/fixtures");
const results = [];
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
const errors = [];
// "Sair do site?" aparece se ainda houver alteração indo para o servidor (proteção do app): aceita, como um usuário.
page.on("dialog", (d) => void d.accept());
page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));

async function step(id, title, fn) {
  try { const d = await fn(); results.push(true); console.log(`✅ ${id} ${title}${d ? ` — ${d}` : ""}`); }
  catch (e) { results.push(false); console.log(`❌ ${id} ${title} — ${e.message}`); await page.screenshot({ path: `tests/e2e/fail-${id}.png` }).catch(() => {}); }
}
const text = () => page.evaluate(() => document.body.innerText.replace(/ /g, " "));
const go = async (p) => { await page.goto(BASE + p, { waitUntil: "networkidle0" }); await sleep(400); };
async function click(label, tag = "button") {
  for (let i = 0; i < 20; i++) {
    const all = await page.$$(`xpath/.//${tag}[contains(normalize-space(.), ${JSON.stringify(label)})]`);
    for (const el of all) if (await el.evaluate((n) => n.getClientRects().length > 0 && !n.disabled)) { await el.evaluate((n) => n.scrollIntoView({ block: "center" })); await el.click(); await sleep(350); return; }
    await sleep(250);
  }
  throw new Error(`não achei "${label}"`);
}
async function fill(label, value) {
  const [input] = await page.$$(`xpath/.//label[span[normalize-space(.)=${JSON.stringify(label)}]]//*[self::input or self::textarea or self::select]`);
  assert(input, `campo "${label}" não encontrado`);
  await input.click({ clickCount: 3 });
  await input.type(String(value));
}
async function login(email, password = email === EMAIL ? "SenhaForte123" : "demo123") {
  await go("/entrar");
  await page.type("input[type=email]", email);
  await page.type("input[type=password]", password);
  await click("Entrar");
  await page.waitForFunction(() => !location.pathname.startsWith("/entrar"), { timeout: 15000 });
}
async function logout() { await click("Sair"); await sleep(500); }
const toast = async (re) => page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), { timeout: 8000 }, re.source);

const EMAIL = `cliente.teste.${Date.now()}@exemplo.com`;
let orderNumber;

await step("F-01", "contratar exige cadastro de cliente", async () => {
  await go("/contratar/plano/p-essencial");
  const t = await text();
  assert(t.includes("entre ou crie sua conta de cliente"), "não pediu cadastro");
  await click("Criar conta", "a");
  await page.waitForFunction(() => location.pathname === "/cadastro/cliente");
  return "redirecionou para o cadastro com retorno ao plano";
});

await step("F-02", "cadastro de cliente valida e cria a conta", async () => {
  await click("Criar conta");
  assert((await text()).includes("Informe seu nome completo"), "sem validação");
  await fill("Nome completo", "Paula Teste");
  await fill("Empresa ou marca", "Doceria da Paula");
  await fill("E-mail", EMAIL);
  await fill("Telefone / WhatsApp", "63999990000");
  const pw = await page.$$("input[type=password]");
  await pw[0].type("SenhaForte123");
  await pw[1].type("SenhaForte123");
  await page.click("input[type=checkbox]");
  await click("Criar conta");
  await page.waitForFunction(() => location.pathname.startsWith("/contratar/plano/p-essencial"), { timeout: 15000 });
  return "voltou para a contratação já logado";
});

await step("F-03", "contratar o plano com briefing", async () => {
  await click("Confirmar pedido");
  assert(/objetivo/i.test(await text()), "não validou o objetivo");
  await fill("Objetivo *", "Divulgar os bolos de pote e as encomendas de aniversário.");
  await click("Confirmar pedido");
  await page.waitForFunction(() => location.pathname === "/cliente/pedidos", { timeout: 15000 });
  const t = await text();
  orderNumber = t.match(/KA-\d{4}-\d{4}/)?.[0];
  assert(orderNumber && t.includes("Aguardando designer"), "pedido não aparece");
  return `${orderNumber} aguardando designer`;
});

await step("F-04", "designer em análise não aceita; designer ativo aceita", async () => {
  await logout();
  await login("carla@kreativeart.com");
  await go("/designer/oportunidades");
  assert((await text()).includes("em análise"), "sem aviso de análise");
  await logout();
  await login("diego@kreativeart.com");
  await go("/designer/oportunidades");
  await page.click("input[type=checkbox]"); // mostrar todas as especialidades
  await sleep(300);
  assert((await text()).includes(orderNumber), "pedido não aparece nas oportunidades");
  const card = await page.$(`xpath/.//div[contains(., ${JSON.stringify(orderNumber)})][.//button[contains(., "Ver briefing")]][last()]//button[contains(., "Ver briefing")]`);
  await card.click();
  await sleep(400);
  assert((await text()).includes("Você recebe R$ 531,00") || (await text()).includes("531,00"), "valor do designer (90%) não aparece");
  await click("Aceitar pedido");
  await toast(/Pedido aceito/);
  return "Diego aceitou; mostra R$ 531,00 (90% de R$ 590)";
});

await step("F-05", "cliente paga e a produção começa", async () => {
  await logout();
  await login(EMAIL);
  await go("/cliente/financeiro");
  const t = await text();
  assert(t.includes("R$ 590,00") && t.includes("Em aberto"), "cobrança não apareceu");
  await click("Pagar");
  const modal = await text();
  assert(modal.includes("Diego Souza") && modal.includes("R$ 531,00") && modal.includes("R$ 59,00"), "divisão 90/10 não exibida");
  await click("com PIX");
  await toast(/Pagamento confirmado/);
  await go("/cliente/pedidos");
  assert((await text()).includes("Em andamento"), "pedido não ativou");
  return "pago para a chave PIX do Diego; KreativeArt R$ 59,00; pedido em andamento";
});

await step("F-06", "designer envia prévia PNG + PSD + CDR (miniaturas geradas)", async () => {
  await logout();
  await login("diego@kreativeart.com");
  await go("/designer/quadro");
  await page.select("select", (await page.$$eval("select option", (os) => os.find((o) => o.textContent === "Doceria da Paula")?.value)) ?? "");
  await sleep(300);
  const [first] = await page.$$(`xpath/.//section[@aria-label="A fazer"]//button[contains(., "Post")]`);
  await first.click();
  await sleep(400);
  await click("Começar produção");
  const inputs = await page.$$("input[type=file]");
  await inputs[0].uploadFile(path.join(FIX, "arte-v1.png"));
  await sleep(800);
  await inputs[1].uploadFile(path.join(FIX, "arte.psd"), path.join(FIX, "logo.cdr"));
  // Envio real ao servidor (em produção, pela internet): espera as 3 miniaturas aparecerem.
  await page.waitForFunction(() => { const alts = [...document.querySelectorAll("ul li img")].map((i) => i.alt); return ["arte-v1.png", "arte.psd", "logo.cdr"].every((n) => alts.some((a) => a.includes(n))); }, { timeout: 45000 }).catch(() => {});
  const thumbs = await page.$$eval("ul li img", (imgs) => imgs.map((i) => i.alt));
  assert(thumbs.some((a) => a.includes("arte.psd")) && thumbs.some((a) => a.includes("logo.cdr")), `miniaturas PSD/CDR não geradas (${thumbs.join(", ")})`);
  await click("Enviar para aprovação");
  await toast(/Enviado para o cliente/);
  return "PNG de prévia; PSD e CDR com miniatura extraída";
});

await step("F-07", "cliente pede ajuste; designer envia v2; cliente aprova", async () => {
  await logout();
  await login(EMAIL);
  await go("/cliente/aprovacoes");
  await click("Post", "button");
  assert((await text()).includes("liberado(s) após a aprovação"), "editáveis deveriam estar bloqueados antes da aprovação");
  await page.type("textarea", "Trocar o rosa por um tom mais claro, por favor.");
  await click("Pedir ajustes");
  await toast(/Ajustes enviados/);
  await logout();
  await login("diego@kreativeart.com");
  await go("/designer/quadro");
  const [card] = await page.$$(`xpath/.//section[@aria-label="Ajustes solicitados"]//button[contains(., "Post")]`);
  await card.click();
  await sleep(400);
  const inputs = await page.$$("input[type=file]");
  await inputs[0].uploadFile(path.join(FIX, "arte-v2.png"));
  await page.waitForFunction(() => [...document.querySelectorAll("ul li img")].some((i) => i.alt.includes("arte-v2.png")), { timeout: 45000 }).catch(() => {});
  await click("Enviar para aprovação");
  await toast(/Enviado para o cliente/);
  await logout();
  await login(EMAIL);
  await go("/cliente/aprovacoes");
  await click("Post", "button");
  assert((await text()).includes("Versão 2"), "versão 2 não aparece");
  await click("Aprovar");
  await toast(/aprovada/);
  return "v1 → ajuste → v2 → aprovada";
});

await step("F-08", "designer revela o acesso do cliente (fica registrado) e confirma a publicação", async () => {
  await logout();
  await login(EMAIL);
  await go("/cliente/acessos");
  await click("Adicionar acesso");
  await fill("Usuário ou e-mail de login", "@doceriadapaula");
  await page.type("input[type=password]", "Senha-Teste-1");
  await click("Salvar");
  await logout();
  await login("diego@kreativeart.com");
  await go("/designer/quadro");
  const [card] = await page.$$(`xpath/.//section[@aria-label="Aprovada"]//button[contains(., "Post")]`);
  await card.click();
  await sleep(400);
  await click("Revelar senha");
  await page.waitForFunction(() => document.body.innerText.includes("Senha-Teste-1"), { timeout: 15000 }).catch(() => {});
  assert((await text()).includes("Senha-Teste-1"), "senha não revelada");
  await click("Confirmar publicação");
  await toast(/Publicação registrada/);
  await logout();
  await login(EMAIL);
  await go("/cliente/acessos");
  assert((await text()).includes("Diego Souza revelou"), "registro de acesso não aparece para o cliente");
  return "senha revelada, registro visível ao cliente, peça entregue";
});

await step("F-09", "KreativeArt aprova a designer em análise e vê a comissão", async () => {
  await logout();
  await login("admin@kreativeart.com");
  await go("/admin/designers");
  await click("Aprovar");
  await toast(/aprovado/);
  await go("/admin/financeiro");
  const t = await text();
  assert(t.includes("Doceria da Paula") && t.includes("R$ 59,00"), "comissão do novo pedido não aparece");
  return "Carla aprovada; comissão R$ 59,00 no financeiro";
});

await browser.close();
const ok = results.filter(Boolean).length;
console.log(`\nResultado: ${ok}/${results.length} fluxos aprovados${errors.length ? ` · erros de página: ${[...new Set(errors)].join(" | ")}` : ""}`);
process.exit(ok === results.length && !errors.length ? 0 : 1);
