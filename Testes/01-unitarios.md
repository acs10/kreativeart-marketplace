# 1. Testes unitários

**Ferramenta:** Vitest · **Arquivos:** `tests/unit/marketplace.test.ts`, `tests/unit/access.test.ts`
**Execução:** 10/10/2026 · **Resultado:** ✅ **27/27**
**Saída completa:** [resultados/unitarios-vitest.txt](resultados/unitarios-vitest.txt)

| ID | Grupo | O que é verificado | Casos | ✔ |
| --- | --- | --- | --- | --- |
| UT-01 | Comissão e cobranças | 10% para a KreativeArt; situações em aberto, em atraso e pago | 2 | ✅ |
| UT-02 | Cronograma | Peças espalhadas no mês respeitando o prazo; prazo do avulso; vencimento; atraso e pontualidade | 4 | ✅ |
| UT-03 | Fluxo completo | Contratar → aceitar → pagar → produzir → ajuste → aprovar → entregar → concluir; cancelamento; fidelidade do plano | 3 | ✅ |
| UT-04 | Dados demonstrativos | Cenários (oportunidades, pagamento, atraso, pausa); desempenho dos designers; cofre | 3 | ✅ |
| UT-05 | O que cada perfil recebe | Visitante, cliente, designer e KreativeArt: dados certos, sem hash e sem senha do cofre | 4 | ✅ |
| UT-06 | Ações no servidor | Recusa fora do perfil; perfil da sessão (não o do navegador); limpeza de campos e link https; ids repetidos do navegador | 4 | ✅ |
| UT-07 | Gravação e segredos | Grava só o que mudou; senha do cofre cifrada e recuperável; scrypt com sal aleatório | 3 | ✅ |
| UT-08 | PIX e repasse | Com Mercado Pago ligado só o retorno confirma; aprovação ativa o pedido sem duplicar; repasse manual só pela KreativeArt e uma vez; split já repassado | 4 | ✅ |
