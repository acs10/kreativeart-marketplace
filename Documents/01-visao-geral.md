# 1. Visão geral

## 1.1 O negócio

A **KreativeArt** é um **marketplace de design sob demanda**. Empresas contratam peças de design (posts, Reels, logos, identidade visual, impressos) e designers selecionados pela KreativeArt produzem, com aprovação de cada peça pelo cliente.

| Quem | O que faz |
| --- | --- |
| **Cliente** (empresa/marca) | Cria a conta, contrata um **serviço avulso** ou um **plano mensal**, envia o briefing, paga por **PIX**, aprova ou pede ajustes em cada peça e guarda no **cofre** os acessos das redes sociais para o designer publicar |
| **Designer** | Cadastra-se com portfólio e **chave PIX**, é aprovado pela KreativeArt, aceita pedidos na vitrine de oportunidades, produz no quadro (kanban), envia versões (PNG, PSD, CDR, AI, MP4…) e confirma a entrega/publicação |
| **KreativeArt** (admin) | Aprova designers, define catálogo, planos e comissão, acompanha pedidos, entregas, financeiro e indicadores (BI), transfere pedidos e faz o repasse quando não há divisão automática |

**Modelo de receita:** comissão de **10%** (configurável) sobre cada pagamento. O cliente paga por PIX; a parte do designer (90%) chega a ele pela divisão automática do Mercado Pago ou pelo repasse da KreativeArt — ver [Pagamentos](06-pagamentos-mercado-pago.md).

## 1.2 O que compõe o sistema

| Área | Páginas |
| --- | --- |
| Site público | Início, Serviços, Planos, Designers, Contratar, Entrar, Cadastro de cliente e de designer |
| Área do cliente | Visão geral, Pedidos, Aprovações, Calendário, Financeiro, Acessos (cofre), Perfil e marca |
| Área do designer | Visão geral, Oportunidades, Quadro de produção, Calendário, Ganhos, Perfil e PIX (com "Conectar Mercado Pago") |
| Gestão KreativeArt | Painel (BI), Pedidos, Entregas, Designers, Clientes, Financeiro (com repasses), Catálogo, Configurações, Inteligência |

São **30 páginas**, todas verificadas no teste de fumaça.

## 1.3 Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Interface | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · MobX (estado) · lucide (ícones) · sonner (avisos) |
| Servidor | Rotas de API do Next.js (funções do Netlify) |
| Banco de dados | **Firebase Firestore** (plano gratuito Spark), acessado só pelo servidor (Admin SDK) |
| Arquivos das entregas | **Netlify Blobs** (o Firebase Storage exige plano pago) |
| Pagamentos | **Mercado Pago** — PIX (Checkout Transparente) + divisão automática (split/OAuth) — pronto, em modo demonstração |
| Miniaturas de PSD/CDR | ag-psd e fflate, no navegador |
| Testes | Vitest (unitários) · Puppeteer + Chrome (ponta a ponta, API, produção) |
| Hospedagem | Netlify (site `kreativeart`) |

## 1.4 Situação (10/10/2026)

| Item | Situação |
| --- | --- |
| Interface completa (3 perfis, 30 páginas) | ✅ |
| Banco de dados real (Firestore), login no servidor, dados por perfil | ✅ |
| Arquivos das entregas no Netlify Blobs (até 60 MB, em partes de 4 MB) | ✅ |
| Cofre de acessos com senhas cifradas (AES-256-GCM) | ✅ |
| Publicado em https://kreativeart.netlify.app | ✅ |
| Pagamento PIX real (Mercado Pago) | ⏸ **pronto e oculto** — o site usa o modo demonstração (aprova automaticamente) até as credenciais do Mercado Pago serem configuradas |
| Dados da empresa (CNPJ, PIX da KreativeArt) | Fictícios até o responsável informar os reais |

> **Projeto pausado** (10/10/2026) por decisão do responsável: é um projeto de portfólio, e a ativação do pagamento real depende da validação da conta no Mercado Pago. O passo a passo para ativar está em [Pagamentos](06-pagamentos-mercado-pago.md#64-como-ativar-o-pagamento-real).

## 1.5 Acesso de demonstração

Na tela **Entrar** há botões de acesso rápido (senha `demo123`): Cliente (Tech Solutions), Designer (Ana) e KreativeArt. Outras contas: bruno@, diego@ e carla@kreativeart.com (Carla está em análise); clientes comercial@fashionstore.com e contato@cafearoma.com.
