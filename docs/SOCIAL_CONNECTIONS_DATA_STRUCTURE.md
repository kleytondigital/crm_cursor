# Estrutura de Dados - Conexões Instagram e Facebook

## 📋 Visão Geral

Este documento descreve como os dados das conexões com Instagram e Facebook são armazenados no CRM, permitindo ao n8n consultar e identificar corretamente o `tenantId` e `connectionId` ao receber mensagens.

---

## 🗄️ Tabela: `connections`

A tabela `connections` armazena todas as conexões (WhatsApp, Instagram, Facebook) do sistema.

### Estrutura da Tabela

```sql
CREATE TABLE connections (
  id           UUID PRIMARY KEY,
  tenantId     VARCHAR NOT NULL,  -- ID da empresa (isolamento multi-tenant)
  name         VARCHAR NOT NULL,  -- Nome da conexão (ex: "Instagram - Minha Página")
  sessionName  VARCHAR UNIQUE,    -- Identificador único da sessão
  provider     VARCHAR NOT NULL,  -- 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK'
  status       VARCHAR NOT NULL,  -- 'PENDING' | 'ACTIVE' | 'STOPPED' | 'ERROR'
  webhookUrl   VARCHAR,           -- URL do webhook (para WhatsApp)
  metadata     JSONB,             -- Dados específicos da conexão social (ver abaixo)
  refreshToken VARCHAR,           -- Token para renovação OAuth (Meta)
  isActive     BOOLEAN DEFAULT true,
  createdAt    TIMESTAMP DEFAULT NOW(),
  updatedAt    TIMESTAMP DEFAULT NOW()
);
```

### Índices

```sql
CREATE INDEX connections_tenantId_idx ON connections(tenantId);
CREATE INDEX connections_tenantId_status_idx ON connections(tenantId, status);
CREATE INDEX connections_tenantId_provider_idx ON connections(tenantId, provider);
CREATE INDEX connections_tenantId_provider_status_idx ON connections(tenantId, provider, status);
```

---

## 📦 Campo `metadata` (JSONB)

O campo `metadata` armazena dados específicos das conexões sociais (Instagram/Facebook) no formato JSON.

### Estrutura do `metadata` (SocialConnectionMetadata)

```typescript
interface SocialConnectionMetadata {
  // Identificadores Meta
  pageId?: string;                    // ID da página Facebook (usado também no Instagram)
  instagramBusinessId?: string;       // ID da conta Instagram Business (apenas Instagram)
  
  // Tokens e Autenticação
  accessToken?: string;               // Token de acesso da Meta Graph API
  tokenExpiresAt?: string;            // Data de expiração do token (ISO 8601)
  permissions?: string[];             // Lista de permissões concedidas (ex: ['pages_messaging', 'instagram_basic'])
  
  // Informações da Página/Conta
  pageName?: string;                  // Nome da página Facebook
  instagramUsername?: string;         // Username da conta Instagram
  pageCategory?: string;              // Categoria da página
  
  // Campos adicionais
  [key: string]: any;                 // Permite campos customizados
}
```

### Exemplo de `metadata` (Instagram)

```json
{
  "pageId": "123456789",
  "instagramBusinessId": "17841405309211844",
  "accessToken": "EAAxxxxxxxxxxxxx",
  "tokenExpiresAt": "2025-12-28T10:00:00.000Z",
  "permissions": [
    "pages_show_list",
    "pages_messaging",
    "instagram_basic",
    "instagram_manage_messages",
    "pages_read_engagement"
  ],
  "pageName": "Minha Página",
  "instagramUsername": "minha_empresa",
  "pageCategory": "Business"
}
```

### Exemplo de `metadata` (Facebook Messenger)

```json
{
  "pageId": "987654321",
  "accessToken": "EAAxxxxxxxxxxxxx",
  "tokenExpiresAt": "2025-12-28T10:00:00.000Z",
  "permissions": [
    "pages_show_list",
    "pages_messaging",
    "pages_read_engagement"
  ],
  "pageName": "Minha Página",
  "pageCategory": "Business"
}
```

---

## 🔑 Campo `refreshToken` (Separado)

O `refreshToken` é armazenado em um campo separado (não no metadata) para facilitar renovação:

```typescript
refreshToken: string | null  // Token para renovar accessToken quando expirar
```

---

## 🔍 Como o n8n Identifica a Conexão

### Problema

Quando o n8n recebe um webhook da Meta (Instagram/Facebook), ele recebe:
- `recipient.id`: ID da página (pageId) ou Instagram Business Account
- Mas não sabe qual é o `tenantId` e `connectionId` do CRM

### Solução: Endpoint de Lookup

O CRM fornece um endpoint público para consulta:

**Endpoint:** `GET /webhooks/social/connection/lookup`

**Query Parameters:**
- `provider` (obrigatório): `INSTAGRAM` ou `FACEBOOK`
- `pageId` (opcional): ID da página Facebook ou Instagram
- `instagramBusinessId` (opcional): ID da conta Instagram Business

**Exemplo de URL:**
```
GET /webhooks/social/connection/lookup?provider=INSTAGRAM&pageId=123456789&instagramBusinessId=17841405309211844
```

**Resposta (Sucesso):**
```json
{
  "found": true,
  "tenantId": "660e8400-e29b-41d4-a716-446655440001",
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "INSTAGRAM",
  "name": "Instagram - Minha Página",
  "pageId": "123456789",
  "instagramBusinessId": "17841405309211844",
  "pageName": "Minha Página",
  "instagramUsername": "minha_empresa"
}
```

**Resposta (Não Encontrado):**
```json
{
  "found": false,
  "message": "Conexão não encontrada"
}
```

---

## 🔄 Fluxo Completo de Identificação

### 1. Webhook da Meta → n8n

```json
{
  "object": "instagram",
  "entry": [{
    "id": "17841405309211844",
    "messaging": [{
      "sender": { "id": "17841405309211844" },
      "recipient": { "id": "123456789" },  // ← pageId ou instagramBusinessId
      "message": {
        "mid": "mid.ABC123XYZ",
        "text": "Olá!"
      }
    }]
  }]
}
```

### 2. n8n → CRM (Lookup)

```bash
POST /webhooks/social/connection/lookup
{
  "provider": "INSTAGRAM",
  "pageId": "123456789",
  "instagramBusinessId": "17841405309211844"
}
```

### 3. n8n → CRM (Enviar Mensagem)

```bash
POST /webhooks/social
{
  "tenantId": "660e8400-e29b-41d4-a716-446655440001",
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "INSTAGRAM",
  "message": { ... }
}
```

---

## 📊 Estrutura Completa de Armazenamento

### Tabela `connections`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único da conexão |
| `tenantId` | UUID | ID da empresa (multi-tenant) |
| `name` | String | Nome da conexão |
| `sessionName` | String | Identificador único (ex: `social_instagram_123456_1234567890`) |
| `provider` | Enum | `WHATSAPP`, `INSTAGRAM`, `FACEBOOK` |
| `status` | Enum | `PENDING`, `ACTIVE`, `STOPPED`, `ERROR` |
| `metadata` | JSONB | Dados da conexão social (ver estrutura abaixo) |
| `refreshToken` | String? | Token para renovação OAuth |
| `isActive` | Boolean | Se a conexão está ativa |
| `createdAt` | Timestamp | Data de criação |
| `updatedAt` | Timestamp | Data de atualização |

### Objeto `metadata` (dentro do JSONB)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `pageId` | String? | Sim (Facebook) | ID da página Facebook |
| `instagramBusinessId` | String? | Sim (Instagram) | ID da conta Instagram Business |
| `accessToken` | String? | Sim | Token de acesso da Meta Graph API |
| `tokenExpiresAt` | String? | Não | Data de expiração (ISO 8601) |
| `permissions` | String[]? | Não | Lista de permissões concedidas |
| `pageName` | String? | Não | Nome da página |
| `instagramUsername` | String? | Não | Username do Instagram |
| `pageCategory` | String? | Não | Categoria da página |

---

## 🔐 Isolamento Multi-Tenant

O isolamento é garantido através do campo `tenantId`:

1. Cada empresa (tenant) possui um `tenantId` único
2. Todas as conexões são vinculadas a um `tenantId`
3. Queries sempre filtram por `tenantId` para garantir isolamento
4. O endpoint de lookup retorna apenas conexões ativas do tenant correspondente

**Importante:** O endpoint de lookup não requer autenticação, mas retorna apenas informações básicas (sem tokens). Os tokens permanecem seguros no banco e são acessados apenas pelo backend internamente.

---

## 📝 Como os Dados São Salvos

### 1. Quando uma conexão é criada via OAuth

**Arquivo:** `src/modules/connections/connections.service.ts` → `handleOAuthCallback()`

```typescript
const metadata: SocialConnectionMetadata = {
  pageId: selectedPage.id,
  pageName: selectedPage.name,
  pageCategory: selectedPage.category,
  accessToken: selectedPage.access_token || longLivedToken.access_token,
  tokenExpiresAt: expirationDate?.toISOString(),
  permissions: tokenResponse.scope?.split(',') || [],
  instagramBusinessId: instagramBusinessAccount?.id,
  instagramUsername: instagramBusinessAccount?.username,
};

await prisma.connection.create({
  data: {
    tenantId,
    name: `${provider} - ${selectedPage.name}`,
    sessionName: `social_${provider.toLowerCase()}_${selectedPage.id}_${Date.now()}`,
    provider: providerType,
    status: ConnectionStatus.ACTIVE,
    metadata: metadata as any,
    refreshToken: tokenResponse.refresh_token || null,
    isActive: true,
  },
});
```

### 2. Quando uma conexão é atualizada

```typescript
await prisma.connection.update({
  where: { id: connection.id },
  data: {
    metadata: updatedMetadata as any,
    refreshToken: newRefreshToken,
  },
});
```

---

## 🔍 Queries de Busca

### Buscar por tenantId e provider

```typescript
await prisma.connection.findMany({
  where: {
    tenantId: '...',
    provider: ConnectionProvider.INSTAGRAM,
    isActive: true,
  },
});
```

### Buscar por pageId (no metadata)

```typescript
const connections = await prisma.connection.findMany({
  where: {
    provider: ConnectionProvider.INSTAGRAM,
    isActive: true,
  },
});

// Filtrar manualmente (Prisma não suporta busca direta em JSONB aninhado)
const found = connections.find((conn) => {
  const metadata = conn.metadata as SocialConnectionMetadata;
  return metadata?.pageId === '123456789';
});
```

### Buscar por instagramBusinessId (no metadata)

```typescript
const connections = await prisma.connection.findMany({
  where: {
    provider: ConnectionProvider.INSTAGRAM,
    isActive: true,
  },
});

const found = connections.find((conn) => {
  const metadata = conn.metadata as SocialConnectionMetadata;
  return metadata?.instagramBusinessId === '17841405309211844';
});
```

---

## 🔄 Sincronização com n8n

### Quando uma conexão é criada/atualizada

O CRM envia automaticamente a configuração para o n8n via webhook:

**Endpoint n8n:** `{N8N_API_URL}/webhook/social-connection-config`

**Payload enviado:**
```json
{
  "tenantId": "660e8400-e29b-41d4-a716-446655440001",
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "INSTAGRAM",
  "pageId": "123456789",
  "instagramBusinessId": "17841405309211844",
  "accessToken": "EAAxxxxxxxxxxxxx",
  "refreshToken": "...",
  "tokenExpiresAt": "2025-12-28T10:00:00.000Z",
  "webhookUrl": "https://backcrm.aoseudispor.com.br/webhooks/social",
  "metadata": {
    "pageName": "Minha Página",
    "instagramUsername": "minha_empresa",
    "pageCategory": "Business",
    "permissions": [...]
  },
  "oauthAppId": "1327549589037132",
  "graphAppId": "1327549589037132"
}
```

O n8n pode armazenar essa configuração internamente para não precisar consultar o CRM a cada mensagem.

---

## 🚀 Endpoint de Lookup (Nova Funcionalidade)

### Endpoint

```
GET /webhooks/social/connection/lookup
```

### Uso no n8n

1. **Receber webhook da Meta**
2. **Extrair identificadores:**
   ```javascript
   const recipientId = $json.entry[0].messaging[0].recipient.id;
   const provider = $json.object === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK';
   ```

3. **Consultar conexão no CRM:**
   ```javascript
   const lookupUrl = `https://backcrm.aoseudispor.com.br/webhooks/social/connection/lookup?provider=${provider}&pageId=${recipientId}`;
   if (provider === 'INSTAGRAM') {
     lookupUrl += `&instagramBusinessId=${recipientId}`;
   }
   
   const lookupResponse = await $http.get(lookupUrl);
   
   if (!lookupResponse.found) {
     throw new Error('Conexão não encontrada');
   }
   
   const { tenantId, connectionId } = lookupResponse;
   ```

4. **Enviar mensagem para CRM:**
   ```javascript
   await $http.post('https://backcrm.aoseudispor.com.br/webhooks/social', {
     tenantId: tenantId,
     connectionId: connectionId,
     provider: provider,
     message: { ... }
   });
   ```

---

## 🔒 Segurança

### Tokens Não Expostos

O endpoint de lookup **NÃO retorna tokens** (`accessToken`, `refreshToken`). Isso garante que:
- Tokens não sejam expostos em requisições públicas
- Apenas o backend interno acessa tokens
- O n8n precisa armazenar tokens recebidos durante a configuração inicial

### Validação de Assinatura

Todos os webhooks públicos suportam validação HMAC via header `x-n8n-signature` (opcional, se `WEBHOOK_SOCIAL_SECRET` estiver configurado).

---

## 📚 Referências

- [Prisma Schema - Connection Model](prisma/schema.prisma)
- [SocialConnectionMetadata Interface](src/modules/connections/types/social-connection-metadata.interface.ts)
- [ConnectionsService - handleOAuthCallback](src/modules/connections/connections.service.ts)
- [N8nSocialConfigService](src/modules/connections/services/n8n-social-config.service.ts)

---

## ✅ Checklist de Implementação

- [x] Estrutura de dados documentada
- [x] Endpoint de lookup implementado
- [x] Isolamento multi-tenant garantido
- [x] Tokens protegidos (não expostos no lookup)
- [x] Sincronização com n8n documentada
- [x] Queries de exemplo fornecidas

