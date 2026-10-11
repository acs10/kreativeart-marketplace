// Passeio automático: entra com cada perfil, abre todas as páginas e registra erros do navegador.
// Uso: com `npx next dev -p 3002` rodando →  node tests/e2e/smoke.mjs [baseUrl] [pastaDeCapturas]
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:3002";
const OUT = process.argv[3];
if (OUT) mkdirSync(OUT, { recursive: true });
const ROUTES = {
  public: ["/", "/servicos", "/planos", "/designers", "/contratar/plano/p-crescimento", "/entrar", "/cadastro/cliente", "/cadastro/designer"],
  client: ["/cliente", "/cliente/aprovacoes", "/cliente/pedidos", "/cliente/financeiro", "/cliente/calendario", "/cliente/acessos", "/cliente/perfil"],
  designer: ["/designer", "/designer/oportunidades", "/designer/quadro", "/designer/calendario", "/designer/ganhos", "/designer/perfil"],
  admin: ["/admin", "/admin/inteligencia", "/admin/pedidos", "/admin/entregas", "/admin/designers", "/admin/clientes", "/admin/financeiro", "/admin/catalogo", "/admin/configuracoes"],
};
const LOGIN = { client: "Cliente", designer: "Designer", admin: "KreativeArt" };

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let failures = 0;
for (const [role, routes] of Object.entries(ROUTES)) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(process.env.MOBILE ? { width: 375, height: 812, isMobile: true, hasTouch: true } : { width: 1366, height: 900 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.split("\n")[0]}`));
  page.on("console", (msg) => msg.type() === "error" && !/favicon|Download the React DevTools/.test(msg.text()) && errors.push(`console: ${msg.text().split("\n")[0].slice(0, 160)}`));
  if (role !== "public") {
    await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle0" });
    const [btn] = await page.$$(`xpath/.//button[normalize-space(.)=${JSON.stringify(LOGIN[role])}]`);
    await btn.click();
    await page.waitForFunction((r) => location.pathname.startsWith(r), { timeout: 20000 }, `/${role === "client" ? "cliente" : role}`);
  }
  for (const path of routes) {
    errors.length = 0;
    await page.goto(BASE + path, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 600));
    const text = await page.evaluate(() => document.body.innerText);
    const overlay = await page.evaluate(() => !!document.querySelector("nextjs-portal"));
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const landed = await page.evaluate(() => location.pathname);
    const redirected = landed !== path.split("?")[0];
    const problems = [...errors, ...(overlay && /Unhandled|Error/.test(text) ? ["overlay de erro do Next"] : []), ...(/Carregando…/.test(text) && text.length < 40 ? ["ficou em Carregando…"] : []), ...(wide ? ["rolagem horizontal"] : []), ...(redirected ? ["redirecionou para " + landed] : [])];
    if (OUT) await page.screenshot({ path: `${OUT}/${role}${path.replaceAll("/", "_") || "_home"}.png` });
    if (problems.length) failures++;
    console.log(`${problems.length ? "❌" : "✅"} [${role}] ${path}${problems.length ? " — " + [...new Set(problems)].join(" | ") : ""}`);
  }
  await ctx.close();
}
await browser.close();
console.log(failures ? `\n${failures} página(s) com problema` : "\nTodas as páginas sem erro");
process.exit(failures ? 1 : 0);
