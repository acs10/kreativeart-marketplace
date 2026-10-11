# 2. Testes ponta a ponta (navegador real)

**Ferramentas:** Puppeteer + Google Chrome · `tests/e2e/flows.mjs` (9 fluxos) e `tests/e2e/smoke.mjs` (30 páginas)
**Ambiente:** local (`next dev`, porta 3005) com o **Firestore real**, e também em produção — ver [04-producao.md](04-producao.md)
**Execução:** 10/10/2026 · **Resultado:** ✅ **9/9 fluxos** · ✅ **30/30 páginas sem erro**

Os fluxos usam um único navegador e trocam de usuário como na vida real (sair → entrar com outra conta). Arquivos de teste em `tests/e2e/fixtures` (PNG, PSD com miniatura e CDR do CorelDRAW).

| ID | Fluxo | O que é verificado | ✔ |
| --- | --- | --- | --- |
| F-01 | Contratar exige conta | Sem login, a contratação pede cadastro e volta para o plano | ✅ |
| F-02 | Cadastro de cliente | Validação dos campos; conta criada **no servidor** e já logada | ✅ |
| F-03 | Contratar plano com briefing | Pedido KA-2026-0008 "aguardando designer" (mesmo número na tela e no banco) | ✅ |
| F-04 | Aceitar pedido | Designer em análise (Carla) não aceita; Diego aceita; mostra R$ 531,00 (90% de R$ 590) | ✅ |
| F-05 | Pagar | Divisão 90/10 exibida; "Pagar com PIX" (modo demonstração) → pedido em andamento | ✅ |
| F-06 | Enviar versão | Prévia PNG + PSD + CDR enviados ao servidor; miniaturas do PSD e do CDR geradas | ✅ |
| F-07 | Ajuste e aprovação | Cliente vê a prévia (baixada do servidor), pede ajuste; v2; aprova | ✅ |
| F-08 | Cofre e entrega | Designer revela o acesso (registrado e visível ao cliente) e confirma a publicação | ✅ |
| F-09 | Gestão | KreativeArt aprova a designer em análise e vê a comissão de R$ 59,00 no financeiro | ✅ |

## Histórico das execuções

| Execução | Resultado | O que aconteceu |
| --- | --- | --- |
| 1ª (servidor ligado) | 2/9 | INC-01 (Proxy e MobX) |
| 2ª | 3/9 | INC-02 (número do pedido) |
| 3ª | 6/9 | INC-03 (prévia sumia no envio em paralelo) |
| 4ª | 9/9 ✅ | — (banco local) |
| 5ª (Firestore real) | 9/9 ✅ | — |
| 6ª (pagamento em modo demonstração) | 8/9 | INC-10 (pagamento confirmado antes de gravar) |
| 7ª | 9/9 ✅ | — |

## Páginas (teste de fumaça)

`smoke.mjs` entra com cada perfil e abre todas as páginas, reprovando qualquer erro no console da página: **30/30** (site, cliente, designer e KreativeArt).

**Saídas:** [resultados/fluxos-producao.txt](resultados/fluxos-producao.txt) (execução em produção).
