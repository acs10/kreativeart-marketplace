// Verificações no site publicado (de fora do Netlify).
// Uso: node tests/e2e/producao.mjs https://kreativeart.netlify.app
import { readFileSync } from "node:fs";

const BASE = (process.argv[2] ?? "https://kreativeart.netlify.app").replace(/\/$/, "");
const DOCS_CODE = readFileSync("src/modules/docs/docs-access.ts", "utf8").match(/"([^"]+)"/)[1];
const results = [];
const assert = (c, m) => { if (!c) throw new Error(m); };
async function check(id, title, fn) {
  try { const d = await fn(); results.push(true); console.log(`✅ ${id} ${title} — ${d}`); }
  catch (e) { results.push(false); console.log(`❌ ${id} ${title} — ${e.message}`); }
}
async function get(path, init) {
  const t = Date.now();
  const res = await fetch(BASE + path, { redirect: "manual", ...init });
  const text = await res.text();
  return { res, text, ms: Date.now() - t };
}

console.log(`Produção: ${BASE} — ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}\n`);

await check("PRD-01", "páginas públicas e 404", async () => {
  const home = await get("/");
  assert(home.res.status === 200 && home.text.includes("KreativeArt"), `início ${home.res.status}`);
  for (const p of ["/servicos", "/planos", "/designers", "/entrar"]) assert((await get(p)).res.status === 200, `${p} fora do ar`);
  const nf = await get("/pagina-inexistente");
  assert(nf.res.status === 404, `inexistente ${nf.res.status}`);
  return `início 200 em ${(home.ms / 1000).toFixed(2)} s; serviços, planos, designers e login 200; 404 ok`;
});

await check("PRD-02", "banco de dados e modo de pagamento", async () => {
  const { res, text, ms } = await get("/api/state");
  const j = JSON.parse(text);
  assert(res.status === 200 && j.store === "firestore", `banco ${j.store}`);
  assert(j.data.services.length > 0 && j.data.plans.length > 0, "catálogo vazio");
  assert(j.payments && j.payments.enabled === false, "pagamento online deveria estar desligado (modo demonstração)");
  return `Firestore respondendo em ${(ms / 1000).toFixed(2)} s; ${j.data.services.length} serviços; pagamento em modo demonstração`;
});

await check("PRD-03", "cabeçalhos de segurança", async () => {
  const { res } = await get("/");
  const need = ["content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "strict-transport-security"];
  const missing = need.filter((k) => !res.headers.get(k));
  assert(!missing.length, `faltando ${missing}`);
  assert(!res.headers.get("x-powered-by"), "X-Powered-By presente");
  return "6/6 presentes; X-Powered-By ausente";
});

await check("PRD-04", "nada sensível exposto", async () => {
  const { text } = await get("/api/state");
  assert(!/scrypt\$|passwordHash":"[^"]|secretEnc|BEGIN PRIVATE KEY/.test(text), "dado sensível na resposta pública");
  for (const p of ["/.env.local", "/firebase-service-account.json", "/.data/marketplace.json"]) assert((await get(p)).res.status === 404, `${p} acessível`);
  const hook = await get("/api/webhooks/mercadopago", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert(hook.res.status === 404, `webhook ativo sem Mercado Pago (${hook.res.status})`);
  return "sem hash nem cofre na resposta; arquivos locais 404; webhook desligado (404) sem credenciais";
});

await check("PRD-05", "documentação no link secreto", async () => {
  const ok = await get(`/documents/${DOCS_CODE}`);
  assert(ok.res.status === 200, `link ${ok.res.status}`);
  assert(/noindex/.test(ok.res.headers.get("x-robots-tag") ?? ""), "sem X-Robots-Tag");
  assert((ok.res.headers.get("content-security-policy") ?? "").includes("cdn.jsdelivr.net"), "CSP própria ausente");
  const wrong = await get("/documents/codigo-errado");
  const site = await get("/");
  assert(wrong.res.status === 404, `código errado ${wrong.res.status}`);
  assert(!(site.res.headers.get("content-security-policy") ?? "").includes("jsdelivr"), "CSP do site afrouxada");
  return "link 200 com noindex e CSP própria; código errado 404; CSP do site intacta";
});

const ok = results.filter(Boolean).length;
console.log(`\nResultado: ${ok}/${results.length} grupos aprovados`);
process.exit(ok === results.length ? 0 : 1);
