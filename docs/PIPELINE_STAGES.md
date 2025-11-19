# 🎨 Pipeline Customizável - Documentação Completa

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Endpoints da API](#endpoints-da-api)
3. [Estágios Padrão](#estágios-padrão)
4. [Customização por Tenant](#customização-por-tenant)
5. [Permissões](#permissões)
6. [Exemplos de Uso](#exemplos-de-uso)

---

## Visão Geral

O sistema de **Pipeline Customizável** permite que cada tenant personalize os estágios do funil de vendas (Kanban) de acordo com suas necessidades.

### Características

- ✅ **Estágios Padrão**: Sistema vem com 4 estágios pré-configurados
- ✅ **Customização por Tenant**: Cada empresa pode criar seus próprios estágios
- ✅ **Cores Personalizadas**: Cada estágio pode ter uma cor específica (hex)
- ✅ **Ordenação**: Estágios podem ser reordenados via drag-and-drop
- ✅ **Ativar/Desativar**: Estágios podem ser desativados sem serem deletados
- ✅ **Proteção**: Estágios padrão do sistema não podem ser editados/deletados

---

## Estágios Padrão

O sistema vem com 4 estágios padrão:

| Estágio | Status | Cor | Ordem | Descrição |
|---------|--------|-----|-------|-----------|
| 🔵 **Novo** | `NOVO` | `#3B82F6` | 0 | Leads recém-criados |
| 🟠 **Em Atendimento** | `EM_ATENDIMENTO` | `#F59E0B` | 1 | Leads em atendimento ativo |
| 🟣 **Aguardando** | `AGUARDANDO` | `#8B5CF6` | 2 | Aguardando resposta/ação |
| 🟢 **Concluído** | `CONCLUIDO` | `#10B981` | 3 | Atendimento finalizado |

### Como funciona

1. **Sem customização**: Tenant usa os estágios padrão globais
2. **Com customização**: Tenant pode criar estágios personalizados que sobrescrevem os padrões
3. **Status do Lead**: Cada estágio está associado a um `LeadStatus` no banco

---

## Endpoints da API

### 🔹 **1. Listar Estágios**

```http
GET /pipeline-stages
Authorization: Bearer {jwt_token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Novo",
    "status": "NOVO",
    "color": "#3B82F6",
    "order": 0,
    "isDefault": true,
    "isActive": true,
    "tenantId": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### 🔹 **2. Criar Estágio**

```http
POST /pipeline-stages
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "Qualificado",
  "status": "EM_ATENDIMENTO",
  "color": "#FF6B6B",
  "order": 1
}
```

**Validações:**
- ✅ Apenas ADMIN e SUPER_ADMIN podem criar
- ✅ Nome + Status devem ser únicos por tenant
- ✅ Cor deve ser hex válido (ex: `#FF0000`)

**Response:**
```json
{
  "id": "uuid",
  "name": "Qualificado",
  "status": "EM_ATENDIMENTO",
  "color": "#FF6B6B",
  "order": 1,
  "isDefault": false,
  "isActive": true,
  "tenantId": "uuid-tenant",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

### 🔹 **3. Buscar Estágio por ID**

```http
GET /pipeline-stages/{id}
Authorization: Bearer {jwt_token}
```

---

### 🔹 **4. Atualizar Estágio**

```http
PATCH /pipeline-stages/{id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "Qualificado para Vendas",
  "color": "#10B981",
  "order": 2
}
```

**Restrições:**
- ❌ Estágios padrão (`isDefault=true`) **não podem ser editados**
- ✅ Apenas estágios do próprio tenant podem ser editados

---

### 🔹 **5. Remover Estágio**

```http
DELETE /pipeline-stages/{id}
Authorization: Bearer {jwt_token}
```

**Restrições:**
- ❌ Estágios padrão **não podem ser removidos**
- ✅ Apenas estágios do próprio tenant podem ser removidos

---

### 🔹 **6. Reordenar Estágios**

```http
POST /pipeline-stages/reorder
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "stages": [
    { "id": "uuid-1", "order": 0 },
    { "id": "uuid-2", "order": 1 },
    { "id": "uuid-3", "order": 2 }
  ]
}
```

**Response:**
```json
{
  "message": "Estágios reordenados com sucesso"
}
```

---

### 🔹 **7. Atualizar Status do Lead (Pipeline)**

```http
PATCH /leads/{leadId}/status
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "status": "EM_ATENDIMENTO"
}
```

**Status disponíveis:**
- `NOVO`
- `EM_ATENDIMENTO`
- `AGUARDANDO`
- `CONCLUIDO`

---

## Customização por Tenant

### Cenário 1: Tenant sem customização

**Resultado**: Usa os 4 estágios padrão do sistema

```
🔵 Novo → 🟠 Em Atendimento → 🟣 Aguardando → 🟢 Concluído
```

---

### Cenário 2: Tenant com customização

**Exemplo**: Empresa de vendas B2B

```http
POST /pipeline-stages

// 1. Criar "Lead Novo"
{
  "name": "Lead Novo",
  "status": "NOVO",
  "color": "#60A5FA",
  "order": 0
}

// 2. Criar "Qualificado"
{
  "name": "Qualificado",
  "status": "EM_ATENDIMENTO",
  "color": "#FBBF24",
  "order": 1
}

// 3. Criar "Proposta Enviada"
{
  "name": "Proposta Enviada",
  "status": "AGUARDANDO",
  "color": "#A78BFA",
  "order": 2
}

// 4. Criar "Fechado - Ganho"
{
  "name": "Fechado - Ganho",
  "status": "CONCLUIDO",
  "color": "#34D399",
  "order": 3
}

// 5. Criar "Fechado - Perdido"
{
  "name": "Fechado - Perdido",
  "status": "CONCLUIDO",
  "color": "#EF4444",
  "order": 4
}
```

**Resultado**: Pipeline customizado com 5 estágios

```
🔵 Lead Novo → 🟡 Qualificado → 🟣 Proposta → 🟢 Ganho
                                            ↘ 🔴 Perdido
```

---

## Permissões

| Ação | USER | MANAGER | ADMIN | SUPER_ADMIN |
|------|------|---------|-------|-------------|
| Listar estágios | ✅ | ✅ | ✅ | ✅ (todos) |
| Criar estágio | ❌ | ❌ | ✅ | ✅ |
| Editar estágio | ❌ | ❌ | ✅ | ✅ |
| Remover estágio | ❌ | ❌ | ✅ | ✅ |
| Reordenar estágios | ❌ | ❌ | ✅ | ✅ |
| Mover lead (pipeline) | ✅ | ✅ | ✅ | ✅ |

---

## Exemplos de Uso

### Exemplo 1: E-commerce

```
🆕 Novo Pedido → 🔍 Em Análise → 📦 Enviado → ✅ Entregue
                                           ↘ ❌ Cancelado
```

### Exemplo 2: Suporte Técnico

```
🔴 Aberto → 🔵 Em Atendimento → 🟡 Aguardando Cliente → ✅ Resolvido
                                                      ↘ ❌ Fechado
```

### Exemplo 3: Recrutamento

```
📝 Currículo Recebido → 📞 Triagem → 🎯 Entrevista → ✅ Aprovado
                                                   ↘ ❌ Reprovado
```

---

## Integração com N8N

O n8n pode atualizar o status do lead automaticamente:

```javascript
// Node HTTP Request
PATCH https://backcrm.aoseudispor.com.br/leads/{leadId}/status
Headers: {
  "X-API-Key": "crm_sua_chave_aqui",
  "Content-Type": "application/json"
}
Body: {
  "status": "EM_ATENDIMENTO"
}
```

---

## Schema do Banco de Dados

```prisma
model PipelineStage {
  id          String     @id @default(uuid())
  name        String     // Nome do estágio
  status      LeadStatus // Status associado
  color       String     @default("#6B7280") // Cor (hex)
  order       Int        @default(0) // Ordem
  isDefault   Boolean    @default(false) // Padrão do sistema?
  isActive    Boolean    @default(true) // Ativo?
  tenantId    String?    // Null = global
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  company Company? @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, status, name])
  @@map("pipeline_stages")
}
```

---

## 🚀 Deploy em Produção

### 1. Aplicar Migration

```bash
# Easypanel (Terminal do container)
npx prisma migrate deploy

# Local
npm run prisma:migrate:deploy
```

### 2. Executar Seed (Criar estágios padrão)

```bash
npm run prisma:seed
```

### 3. Verificar

```bash
# Listar estágios padrão criados
npx prisma studio
# Navegar até: pipeline_stages
```

---

## ✅ Checklist de Implementação

- [x] Model `PipelineStage` criado
- [x] Migration aplicada
- [x] Seed de estágios padrão
- [x] CRUD completo (backend)
- [x] Endpoint `PATCH /leads/:id/status`
- [x] Permissões configuradas
- [x] Documentação completa
- [ ] Interface frontend (próxima etapa)

---

## 🎨 Cores Sugeridas

| Cor | Hex | Uso Sugerido |
|-----|-----|--------------|
| 🔵 Azul | `#3B82F6` | Novos, Iniciais |
| 🟠 Laranja | `#F59E0B` | Em Progresso |
| 🟣 Roxo | `#8B5CF6` | Aguardando |
| 🟢 Verde | `#10B981` | Sucesso, Concluído |
| 🔴 Vermelho | `#EF4444` | Perdido, Cancelado |
| 🟡 Amarelo | `#FBBF24` | Atenção, Prioritário |
| ⚫ Cinza | `#6B7280` | Padrão |

---

**Documentação criada em:** 19/11/2025  
**Versão:** 1.0.0

