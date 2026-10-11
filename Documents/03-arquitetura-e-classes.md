# 3. Arquitetura e classes

## 3.1 Camadas

Organização **modular por funcionalidade**: **`app` → `modules` → `core`**. Toda regra de negócio fica num único lugar (`MarketplaceStore`) e é **a mesma** no navegador e no servidor.

```mermaid
flowchart TB
    subgraph APP["app/ — páginas e rotas"]
        P1["páginas: site, /cliente, /designer, /admin"]
        P2["/api/state · /api/command · /api/auth/*"]
        P3["/api/files · /api/credentials/reveal · /api/admin/reset"]
        P4["/api/payments/* · /api/mp/* · /api/webhooks/mercadopago"]
        P5["/documents/[código]"]
    end
    subgraph MOD["modules/"]
        M1["platform<br/>MarketplaceStore (regras) · PlatformStore (sincroniza)<br/>access/views · access/commands"]
        M2["server<br/>Firestore · sessão · segredos · arquivos · Mercado Pago"]
        M3["áreas e telas<br/>site · client · designer · admin"]
        M4["domínio<br/>accounts · orders · jobs · billing · catalog · vault"]
        M5["files · insights · notifications · docs"]
    end
    subgraph CORE["core/"]
        C1[lib: format, ids] & C2[ui: componentes] & C3[theme] & C4[state: MobX]
    end
    FS[(Firestore)]
    BL[(Netlify Blobs)]
    MPX[(Mercado Pago)]
    APP --> MOD --> CORE
    M2 --> FS & BL & MPX
```

## 3.2 Como a tela conversa com o servidor

As telas chamam os métodos do `MarketplaceStore` normalmente (resposta instantânea). Um **Proxy** no `PlatformStore` percebe cada ação que deu certo e a envia ao servidor com os **mesmos argumentos e os mesmos ids** gerados no navegador. O servidor repete a ação com as mesmas regras — mas com o **perfil da sessão**, nunca o que o navegador diz — e grava só o que mudou.

```mermaid
sequenceDiagram
    participant T as Tela
    participant PS as PlatformStore (Proxy)
    participant API as POST /api/command
    participant SV as marketplace-service
    participant FS as Firestore
    T->>PS: m.acceptOrder(id, actor)
    PS->>PS: executa a regra local (grava os ids gerados)
    PS-->>T: resultado na hora
    PS->>API: { name, args, ids }
    API->>API: perfil vem da sessão, access/commands confere permissão e limpa os campos
    API->>SV: mutate(regra)
    SV->>FS: lê versão (1 leitura)
    SV->>SV: aplica a regra + rotina diária e compara antes/depois
    SV->>FS: transação: grava só os documentos alterados + versão+1
    API-->>PS: dados que esse perfil pode ver
    PS->>T: atualiza a tela (ou desfaz, se o servidor recusou)
```

**Concorrência:** a transação confere a versão dos dados; se outro usuário gravou antes, a ação é refeita sobre os dados novos (até 4 tentativas).

**Cache:** cada instância do servidor guarda os dados em memória e só relê tudo quando a versão muda — normalmente **1 leitura por requisição**.

## 3.3 Classes principais

```mermaid
classDiagram
    class MarketplaceStore {
        accounts, services, plans, orders
        jobs, charges, credentials, settings
        placeOrder() acceptOrder() assignDesigner()
        payCharge() confirmPayment() markPayoutDone()
        moveJob() submitVersion() approveJob() requestChanges() markDelivered()
        saveCredential() revealCredential()
        tick()
    }
    class PlatformStore {
        market (Proxy)
        auth: AuthStore
        payments, pending, syncError
        refresh() flush() startPix() syncPix() resetDemo()
    }
    class AuthStore {
        accountId
        login() signup() logout()
        validateSignup()
    }
    class views {
        viewFor(data, actor)
    }
    class commands {
        COMMANDS
        runCommand(m, actor, name, args, ctx)
    }
    class marketplaceService {
        readData() mutate() resetToDemo() diff()
    }
    class Backend {
        <<interface>>
        readVersion() loadAll() commit()
        replaceAll() getPrivate() setPrivate()
    }
    class FirestoreBackend
    class FileBackend
    class paymentService {
        startPix() syncCharge() syncByPaymentId()
        saveSellerToken()
    }
    PlatformStore --> MarketplaceStore
    PlatformStore --> AuthStore
    commands --> MarketplaceStore
    marketplaceService --> MarketplaceStore
    marketplaceService --> Backend
    Backend <|.. FirestoreBackend
    Backend <|.. FileBackend
    paymentService --> marketplaceService
```

## 3.4 Decisões

| Decisão | Por quê |
| --- | --- |
| Regras num só lugar, repetidas no servidor | As telas já existiam com regras completas; o servidor reaproveita o mesmo código, sem duplicar lógica |
| Ids gerados no navegador e repetidos no servidor | Tela e banco ficam com os mesmos registros (ex.: abrir o pedido recém-criado). O servidor só aceita ids novos e no formato certo |
| Firestore só pelo servidor (regras do banco: tudo bloqueado) | Nenhuma chave do Firebase vai para o navegador; o servidor decide o que cada perfil vê |
| Um documento por registro + documento de versão | Grava só o que mudou (economiza a cota gratuita) e evita sobrescrever alterações de outros usuários |
| Arquivos no Netlify Blobs, em partes de 4 MB | Firebase Storage exige plano pago; funções do Netlify aceitam até 6 MB por requisição |
| Banco local em arquivo (`.data/`) quando não há credencial | Desenvolver e testar sem gastar a cota do Firebase |
| Mercado Pago desligado sem credencial | O código vai para produção pronto e "oculto"; liga ao configurar as variáveis |
| Datas no fuso de Brasília | O servidor do Netlify roda em UTC; sem isso, servidor e navegador mostravam horários diferentes (INC-07) |
