// Segurança da API: o que cada perfil vê e o que o servidor recusa.
// Uso: com o site rodando →  node tests/e2e/api-security.mjs [baseUrl]
const BASE = (process.argv[2] ?? "http://localhost:3005").replace(/\/$/, "");
const ORIGIN = { Origin: BASE };
const results = [];
const assert = (c, m) => { if (!c) throw new Error(m); };
async function check(id, title, fn) {
  try { const d = await fn(); results.push(true); console.log(`✅ ${id} ${title} — ${d}`); }
  catch (e) { results.push(false); console.log(`❌ ${id} ${title} — ${e.message}`); }
}

/** Sessão simples: guarda o cookie entre as chamadas. */
function session() {
  let cookie = "";
  const call = async (path, body, extra = {}) => {
    const res = await fetch(BASE + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { ...(body === undefined ? {} : { "Content-Type": "application/json", ...ORIGIN }), ...(cookie ? { Cookie: cookie } : {}), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch { /* binário */ }
    return { status: res.status, json, text };
  };
  return { call, login: (email, password = "demo123") => call("/api/auth/login", { email, password }) };
}
const command = (s, name, args) => s.call("/api/command", { name, args, ids: [] });
const raw = (r) => JSON.stringify(r.json);

await check("API-01", "visitante vê só o catálogo", async () => {
  const r = await session().call("/api/state");
  assert(r.status === 200, `status ${r.status}`);
  const d = r.json.data;
  assert(d.orders.length === 0 && d.jobs.length === 0 && d.charges.length === 0 && d.credentials.length === 0, "dados privados para visitante");
  assert(d.accounts.every((a) => a.role === "designer" && !a.email && !a.phone && !a.pixKey && !a.document && !a.passwordHash), "dados pessoais de designers expostos");
  return `${d.services.length} serviços, ${d.plans.length} planos, ${d.accounts.length} designers (sem e-mail, telefone, PIX ou documento)`;
});

const client = session();
const designer = session();
const admin = session();

await check("API-02", "login: senha errada recusada; certa abre sessão HttpOnly", async () => {
  const bad = await session().login("contato@techsolutions.com", "errada123");
  assert(bad.status === 401, `senha errada ${bad.status}`);
  const res = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json", ...ORIGIN }, body: JSON.stringify({ email: "contato@techsolutions.com", password: "demo123" }) });
  const cookie = res.headers.get("set-cookie") ?? "";
  assert(/HttpOnly/i.test(cookie) && /SameSite=lax/i.test(cookie), `cookie sem proteção: ${cookie.replace(/=[^;]+/, "=…")}`);
  for (const [s, email] of [[client, "contato@techsolutions.com"], [designer, "bruno@kreativeart.com"], [admin, "admin@kreativeart.com"]]) assert((await s.login(email)).status === 200, `login ${email}`);
  return "senha errada 401; cookie HttpOnly + SameSite=Lax";
});

await check("API-03", "cliente vê só os próprios dados", async () => {
  const { json } = await client.call("/api/state");
  const d = json.data;
  assert(json.me === "u-tech", "sessão errada");
  assert(d.orders.length > 0 && d.orders.every((o) => o.clientId === "u-tech"), "pedidos de outros clientes");
  assert(d.jobs.every((j) => j.clientId === "u-tech") && d.charges.every((c) => c.clientId === "u-tech"), "peças/cobranças de outros");
  assert(d.accounts.every((a) => a.role !== "client" || a.id === "u-tech"), "outros clientes visíveis");
  assert(!raw({ json }).includes("scrypt$"), "hash de senha exposto");
  return `${d.orders.length} pedidos, ${d.jobs.length} peças, nenhum dado de outro cliente, nenhum hash`;
});

await check("API-04", "designer não recebe senhas do cofre nem dados de clientes sem pedido", async () => {
  const { json } = await designer.call("/api/state");
  const d = json.data;
  assert(d.credentials.every((c) => c.secret === ""), "senha do cofre enviada ao designer");
  assert(d.orders.every((o) => o.designerId === "u-bruno" || o.status === "awaiting_designer"), "pedidos de outro designer");
  assert(!d.accounts.some((a) => a.id === "u-tech"), "cliente sem pedido com o designer visível");
  assert(d.accounts.filter((a) => a.role === "client").every((a) => !a.document && !a.email), "documento/e-mail de clientes expostos");
  return `${d.credentials.length} acessos sem senha; só clientes com pedido; sem CPF/CNPJ/e-mail`;
});

await check("API-05", "ações recusadas pelo perfil (o perfil vem da sessão)", async () => {
  const tries = [
    [client, "setAccountStatus", ["u-ana", "suspended"]],
    [client, "updateSettings", [{ commissionRate: 0 }]],
    [client, "saveCredential", ["u-fashion", { platform: "Instagram", login: "@x", secret: "1234", twoFactor: "", notes: "", shared: true }]],
    [client, "updateProfile", ["u-fashion", { name: "Invasor" }]],
    [designer, "approveJob", ["qualquer", { id: "u-tech", role: "client", name: "x" }, "ok"]],
    [designer, "payCharge", ["qualquer", { id: "u-admin", role: "admin", name: "x" }]],
    [designer, "saveService", [{ name: "Grátis", price: 1, deliveryDays: 1, revisions: 0, active: true, category: "Social media", deliverable: "Post de feed" }]],
  ];
  for (const [s, name, args] of tries) {
    const r = await command(s, name, args);
    assert(r.status === 422 && /não permitida|Ação exclusiva|confirmado automaticamente/i.test(r.json.error ?? ""), `${name} não foi recusada (${r.status} ${r.json.error})`);
  }
  const anon = await command(session(), "updateSettings", [{ commissionRate: 0 }]);
  assert(anon.status === 401, `sem login ${anon.status}`);
  const fake = await command(client, "constructor", []);
  assert(fake.status === 400, `ação inexistente ${fake.status}`);
  return `${tries.length} tentativas recusadas (422); sem login 401; ação inexistente 400`;
});

await check("API-06", "proteção CSRF e entrada inválida", async () => {
  const noOrigin = await fetch(BASE + "/api/command", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const evil = await fetch(BASE + "/api/command", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://site-malicioso.com" }, body: "{}" });
  const form = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...ORIGIN }, body: "email=a&password=b" });
  assert(noOrigin.status === 403 && evil.status === 403, `origem ${noOrigin.status}/${evil.status}`);
  assert(form.status === 401, `formulário ${form.status}`);
  return "sem origem 403; outro site 403; formulário (não JSON) não autentica";
});

await check("API-07", "cofre: revelar só com pedido ativo e fica registrado", async () => {
  const ana = session();
  await ana.login("ana@kreativeart.com");
  const cred = (await ana.call("/api/state")).json.data.credentials.find((c) => c.clientId === "u-tech");
  assert(cred, "Ana deveria ver o acesso da Tech Solutions");
  const ok = await ana.call("/api/credentials/reveal", { id: cred.id });
  assert(ok.status === 200 && ok.json.secret, `revelar ${ok.status}`);
  const denied = await designer.call("/api/credentials/reveal", { id: cred.id });
  assert(denied.status === 403 && !denied.json.secret, `outro designer ${denied.status}`);
  const logs = (await client.call("/api/state")).json.data.credentials.find((c) => c.id === cred.id).logs;
  assert(logs.some((l) => l.designerId === "u-ana"), "revelação não registrada");
  return "Ana (pedido ativo) revelou; Bruno recusado 403; cliente vê o registro";
});

await check("API-08", "arquivos: sem login e sem vínculo não baixa", async () => {
  const anon = await session().call("/api/files", { name: "x.png", size: 10, mime: "image/png" });
  const asClient = await client.call("/api/files", { name: "x.png", size: 10, mime: "image/png" });
  const bad = await designer.call("/api/files", { name: "virus.exe", size: 10, mime: "application/x-msdownload" });
  assert(anon.status === 403 && asClient.status === 403 && bad.status === 422, `envio ${anon.status}/${asClient.status}/${bad.status}`);
  const start = await designer.call("/api/files", { name: "teste.png", size: 4, mime: "image/png" });
  assert(start.status === 200, `início ${start.status}`);
  const put = (s, body) => fetch(`${BASE}/api/files/${start.json.id}/0`, { method: "PUT", headers: { "Content-Type": "application/octet-stream", ...ORIGIN, ...(s ? { Cookie: s } : {}) }, body });
  assert((await put("", new Uint8Array(4))).status === 404, "parte sem login aceita");
  const wrongSize = await designer.call(`/api/files/${start.json.id}`);
  assert(wrongSize.status === 200, "dono não vê o próprio arquivo");
  const other = await client.call(`/api/files/${start.json.id}/0`);
  assert(other.status === 404, `cliente sem vínculo baixou (${other.status})`);
  return "visitante e cliente não enviam (403); .exe recusado (422); parte sem login 404; cliente sem vínculo 404";
});

const ok = results.filter(Boolean).length;
console.log(`\nResultado: ${ok}/${results.length} verificações aprovadas`);
process.exit(ok === results.length ? 0 : 1);
