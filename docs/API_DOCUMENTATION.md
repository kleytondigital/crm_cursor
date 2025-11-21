# 📚 Documentação Completa da API - B2X CRM

Base URL: `https://backcrm.aoseudispor.com.br` (ou sua URL de produção)

## 🔐 Autenticação

A maioria dos endpoints requer autenticação via JWT Bearer Token.

### Headers Comuns

```bash
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

Para endpoints de API Key (webhooks n8n):
```bash
X-API-Key: {api_key}
Content-Type: application/json
```

---

## 📋 Índice

1. [Autenticação](#autenticação-endpoints)
2. [Usuários](#usuários)
3. [Empresas](#empresas)
4. [Leads](#leads)
5. [Conversas](#conversas)
6. [Mensagens](#mensagens)
7. [Conexões WhatsApp](#conexões-whatsapp)
8. [Atendimentos](#atendimentos)
9. [Departamentos](#departamentos)
10. [Pipeline/Kanban](#pipeline-kanban)
11. [Automações/Workflows](#automações-workflows)
12. [Agentes IA](#agentes-ia)
13. [API Keys](#api-keys)
14. [Agendamentos](#agendamentos)
15. [Webhooks n8n](#webhooks-n8n)
16. [Webhooks WAHA](#webhooks-waha)

---

## 🔑 Autenticação (Endpoints)

### Login

```bash
curl -X POST https://backcrm.aoseudispor.com.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@exemplo.com",
    "password": "senha123"
  }'
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "usuario@exemplo.com",
    "name": "Nome do Usuário",
    "role": "ADMIN",
    "companyId": "uuid-empresa"
  }
}
```

### Registro (Super Admin)

```bash
curl -X POST https://backcrm.aoseudispor.com.br/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo@exemplo.com",
    "password": "senha123",
    "name": "Novo Usuário",
    "companyName": "Nova Empresa"
  }'
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

---

## 👥 Usuários

### Listar Usuários

```bash
curl -X GET https://backcrm.aoseudispor.com.br/users \
  -H "Authorization: Bearer {token}"
```

**Resposta:**
```json
[
  {
    "id": "uuid",
    "name": "Nome Usuário",
    "email": "usuario@exemplo.com",
    "role": "ADMIN",
    "companyId": "uuid",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Criar Usuário

```bash
curl -X POST https://backcrm.aoseudispor.com.br/users \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Novo Usuário",
    "email": "novo@exemplo.com",
    "password": "senha123",
    "role": "USER"
  }'
```

### Atualizar Usuário

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/users/{id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nome Atualizado",
    "role": "MANAGER"
  }'
```

### Deletar Usuário

```bash
curl -X DELETE https://backcrm.aoseudispor.com.br/users/{id} \
  -H "Authorization: Bearer {token}"
```

---

## 🏢 Empresas

### Listar Empresas (Super Admin)

```bash
curl -X GET https://backcrm.aoseudispor.com.br/companies \
  -H "Authorization: Bearer {token}"
```

### Criar Empresa

```bash
curl -X POST https://backcrm.aoseudispor.com.br/companies \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nova Empresa",
    "document": "12345678000100"
  }'
```

### Atualizar Empresa

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/companies/{id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nome Atualizado"
  }'
```

---

## 👤 Leads

### Listar Leads

```bash
curl -X GET "https://backcrm.aoseudispor.com.br/leads?status=EM_ATENDIMENTO" \
  -H "Authorization: Bearer {token}"
```

**Parâmetros Query:**
- `status` (opcional): `NOVO`, `EM_ATENDIMENTO`, `AGUARDANDO`, `CONCLUIDO`

**Resposta:**
```json
[
  {
    "id": "uuid",
    "name": "João Silva",
    "phone": "5511999999999",
    "status": "EM_ATENDIMENTO",
    "tags": ["vip", "interessado"],
    "profilePictureURL": "https://...",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Criar Lead

```bash
curl -X POST https://backcrm.aoseudispor.com.br/leads \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "phone": "5511999999999",
    "tags": ["vip"]
  }'
```

### Atualizar Status do Lead

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/leads/{id}/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "EM_ATENDIMENTO"
  }'
```

### Deletar Lead

```bash
curl -X DELETE https://backcrm.aoseudispor.com.br/leads/{id} \
  -H "Authorization: Bearer {token}"
```

---

## 💬 Conversas

### Listar Conversas

```bash
curl -X GET https://backcrm.aoseudispor.com.br/conversations \
  -H "Authorization: Bearer {token}"
```

**Resposta:**
```json
[
  {
    "id": "uuid",
    "leadId": "uuid",
    "status": "OPEN",
    "lastMessage": {
      "id": "uuid",
      "contentText": "Última mensagem",
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "lead": {
      "name": "João Silva",
      "phone": "5511999999999"
    }
  }
]
```

### Obter Conversa por Lead

```bash
curl -X GET https://backcrm.aoseudispor.com.br/conversations/lead/{leadId} \
  -H "Authorization: Bearer {token}"
```

---

## 📨 Mensagens

### Listar Mensagens de uma Conversa

```bash
curl -X GET "https://backcrm.aoseudispor.com.br/messages/conversation/{conversationId}?page=1&limit=50" \
  -H "Authorization: Bearer {token}"
```

**Resposta:**
```json
[
  {
    "id": "uuid",
    "conversationId": "uuid",
    "direction": "INBOUND",
    "contentType": "TEXT",
    "contentText": "Mensagem de texto",
    "status": "delivered",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Enviar Mensagem

```bash
curl -X POST https://backcrm.aoseudispor.com.br/messages \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "uuid",
    "contentText": "Olá! Como posso ajudar?",
    "contentType": "TEXT"
  }'
```

---

## 📱 Conexões WhatsApp

### Listar Conexões

```bash
curl -X GET https://backcrm.aoseudispor.com.br/connections \
  -H "Authorization: Bearer {token}"
```

**Resposta:**
```json
[
  {
    "id": "uuid",
    "name": "WhatsApp Principal",
    "sessionName": "session-123",
    "status": "ACTIVE",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### Criar Conexão

```bash
curl -X POST https://backcrm.aoseudispor.com.br/connections \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nova Conexão",
    "sessionName": "nova-session"
  }'
```

### Obter QR Code

```bash
curl -X GET https://backcrm.aoseudispor.com.br/connections/{id}/qr \
  -H "Authorization: Bearer {token}"
```

**Resposta:**
```json
{
  "qr": "data:image/png;base64,...",
  "sessionName": "session-123"
}
```

### Executar Ação na Conexão

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/connections/{id}/actions/{action} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Ações disponíveis:** `start`, `stop`, `restart`, `delete`, `reload`, `connect`, `disconnect`, `auth-code`

### Obter Webhooks da Conexão

```bash
curl -X GET https://backcrm.aoseudispor.com.br/connections/{id}/webhooks \
  -H "Authorization: Bearer {token}"
```

**Resposta:**
```json
[
  {
    "id": "556296724968@c.us",
    "webhooks": [
      {
        "url": "https://...",
        "events": ["message.any"],
        "hmac": null,
        "retries": null,
        "customHeaders": null
      }
    ]
  }
]
```

### Atualizar Webhooks da Conexão

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/connections/{id}/webhooks \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "webhooks": [
        {
          "url": "https://seu-webhook.com/webhook",
          "events": ["message.any"],
          "hmac": null,
          "retries": null,
          "customHeaders": null
        }
      ]
    }
  }'
```

### Listar Automações Conectadas

```bash
curl -X GET https://backcrm.aoseudispor.com.br/connections/{id}/automations \
  -H "Authorization: Bearer {token}"
```

---

## 🎫 Atendimentos

### Listar Atendimentos

```bash
curl -X GET "https://backcrm.aoseudispor.com.br/attendances?status=OPEN&priority=HIGH" \
  -H "Authorization: Bearer {token}"
```

**Parâmetros Query:**
- `status` (opcional): `OPEN`, `IN_PROGRESS`, `TRANSFERRED`, `CLOSED`
- `priority` (opcional): `LOW`, `NORMAL`, `HIGH`
- `departmentId` (opcional): UUID do departamento
- `assignedUserId` (opcional): UUID do usuário

### Obter Estatísticas

```bash
curl -X GET https://backcrm.aoseudispor.com.br/attendances/stats \
  -H "Authorization: Bearer {token}"
```

**Resposta:**
```json
{
  "total": 100,
  "open": 25,
  "inProgress": 30,
  "closed": 45,
  "byPriority": {
    "HIGH": 10,
    "NORMAL": 50,
    "LOW": 40
  }
}
```

### Fila Inteligente (Smart Queue)

```bash
curl -X GET https://backcrm.aoseudispor.com.br/attendances/queue/next \
  -H "Authorization: Bearer {token}"
```

### Reivindicar Atendimento

```bash
curl -X POST https://backcrm.aoseudispor.com.br/attendances/lead/{leadId}/claim \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "uuid",
    "priority": "NORMAL"
  }'
```

### Transferir Atendimento

```bash
curl -X POST https://backcrm.aoseudispor.com.br/attendances/{id}/transfer \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid",
    "departmentId": "uuid",
    "notes": "Transferência para especialista"
  }'
```

### Fechar Atendimento

```bash
curl -X POST https://backcrm.aoseudispor.com.br/attendances/{id}/close \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Atendimento finalizado"
  }'
```

### Atualizar Prioridade

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/attendances/{id}/priority \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "HIGH"
  }'
```

---

## 🏛️ Departamentos

### Listar Departamentos

```bash
curl -X GET https://backcrm.aoseudispor.com.br/departments \
  -H "Authorization: Bearer {token}"
```

### Criar Departamento

```bash
curl -X POST https://backcrm.aoseudispor.com.br/departments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Suporte Técnico",
    "description": "Departamento de suporte"
  }'
```

### Atribuir Usuário ao Departamento

```bash
curl -X POST https://backcrm.aoseudispor.com.br/departments/{id}/assign \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid",
    "role": "AGENT"
  }'
```

---

## 🎨 Pipeline/Kanban

### Listar Estágios

```bash
curl -X GET https://backcrm.aoseudispor.com.br/pipeline-stages \
  -H "Authorization: Bearer {token}"
```

**Resposta:**
```json
[
  {
    "id": "uuid",
    "name": "Novo",
    "status": "NOVO",
    "color": "#3B82F6",
    "order": 0,
    "isDefault": true,
    "isActive": true
  }
]
```

### Criar Estágio

```bash
curl -X POST https://backcrm.aoseudispor.com.br/pipeline-stages \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Qualificado",
    "status": "EM_ATENDIMENTO",
    "color": "#FF6B6B",
    "order": 1
  }'
```

### Reordenar Estágios

```bash
curl -X POST https://backcrm.aoseudispor.com.br/pipeline-stages/reorder \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "stages": [
      { "id": "uuid-1", "order": 0 },
      { "id": "uuid-2", "order": 1 }
    ]
  }'
```

---

## 🤖 Automações/Workflows

### Listar Templates

```bash
curl -X GET "https://backcrm.aoseudispor.com.br/workflow-templates?category=chatbot" \
  -H "Authorization: Bearer {token}"
```

### Criar Template

```bash
curl -X POST https://backcrm.aoseudispor.com.br/workflow-templates \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Template de Vendas",
    "category": "chatbot",
    "variables": {...},
    "n8nWorkflowData": {...}
  }'
```

### Instanciar Template (Criar Automação)

```bash
curl -X POST https://backcrm.aoseudispor.com.br/workflow-templates/{templateId}/instantiate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Automação de Vendas",
    "config": {
      "variavel1": "valor1"
    },
    "aiAgentId": "uuid"
  }'
```

**Resposta:**
```json
{
  "id": "uuid",
  "n8nWorkflowId": "workflow-id",
  "webhookUrl": "https://...",
  "webhookName": "automacao-vendas",
  "webhookPath": "path",
  "webhookUrlEditor": "https://...",
  "generatedPrompt": "Prompt gerado...",
  "name": "Automação de Vendas",
  "isActive": false
}
```

### Listar Instâncias (Automações)

```bash
curl -X GET https://backcrm.aoseudispor.com.br/workflow-templates/instances/all \
  -H "Authorization: Bearer {token}"
```

### Ativar Automação

```bash
curl -X POST https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/activate \
  -H "Authorization: Bearer {token}"
```

### Desativar Automação

```bash
curl -X POST https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/deactivate \
  -H "Authorization: Bearer {token}"
```

### Gerenciar Prompt do Agente

#### Criar/Ajustar Prompt

```bash
curl -X POST https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/prompt \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "system",
    "variables": [
      { "name": "var1", "value": "valor1" }
    ]
  }'
```

Para ajustar prompt existente:
```bash
curl -X POST https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/prompt \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user",
    "prompt_ajuste": "Prompt atual...",
    "text_ajuste": "Torne o prompt mais formal"
  }'
```

#### Obter Prompt

```bash
curl -X GET https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/prompt \
  -H "Authorization: Bearer {token}"
```

#### Atualizar Prompt (Edição Direta)

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/prompt \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Prompt editado diretamente..."
  }'
```

#### Limpar Prompt

```bash
curl -X DELETE https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/prompt \
  -H "Authorization: Bearer {token}"
```

### Gerenciar Conexões da Automação

#### Listar Conexões da Automação

```bash
curl -X GET https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/connections \
  -H "Authorization: Bearer {token}"
```

#### Conectar Automação à Conexão

```bash
curl -X POST https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/connections/{connectionId} \
  -H "Authorization: Bearer {token}"
```

#### Wizard de Ativação

```bash
curl -X POST https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/connections/{connectionId}/wizard \
  -H "Authorization: Bearer {token}"
```

**Resposta:**
```json
{
  "success": true,
  "steps": [
    {
      "step": 1,
      "name": "Validar Automação",
      "status": "success",
      "message": "Automação válida"
    }
  ]
}
```

#### Desconectar Automação

```bash
curl -X DELETE https://backcrm.aoseudispor.com.br/workflow-templates/instances/{id}/connections/{connectionId} \
  -H "Authorization: Bearer {token}"
```

---

## 🧠 Agentes IA

### Listar Agentes IA

```bash
curl -X GET https://backcrm.aoseudispor.com.br/ai-agents \
  -H "Authorization: Bearer {token}"
```

### Criar Agente IA

```bash
curl -X POST https://backcrm.aoseudispor.com.br/ai-agents \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Assistente Virtual",
    "model": "gpt-4",
    "systemPrompt": "Você é um assistente...",
    "temperature": 0.7
  }'
```

---

## 🔑 API Keys

### Listar API Keys

```bash
curl -X GET https://backcrm.aoseudispor.com.br/api-keys \
  -H "Authorization: Bearer {token}"
```

### Criar API Key

```bash
curl -X POST https://backcrm.aoseudispor.com.br/api-keys \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chave para n8n",
    "permissions": ["read", "write"]
  }'
```

**Resposta:**
```json
{
  "id": "uuid",
  "name": "Chave para n8n",
  "key": "crm_xxxxxxxxxxxxx",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

⚠️ **IMPORTANTE:** A chave é exibida apenas uma vez no momento da criação!

---

## 📅 Agendamentos

### Listar Campanhas

```bash
curl -X GET https://backcrm.aoseudispor.com.br/campaigns \
  -H "Authorization: Bearer {token}"
```

### Criar Campanha

```bash
curl -X POST https://backcrm.aoseudispor.com.br/campaigns \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Campanha de Natal",
    "message": "Feliz Natal!",
    "scheduledDate": "2025-12-25T10:00:00.000Z",
    "leadIds": ["uuid1", "uuid2"]
  }'
```

---

## 🔗 Webhooks n8n

Todos os endpoints abaixo requerem autenticação via API Key no header `X-API-Key`.

### Atualizar Nome do Lead

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/webhooks/n8n/leads/{phone}/name \
  -H "X-API-Key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva"
  }'
```

### Atualizar Tags do Lead

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/webhooks/n8n/leads/{phone}/tags \
  -H "X-API-Key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["vip", "interessado"],
    "action": "add"
  }'
```

**Actions:** `add`, `remove`, `replace`

### Atualizar Status do Lead

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/webhooks/n8n/leads/{phone}/status \
  -H "X-API-Key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "EM_ATENDIMENTO"
  }'
```

### Obter Lead por Telefone

```bash
curl -X GET https://backcrm.aoseudispor.com.br/webhooks/n8n/leads/{phone} \
  -H "X-API-Key: {api_key}"
```

### Transferir Atendimento para Departamento

```bash
curl -X POST https://backcrm.aoseudispor.com.br/webhooks/n8n/attendances/{leadId}/transfer-department \
  -H "X-API-Key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "departmentId": "uuid",
    "notes": "Transferência automática",
    "priority": "HIGH"
  }'
```

### Transferir Atendimento para Usuário

```bash
curl -X POST https://backcrm.aoseudispor.com.br/webhooks/n8n/attendances/{leadId}/transfer-user \
  -H "X-API-Key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid",
    "departmentId": "uuid",
    "notes": "Transferência automática"
  }'
```

### Fechar Atendimento

```bash
curl -X POST https://backcrm.aoseudispor.com.br/webhooks/n8n/attendances/{leadId}/close \
  -H "X-API-Key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Atendimento finalizado"
  }'
```

### Atualizar Prioridade do Atendimento

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/webhooks/n8n/attendances/{leadId}/priority \
  -H "X-API-Key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": "HIGH"
  }'
```

### Enviar Mensagem

```bash
curl -X POST https://backcrm.aoseudispor.com.br/webhooks/n8n/messages/send \
  -H "X-API-Key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "message": "Olá! Como posso ajudar?",
    "connectionId": "uuid",
    "contentType": "TEXT"
  }'
```

### Listar Mensagens do Lead

```bash
curl -X GET https://backcrm.aoseudispor.com.br/webhooks/n8n/messages/{leadId} \
  -H "X-API-Key: {api_key}"
```

### Atualizar Transcrição de Mensagem

```bash
curl -X PATCH https://backcrm.aoseudispor.com.br/webhooks/n8n/messages/{messageId}/transcription \
  -H "X-API-Key: {api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "transcription": "Texto transcrito do áudio"
  }'
```

---

## 📡 Webhooks WAHA

Estes endpoints são públicos e recebem webhooks do WAHA.

### Webhook de Mensagens

```bash
POST https://backcrm.aoseudispor.com.br/webhooks/waha
Content-Type: application/json

{
  "event": "message.any",
  "payload": {
    "from": "5511999999999@c.us",
    "to": "5511888888888@c.us",
    "body": "Mensagem recebida",
    "timestamp": 1234567890
  }
}
```

---

## ⚠️ Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Requisição inválida
- `401` - Não autenticado
- `403` - Não autorizado
- `404` - Não encontrado
- `500` - Erro interno do servidor

---

## 📝 Notas Importantes

1. **Tenant Isolation:** Todos os endpoints respeitam o isolamento de tenant (empresa). Um usuário só acessa dados de sua própria empresa.

2. **Permissões por Role:**
   - `SUPER_ADMIN`: Acesso total
   - `ADMIN`: Acesso administrativo da empresa
   - `MANAGER`: Acesso de gestão
   - `USER`: Acesso limitado (apenas seus próprios atendimentos)

3. **Rate Limiting:** Alguns endpoints podem ter limite de requisições. Consulte a documentação específica.

4. **Webhooks:** Os webhooks WAHA devem ser configurados nas conexões WhatsApp para receber eventos em tempo real.

---

## 🔄 Exemplo Completo de Fluxo

1. **Login:**
```bash
curl -X POST https://backcrm.aoseudispor.com.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@exemplo.com","password":"senha123"}'
```

2. **Obter Token:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

3. **Listar Leads:**
```bash
curl -X GET https://backcrm.aoseudispor.com.br/leads \
  -H "Authorization: Bearer $TOKEN"
```

4. **Criar Atendimento:**
```bash
curl -X POST https://backcrm.aoseudispor.com.br/attendances/lead/{leadId}/claim \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"departmentId":"uuid","priority":"NORMAL"}'
```

---

## 📞 Suporte

Para dúvidas ou problemas com a API, entre em contato com o suporte.

