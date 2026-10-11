# Documentação de engenharia — KreativeArt

| # | Documento | Conteúdo |
| --- | --- | --- |
| 1 | [Visão geral](01-visao-geral.md) | O negócio, perfis, funcionalidades, tecnologias, situação |
| 2 | [Fluxos e casos de uso](02-fluxos-e-casos-de-uso.md) | Pedido, cobrança, produção das peças, cofre, casos de uso UC01–UC14 |
| 3 | [Arquitetura e classes](03-arquitetura-e-classes.md) | Camadas, como a tela conversa com o servidor, classes, decisões |
| 4 | [Modelo de dados](04-modelo-de-dados.md) | Entidades, coleções do Firestore, arquivos, cota gratuita |
| 5 | [Segurança](05-seguranca.md) | Login, o que cada perfil vê, cofre cifrado, CSRF, arquivos, pendências |
| 6 | [Pagamentos (Mercado Pago)](06-pagamentos-mercado-pago.md) | PIX, divisão automática, repasse, modo demonstração, como ativar |
| 7 | [Publicação e operação](07-publicacao-e-operacao.md) | Netlify, Firebase, variáveis, `npm run deploy`, restaurar dados |

Os testes estão documentados na pasta [`../Testes`](../Testes/README.md).

> Site publicado: **https://kreativeart.netlify.app** · projeto Firebase: `kreativeart-e91a9` (plano gratuito Spark).

## Como visualizar os diagramas

Os diagramas estão em **Mermaid** (diagrama como código, dentro do Markdown):

- **Mais fácil:** abra o arquivo [`visualizar.html`](visualizar.html) no navegador. Ele mostra todos os documentos com os diagramas desenhados. Precisa de internet para carregar o desenhador.
- No **GitHub**, os diagramas aparecem automaticamente.
- No **VS Code**, instale a extensão *Markdown Preview Mermaid Support*.

Para atualizar o `visualizar.html` depois de editar algum `.md`, rode `npm run docs` na pasta do projeto.
