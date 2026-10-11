# 4. Testes em produção

**Ambiente:** https://kreativeart.netlify.app (Netlify) + Firestore `kreativeart-e91a9`
**Ferramentas:** `tests/e2e/producao.mjs`, `api-security.mjs`, `smoke.mjs`, `flows.mjs` e `docs-check.mjs`, todos rodando de fora do Netlify
**Execução:** 10/10/2026, após a publicação · **Resultado:** ✅

## Verificações do site

**Saída:** [resultados/producao.txt](resultados/producao.txt)

| ID | Grupo | Verificação | ✔ |
| --- | --- | --- | --- |
| PRD-01 | Páginas | Início, serviços, planos, designers e login respondem 200; página inexistente 404 | ✅ |
| PRD-02 | Banco e pagamento | `/api/state` lê do **Firestore**; catálogo carregado; pagamento em **modo demonstração** | ✅ |
| PRD-03 | Cabeçalhos | CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS; sem `X-Powered-By` | ✅ |
| PRD-04 | Nada sensível exposto | Sem hash nem cofre na resposta pública; `.env.local`, chave do Firebase e `.data` → 404; webhook do Mercado Pago desligado (404) | ✅ |
| PRD-05 | Documentação | Link secreto 200 com `noindex` e CSP própria; código errado 404; CSP do site intacta; diagramas desenhados | ✅ |

## Demais testes, repetidos em produção

| Teste | Resultado | Saída |
| --- | --- | --- |
| API e segurança | ✅ 8/8 (1ª execução 7/8 — INC-08) | [api-seguranca.txt](resultados/api-seguranca.txt) |
| Páginas (30) | ✅ 30/30 (1ª execução 29/30 — INC-07) | [paginas-producao.txt](resultados/paginas-producao.txt) |
| Fluxos completos (9) | ✅ 9/9 (execuções anteriores travaram ou falharam — INC-10, INC-12 e INC-14) | [fluxos-producao.txt](resultados/fluxos-producao.txt) |

Depois dos fluxos em produção, os dados demonstrativos foram restaurados (`npm run db:setup`).

## Pendente (depende do responsável)

| Verificação | Por quê |
| --- | --- |
| PIX real do Mercado Pago em produção | Credenciais ainda não configuradas (INC-11) |
