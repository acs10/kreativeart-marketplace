# 3. API e segurança

**Ferramenta:** `tests/e2e/api-security.mjs` (requisições diretas, como faria um atacante, sem passar pelas telas)
**Execução:** 10/10/2026 — local (Firestore) e produção · **Resultado:** ✅ **8/8** nos dois
**Saída (produção):** [resultados/api-seguranca.txt](resultados/api-seguranca.txt)

| ID | Verificação | Resultado | ✔ |
| --- | --- | --- | --- |
| API-01 | Visitante sem login | Só catálogo (9 serviços, 3 planos) e perfil público de 3 designers — sem e-mail, telefone, PIX ou documento | ✅ |
| API-02 | Login | Senha errada → 401; certa → cookie **HttpOnly + SameSite=Lax** | ✅ |
| API-03 | Cliente | Só os próprios pedidos/peças/cobranças; nenhum outro cliente; nenhum hash de senha | ✅ |
| API-04 | Designer | Acessos do cofre **sem senha**; só clientes com pedido com ele; sem CPF/CNPJ e e-mail | ✅ |
| API-05 | Ações proibidas | 7 tentativas recusadas (422): cliente suspendendo designer, zerando comissão, gravando no cofre de outro, editando perfil de outro; designer aprovando peça, confirmando pagamento, criando serviço. Sem login → 401; ação inexistente (`constructor`) → 400 | ✅ |
| API-06 | CSRF | Sem `Origin` → 403; de outro site → 403; formulário comum (não JSON) não autentica | ✅ |
| API-07 | Cofre | Ana (pedido ativo) revela; Bruno (sem pedido) → 403; o cliente vê o registro da revelação | ✅ |
| API-08 | Arquivos | Visitante e cliente não enviam (403); `.exe` recusado (422); parte sem login → 404; cliente sem vínculo não baixa (404); dono vê o próprio arquivo | ✅ |

**Primeira execução em produção:** 7/8 — API-08 falhou (INC-08, consistência do Netlify Blobs). Depois da correção: 8/8.

## Conferências feitas direto no banco (Firestore)

| Verificação | Resultado |
| --- | --- |
| Senha do cofre gravada em texto? | **Não** — só o campo `secretEnc` (`v1:…`, AES-256-GCM) |
| Formato das senhas de login | `scrypt$sal$hash` |
| Pacote publicado contém algum valor secreto? | **0 arquivos** (conferido comparando com os valores reais, sem exibi-los) |
