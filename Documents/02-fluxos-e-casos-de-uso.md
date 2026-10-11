# 2. Fluxos e casos de uso

## 2.1 Jornada completa

```mermaid
sequenceDiagram
    actor C as Cliente
    participant S as KreativeArt (sistema)
    actor D as Designer
    participant MP as Mercado Pago
    C->>S: Contrata serviço ou plano + briefing
    S-->>D: Pedido aparece em Oportunidades
    D->>S: Aceita o pedido
    S-->>C: Cobrança gerada (vence em 2 dias)
    C->>MP: Paga por PIX
    MP-->>S: Pagamento aprovado
    S-->>D: Peças criadas no cronograma (produção liberada)
    D->>S: Envia versão (prévia + arquivos finais)
    C->>S: Aprova ou pede ajustes
    D->>S: Publica/entrega e confirma
    S-->>S: Pedido concluído quando todas as peças são entregues
```

## 2.2 Situações do pedido

```mermaid
stateDiagram-v2
    [*] --> AguardandoDesigner: cliente contrata
    AguardandoDesigner --> AguardandoPagamento: designer aceita / KreativeArt atribui
    AguardandoPagamento --> EmAndamento: 1º pagamento aprovado
    EmAndamento --> Concluido: todas as peças entregues (e o plano terminou)
    AguardandoDesigner --> Cancelado: cliente ou KreativeArt
    AguardandoPagamento --> Cancelado: cliente ou KreativeArt
    EmAndamento --> Cancelado: só a KreativeArt
    Concluido --> [*]
    Cancelado --> [*]
```

**Planos mensais:** a rotina diária (roda a cada acesso ao servidor) gera a mensalidade e as peças de cada mês. Se a mensalidade atrasar além da tolerância (5 dias), as peças do mês ficam **pausadas** e o designer não é cobrado pelo prazo delas.

## 2.3 Produção de uma peça (quadro do designer)

```mermaid
stateDiagram-v2
    [*] --> AFazer
    AFazer --> EmProducao: designer começa
    EmProducao --> AguardandoAprovacao: envia versão (exige prévia)
    AguardandoAprovacao --> AjustesSolicitados: cliente pede ajuste
    AjustesSolicitados --> AguardandoAprovacao: nova versão
    AguardandoAprovacao --> Aprovada: cliente aprova
    Aprovada --> Entregue: designer publica/entrega
    Entregue --> [*]
```

Os arquivos finais (PSD, AI, CDR…) só ficam disponíveis para o cliente baixar **depois da aprovação**. Ajustes acima do incluído no serviço são marcados como "ajuste extra".

## 2.4 Pagamento por PIX

```mermaid
flowchart TD
    A[Cliente clica em Pagar] --> B{Mercado Pago configurado?}
    B -- não --> DEMO[Modo demonstração:<br/>gera → aguarda → aprova]
    B -- sim --> C{Designer conectou a conta MP?}
    C -- sim --> SPLIT[PIX com divisão automática<br/>90% designer · 10% KreativeArt]
    C -- não --> PLAT[PIX na conta da KreativeArt]
    SPLIT -- MP recusa split --> PLAT
    SPLIT & PLAT --> Q[QR Code + copia e cola]
    Q --> W[Tela consulta a cada 5 s<br/>+ webhook do Mercado Pago]
    W --> OK[Aprovado e valor confere:<br/>cobrança paga, pedido em andamento,<br/>peças liberadas]
    OK --> R{Como o designer recebe}
    R -- split --> R1[Repasse automático]
    R -- conta KreativeArt --> R2[Repasse pendente no painel<br/>→ KreativeArt faz o PIX e marca]
    DEMO --> OK2[Cobrança paga, pedido em andamento]
```

## 2.5 Casos de uso

| ID | Ator | Caso de uso | Regras principais |
| --- | --- | --- | --- |
| UC01 | Visitante | Criar conta de cliente | Nome, empresa, e-mail único, telefone com DDD, senha ≥ 8 |
| UC02 | Visitante | Cadastrar-se como designer | Especialidades, CPF/CNPJ, chave PIX; fica **em análise** |
| UC03 | Cliente | Contratar serviço avulso | Quantidade 1–30; briefing com objetivo ≥ 10 caracteres |
| UC04 | Cliente | Contratar plano mensal | Respeita a fidelidade mínima do plano |
| UC05 | Designer | Aceitar pedido | Só designer **aprovado** e com chave PIX; primeiro que aceita fica com o pedido |
| UC06 | Cliente | Pagar por PIX | Modo demonstração ou Mercado Pago (QR Code, confirmação automática) |
| UC07 | Designer | Produzir e enviar versão | Exige ao menos uma prévia; PSD/CDR ganham miniatura; até 60 MB por arquivo |
| UC08 | Cliente | Aprovar ou pedir ajuste | Ajuste exige explicação ≥ 5 caracteres |
| UC09 | Designer | Entregar/publicar | Só peças aprovadas |
| UC10 | Cliente | Guardar acessos no cofre | Pode pausar o compartilhamento a qualquer momento |
| UC11 | Designer | Revelar acesso do cliente | Só com pedido **ativo** com o cliente; cada revelação fica registrada para o cliente |
| UC12 | KreativeArt | Aprovar/suspender designer, transferir pedido | Designer com pedido em andamento não pode ser suspenso sem transferir |
| UC13 | KreativeArt | Registrar repasse ao designer | Só para pagamentos que caíram na conta da KreativeArt |
| UC14 | Designer | Conectar conta Mercado Pago | Autorização OAuth; token guardado cifrado só no servidor |
