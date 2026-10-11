# 7. Publicação e operação

## 7.1 Onde está

| Item | Valor |
| --- | --- |
| Site | https://kreativeart.netlify.app (Netlify, site `kreativeart`, equipe `andre-append`) |
| Banco | Firebase `kreativeart-e91a9` · Firestore em `southamerica-east1` (São Paulo), modo produção, plano Spark |
| Arquivos | Netlify Blobs, loja `kreativeart-files` |
| Proteção "Netlify login" | **Desligada** neste site (autorizado pelo responsável em 10/10/2026), para o portfólio ser público |

## 7.2 Variáveis de ambiente (Netlify)

| Variável | Para quê | De onde vem |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Acesso do servidor ao Firestore | `firebase-service-account.json` |
| `SESSION_SECRET` | Assinar o cookie de login | `.env.local` (criado pelo `npm run db:setup`) |
| `VAULT_KEY` | Cifrar as senhas do cofre | `.env.local` — **precisa ser a mesma** do banco, senão as senhas salvas ficam ilegíveis |
| `MP_ACCESS_TOKEN`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET`, `MP_TEST_MODE` | Pagamento real (opcional) | Mercado Pago — ver [Pagamentos](06-pagamentos-mercado-pago.md) |

As variáveis foram enviadas pelo terminal sem exibir os valores (`env:import` de um arquivo temporário, apagado em seguida; conferência só dos nomes com `env:list --json`).

## 7.3 Publicar uma nova versão

Na pasta do projeto, com o site local **parado**:

```bash
npm run deploy
```

O script `scripts/deploy.mjs`:

1. Tira da pasta, durante o build, `.env.local`, `.env.development.local`, `.data/` e `firebase-service-account.json` (o adaptador do Next.js no Netlify copiaria esses arquivos para o código do servidor — INC-06).
2. Faz o build (`next build --webpack`, por causa do erro de links simbólicos do Windows — INC-05) e cria uma versão **rascunho**.
3. **Promove** o rascunho para o endereço principal. Isso funciona mesmo quando o Netlify recusa `deploy --prod` (INC-04, créditos do plano gratuito).
4. Devolve os arquivos à pasta, mesmo se algo falhar.

**Se o Netlify bloquear também o rascunho:** aguarde a renovação dos créditos (próximo período: 09/11/2026) ou adicione créditos no painel do Netlify. Para fazer à mão os mesmos passos do script:

1. Pare o site local e tire temporariamente da pasta `.env.local`, `.env.development.local`, `.data/` e `firebase-service-account.json`.
2. Rode `npx netlify-cli deploy` (cria o rascunho e mostra o "Draft URL").
3. No painel do Netlify: site **kreativeart** → **Deploys** → abra o rascunho → **Publish deploy**.
4. Devolva os arquivos à pasta.

## 7.4 Rodar no computador

```bash
npm install
npm run dev
```

Sem `firebase-service-account.json`, o servidor usa um banco local em `.data/marketplace.json` (criado com os dados demonstrativos). Para forçar: `DATA_STORE=file` ou `DATA_STORE=firestore`.

## 7.5 Restaurar os dados demonstrativos

- Pelo painel: **KreativeArt → Restaurar demonstração** (apaga tudo e recria).
- Pelo terminal: `npm run db:setup` (≈ 150 gravações; não repetir muitas vezes no plano gratuito).

## 7.6 Documentação no site

Link secreto: `/documents/<código>` (código em `src/modules/docs/docs-access.ts`; quem não tem o código recebe 404). Atualize com `npm run docs` e publique.
