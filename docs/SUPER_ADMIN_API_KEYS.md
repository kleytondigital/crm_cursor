# 🔑 API Keys de Super Admin - Documentação

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Tipos de API Keys](#tipos-de-api-keys)
3. [Endpoints](#endpoints)
4. [Permissões](#permissões)
5. [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

O sistema suporta **dois tipos de API Keys**:

1. **API Keys de Tenant** (tenant-specific)
   - Criadas por ADMIN/MANAGER
   - Limitadas ao tenant específico
   - `tenantId` não é null

2. **API Keys Globais** (Super Admin)
   - Criadas apenas por SUPER_ADMIN
   - Funcionam para **todos os tenants**
   - `tenantId` é null
   - Usadas para integrações globais (n8n, webhooks)

---

## Tipos de API Keys

### 🔹 API Key de Tenant

**Características:**
- ✅ Criada por ADMIN ou MANAGER
- ✅ Acessa apenas dados do tenant específico
- ✅ Ideal para integrações internas

**Exemplo de uso:**
- Integração do tenant com Zapier
- Webhooks específicos do tenant
- Automações internas

---

### 🔹 API Key Global (Super Admin)

**Características:**
- ✅ Criada apenas por SUPER_ADMIN
- ✅ Acessa dados de **todos os tenants**
- ✅ Sem restrição de tenant
- ⚠️ **ALTA SENSIBILIDADE** - usar com cuidado

**Exemplo de uso:**
- Integração com n8n (workflows que gerenciam múltiplos tenants)
- Monitoramento global do sistema
- Backups automatizados
- Analytics cross-tenant

---

## Endpoints

### 🔹 **1. Criar API Key**

#### API Key de Tenant (ADMIN/MANAGER)

```http
POST /api-keys
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "Integração Zapier",
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

#### API Key Global (SUPER_ADMIN)

```http
POST /api-keys
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "N8N Global Integration",
  "isGlobal": true,
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "N8N Global Integration",
  "key": "crm_a1b2c3d4e5f6...",
  "tenantId": null,
  "isGlobal": true,
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "warning": "Guarde esta chave em local seguro. Ela não poderá ser recuperada novamente."
}
```

⚠️ **IMPORTANTE**: A chave (`key`) só é exibida **uma vez** na criação. Guarde em local seguro!

---

### 🔹 **2. Listar API Keys**

```http
GET /api-keys
Authorization: Bearer {jwt_token}
```

**Response (SUPER_ADMIN):**
```json
[
  {
    "id": "uuid-1",
    "name": "N8N Global",
    "tenantId": null,
    "isGlobal": true,
    "isActive": true,
    "expiresAt": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  },
  {
    "id": "uuid-2",
    "name": "Tenant A - Zapier",
    "tenantId": "uuid-tenant-a",
    "isGlobal": false,
    "isActive": true,
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

**Response (ADMIN/MANAGER):**
```json
[
  {
    "id": "uuid-2",
    "name": "Tenant A - Zapier",
    "tenantId": "uuid-tenant-a",
    "isGlobal": false,
    "isActive": true,
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 🔹 **3. Buscar API Key por ID**

```http
GET /api-keys/{id}
Authorization: Bearer {jwt_token}
```

---

### 🔹 **4. Remover API Key**

```http
DELETE /api-keys/{id}
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "message": "API Key removida com sucesso"
}
```

---

## Permissões

| Ação | USER | MANAGER | ADMIN | SUPER_ADMIN |
|------|------|---------|-------|-------------|
| Criar API Key (tenant) | ❌ | ✅ | ✅ | ✅ |
| Criar API Key (global) | ❌ | ❌ | ❌ | ✅ |
| Listar próprias keys | ❌ | ✅ | ✅ | ✅ (todas) |
| Remover próprias keys | ❌ | ✅ | ✅ | ✅ (todas) |

---

## Exemplos de Uso

### Exemplo 1: Criar API Key Global para N8N

```bash
# Login como Super Admin
POST /auth/login
{
  "email": "superadmin@exemplo.com",
  "password": "superadmin123"
}

# Criar API Key Global
POST /api-keys
Authorization: Bearer {jwt_token}
{
  "name": "N8N Workflows Manager",
  "isGlobal": true
}

# Response
{
  "key": "crm_a1b2c3d4e5f6789012345678901234567890",
  "isGlobal": true,
  "warning": "Guarde esta chave..."
}
```

---

### Exemplo 2: Usar API Key Global no N8N

**Node HTTP Request:**

```json
{
  "method": "PATCH",
  "url": "https://backcrm.aoseudispor.com.br/webhooks/n8n/leads/5511999999999@c.us/status",
  "headers": {
    "X-API-Key": "crm_a1b2c3d4e5f6789012345678901234567890",
    "Content-Type": "application/json"
  },
  "body": {
    "status": "EM_ATENDIMENTO"
  }
}
```

✅ **Funciona para leads de QUALQUER tenant!**

---

### Exemplo 3: Criar API Key de Tenant

```bash
# Login como Admin do Tenant A
POST /auth/login
{
  "email": "admin@tenanta.com",
  "password": "123456"
}

# Criar API Key
POST /api-keys
Authorization: Bearer {jwt_token}
{
  "name": "Integração Zapier",
  "expiresAt": "2026-12-31T23:59:59Z"
}

# Response
{
  "key": "crm_xyz123...",
  "tenantId": "uuid-tenant-a",
  "isGlobal": false
}
```

---

### Exemplo 4: Usar API Key de Tenant no Zapier

**Zapier HTTP Request:**

```
POST https://backcrm.aoseudispor.com.br/webhooks/n8n/leads/5511999999999@c.us/tags
Headers:
  X-API-Key: crm_xyz123...
  Content-Type: application/json
Body:
  {
    "tags": ["zapier-lead", "interessado"],
    "action": "add"
  }
```

✅ **Acessa apenas dados do Tenant A**

---

## Segurança

### ✅ Boas Práticas

1. **Nunca exponha API Keys**
   - Não commite no git
   - Não compartilhe em mensagens
   - Use variáveis de ambiente

2. **Rotação Regular**
   - Crie novas keys periodicamente
   - Remova keys antigas
   - Use `expiresAt` para expiração automática

3. **Princípio do Menor Privilégio**
   - Use keys de tenant quando possível
   - Evite criar keys globais desnecessárias
   - Revogue keys não utilizadas

4. **Monitoramento**
   - Monitore uso de API keys
   - Alerte sobre uso anormal
   - Revogue imediatamente keys comprometidas

---

### ⚠️ API Keys Globais - Cuidados Extras

1. **Apenas SUPER_ADMIN pode criar**
2. **Acesso ilimitado a todos os tenants**
3. **Use apenas para:**
   - N8N workflows globais
   - Monitoramento de sistema
   - Backups automatizados
   - Analytics cross-tenant

4. **NÃO use para:**
   - Integrações de terceiros não confiáveis
   - Scripts sem controle de acesso
   - Compartilhamento com tenants individuais

---

## Validação de API Key (Guard)

O sistema usa `ApiKeyGuard` para validar requests:

```typescript
// Exemplo de uso em um endpoint
@Controller('webhooks/n8n')
@UseGuards(ApiKeyGuard)
export class N8nWebhooksController {
  @Patch('leads/:phone/status')
  updateLeadStatus(
    @Param('phone') phone: string,
    @Body() dto: UpdateLeadStatusDto,
    @ApiKeyTenant() tenantId: string, // Extraído da API Key
  ) {
    // Se API Key for global, tenantId será resolvido dinamicamente
    // Se API Key for de tenant, tenantId será fixo
  }
}
```

---

## Fluxo de Autenticação

```
1. Request chega com header X-API-Key: crm_abc123...

2. ApiKeyGuard extrai a chave

3. Sistema busca no banco:
   - Hash da chave
   - Verifica se está ativa
   - Verifica expiração

4. Se key é global (tenantId=null):
   - Permite acesso a qualquer tenant
   - Tenant é resolvido pelo contexto (ex: phone do lead)

5. Se key é de tenant:
   - Limita acesso ao tenant específico
   - Rejeita requests de outros tenants
```

---

## Schema do Banco de Dados

```prisma
model ApiKey {
  id        String    @id @default(uuid())
  name      String
  key       String    @unique // Hash SHA256
  tenantId  String?   // Null = Global (Super Admin)
  isActive  Boolean   @default(true)
  expiresAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  tenant Company? @relation(fields: [tenantId], references: [id])

  @@map("api_keys")
}
```

---

## ✅ Checklist

- [x] Model ApiKey com suporte a `tenantId=null`
- [x] Endpoint POST `/api-keys` com parâmetro `isGlobal`
- [x] Validação: apenas SUPER_ADMIN cria keys globais
- [x] ApiKeyGuard valida keys globais e de tenant
- [x] Listagem diferenciada por role
- [x] Flag `isGlobal` no response
- [x] Documentação completa

---

## 🚀 Como Testar

### 1. Criar API Key Global

```bash
# Login como Super Admin
curl -X POST https://backcrm.aoseudispor.com.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@exemplo.com","password":"superadmin123"}'

# Criar key global
curl -X POST https://backcrm.aoseudispor.com.br/api-keys \
  -H "Authorization: Bearer {jwt}" \
  -H "Content-Type: application/json" \
  -d '{"name":"N8N Global","isGlobal":true}'
```

### 2. Testar com N8N

```bash
# Atualizar status de qualquer lead de qualquer tenant
curl -X PATCH https://backcrm.aoseudispor.com.br/webhooks/n8n/leads/5511999999999@c.us/status \
  -H "X-API-Key: crm_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"status":"EM_ATENDIMENTO"}'
```

---

**Documentação criada em:** 19/11/2025  
**Versão:** 1.0.0

