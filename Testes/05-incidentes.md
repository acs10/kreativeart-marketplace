# 5. Incidentes encontrados

Problemas reais encontrados ao ligar o banco de dados, o pagamento e a publicação (10/10/2026). Todos estão **resolvidos** ou contornados.

## INC-01 — Telas travaram ao ligar a sincronização · Gravidade: alta

| | |
| --- | --- |
| **Sintoma** | 7 dos 9 fluxos falharam; erro na página: *"'get' on proxy: property 'placeOrder' is a read-only and non-configurable data property"*. |
| **Causa** | O Proxy que envia as ações ao servidor tinha como alvo a própria instância do MobX, que trava os métodos (não configuráveis). Pela regra dos Proxies do JavaScript, ele não pode devolver uma função diferente para essas propriedades. |
| **Correção** | O alvo do Proxy passou a ser um objeto vazio com o mesmo protótipo; tudo é lido da instância real. |
| **Resultado** | Fluxos voltaram a abrir ✅ |

## INC-02 — Número do pedido diferente na tela e no banco · Gravidade: média

| | |
| --- | --- |
| **Sintoma** | O cliente via o pedido **KA-2026-0001**, mas o designer via **KA-2026-0008** (F-04 não achava o pedido). |
| **Causa** | A visão enviada a clientes e designers zerava o contador de pedidos; a tela numerava a partir de 0. |
| **Correção** | O contador real (não é dado sensível) vai para todos os perfis. |
| **Resultado** | F-03/F-04 ✅ |

## INC-03 — Prévia sumia ao enviar arquivos finais junto · Gravidade: alta

| | |
| --- | --- |
| **Sintoma** | F-06: "Enviar para aprovação" não fazia nada; a prévia PNG tinha sumido da lista. |
| **Investigação** | Os 5 envios chegaram ao servidor; nenhuma ação `submitVersion` foi enviada — a regra local recusou por falta de prévia. |
| **Causa** | Com o envio real (mais lento que o armazenamento do navegador), a prévia e os arquivos finais sobem ao mesmo tempo; o segundo envio gravava a lista "velha", sem a prévia. Bug latente que o protótipo escondia. |
| **Correção** | O componente de envio passou a usar atualização funcional (`onChange(atual => [...atual, ...novos])`). |
| **Resultado** | F-06 e F-07 ✅ |

## INC-04 — Netlify recusou a publicação ("Forbidden") · Gravidade: alta (operacional)

| | |
| --- | --- |
| **Sintoma** | `netlify deploy --prod` terminava em `JSONHTTPError: Forbidden`, antes do build. |
| **Investigação** | A chamada que falha é a criação da versão de produção; criar uma versão **rascunho** funcionava. O responsável confirmou que os créditos do plano gratuito do Netlify tinham acabado. |
| **Correção** | Publicar como rascunho e **promover** essa versão para o endereço principal (`restoreSiteDeploy`). Automatizado em `npm run deploy`. |
| **Resultado** | Site no ar em https://kreativeart.netlify.app ✅ |

## INC-05 — Build falhou no Windows (EPERM) · Gravidade: média

| | |
| --- | --- |
| **Sintoma** | `EPERM: operation not permitted, symlink … firebase-admin` no adaptador do Netlify. |
| **Causa** | O build padrão do Next.js 16 cria links simbólicos, que o Windows bloqueia sem permissão de administrador (mesmo problema do SuperCell). |
| **Correção** | `next build --webpack`. |
| **Resultado** | Build ✅ |

## INC-06 — Arquivos locais com chaves empacotados no servidor · Gravidade: alta (segurança)

| | |
| --- | --- |
| **Sintoma** | Na conferência do pacote publicado, `.env.local` (chaves de sessão e do cofre) e `.data/` (dados de teste) estavam dentro do código da função do servidor. A chave do Firebase **não** estava (exclusão já configurada). |
| **Impacto** | Nenhuma exposição pública: o código do servidor não é baixável; as chaves eram as mesmas já cadastradas no Netlify. |
| **Causa** | O adaptador do Next.js no Netlify copia arquivos `.env*` e o que o rastreamento de arquivos encontra; a exclusão do `next.config` não cobria esses casos. |
| **Correção** | `npm run deploy` tira esses arquivos da pasta durante o build e os devolve no fim. Conferido por script: **0 arquivos** do pacote com algum valor secreto. |
| **Resultado** | PRD-04 ✅ · recomendação: apagar no painel do Netlify as duas versões antigas do histórico |

## INC-07 — Erro de página no cofre em produção (React #418) · Gravidade: média

| | |
| --- | --- |
| **Sintoma** | `/cliente/acessos` dava erro de hidratação só no site publicado. |
| **Causa** | O servidor do Netlify roda em **UTC** e o navegador em Brasília: a data/hora dos acessos revelados saía diferente no HTML do servidor e na tela. |
| **Correção** | Todas as datas formatadas com `timeZone: "America/Sao_Paulo"`; "hoje" calculado no fuso de Brasília (no servidor, a data viraria às 21h). |
| **Resultado** | 30/30 páginas sem erro em produção ✅ |

## INC-08 — Envio de arquivo falhava em produção · Gravidade: alta

| | |
| --- | --- |
| **Sintoma** | API-08: o envio começava, mas a primeira parte respondia "Envio não encontrado". Localmente funcionava. |
| **Causa** | O Netlify Blobs, por padrão, tem consistência **eventual**: o registro recém-gravado ainda não aparecia na leitura seguinte. |
| **Correção** | Loja de arquivos com `consistency: "strong"`. |
| **Resultado** | API-08 ✅ · F-06 em produção ✅ |

## INC-09 — Páginas geradas como estáticas no build · Gravidade: baixa

| | |
| --- | --- |
| **Sintoma** | Avisos "couldn't be rendered statically because it used `cookies`" durante o build. |
| **Causa** | A leitura da sessão estava dentro de um `try/catch` que engolia o sinal do Next.js; as páginas eram geradas no build sem os dados do visitante (o navegador buscava depois, então funcionava, mas com atraso). |
| **Correção** | A sessão é lida fora do `try` → páginas renderizadas a cada visita, já com os dados. |

## INC-10 — Pagamento podia se perder ao recarregar a página · Gravidade: média

| | |
| --- | --- |
| **Sintoma** | F-05: o aviso "Pagamento confirmado" aparecia, mas, recarregando a página logo em seguida, o pedido não estava ativo. |
| **Causa** | A tela confirmava antes de o servidor gravar; recarregar cancelava o envio. |
| **Correção** | A tela de pagamento espera o servidor gravar (`flush`) antes de mostrar "confirmado"; e o navegador pergunta "Sair do site?" se houver alteração ainda indo para o servidor. O teste automático passou a aceitar essa pergunta (sem isso, ele travava). |
| **Resultado** | F-05 ✅ local e em produção |

## INC-11 — Validação da conta no Mercado Pago bloqueada · Gravidade: — (externo)

| | |
| --- | --- |
| **Sintoma** | Ao criar a aplicação no Mercado Pago, a verificação de identidade atingiu o limite de tentativas (bloqueio de 24 h). |
| **Decisão do responsável** | Projeto de portfólio: integração **pronta e oculta**; o site usa o modo demonstração, que aprova o pagamento automaticamente. Ativação documentada em [Documents/06](../Documents/06-pagamentos-mercado-pago.md#64-como-ativar-o-pagamento-real). |

## INC-12 — Arquivos acima de ~60 KB não subiam em produção · Gravidade: alta

| | |
| --- | --- |
| **Sintoma** | Em produção, F-06 não conseguia enviar a prévia PNG (152 KB): o envio ficava parado, sem aviso. Arquivos pequenos (PSD de 2 KB, CDR de 21 KB) passavam. |
| **Investigação** | O servidor recebeu 5 inícios de envio e só 4 partes. Medindo direto: 20 KB → 0,6 s; 60 KB → 5,5 s; 152 KB e 1 MB → expirava após ~26 s (503). Localmente funcionava (lá os arquivos vão para uma pasta, não para o Netlify Blobs). |
| **Causa** | O adaptador de rede usado com o Netlify Blobs (`nodeFetch`) enviava o arquivo sem o cabeçalho `Content-Length`; o corpo ia "em pedaços" (chunked), e o armazenamento ficava lento até expirar. |
| **Correção** | `nodeFetch` informa o tamanho do corpo. Depois: 152 KB → 0,6 s; 1 MB → 0,8 s; 4 MB (parte máxima) → 1,5 s, todos voltando íntegros. |
| **Observação** | O site do **Daniel da Pedra Encantada** usa o mesmo adaptador — o envio de fotos pelo painel publicado provavelmente tem o mesmo problema (lá o teste em produção, PRD-08, tinha ficado pendente). |
| **Resultado** | F-06 em produção ✅ |

## INC-13 — Miniatura vazia pedia arquivo sem id · Gravidade: baixa

| | |
| --- | --- |
| **Sintoma** | Erro 405 no console: `GET /api/files/` (sem id). |
| **Causa** | Cartões sem prévia usam um arquivo "vazio" de reserva, e a tela tentava baixá-lo. |
| **Correção** | A tela não busca arquivo quando não há id. |

## INC-14 — Alteração feita logo antes de "Sair" podia se perder · Gravidade: média

| | |
| --- | --- |
| **Sintoma** | F-08 em produção: o cliente salvou um acesso no cofre e saiu em seguida; o designer não encontrava a senha. |
| **Causa** | O pedido de saída podia chegar ao servidor antes do salvamento ainda em andamento; sem sessão, o salvamento era recusado (401). Localmente não aparecia (servidor rápido). |
| **Correção** | "Sair" espera o servidor gravar todas as ações pendentes (`flush`) antes de encerrar a sessão. O teste também passou a esperar a resposta de "Revelar senha", que consulta o servidor. |
| **Resultado** | F-08 em produção ✅ |
