# Integração N8N e Automação com IA

Este documento descreve como usar o sistema de integração com n8n e automação com agentes de IA.

## Configuração

### Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# N8N Configuration
N8N_URL=http://localhost:5678
N8N_API_KEY=sua_api_key_do_n8n
```

### Como obter a API Key do n8n

1. Acesse o n8n em `http://localhost:5678`
2. Vá em **Settings** → **API**
3. Crie uma nova API Key
4. Copie a key e adicione ao `.env`

## Fluxo do Sistema

### Super Admin
1. Acessa o painel em `/saas`
2. Cria templates de workflow com JSON do n8n + variáveis editáveis
3. Templates ficam disponíveis globalmente para todos os tenants

### Tenant Admin
1. Acessa a página de Automações
2. Escolhe um template disponível
3. Configura as variáveis (prompts, departamentos, etc.)
4. Ativa a automação
5. CRM envia o JSON personalizado para o n8n
6. n8n retorna o webhook URL
7. Automação fica ativa e pronta para uso

## API Endpoints

### API Keys (Autenticação)

#### Criar API Key
```http
POST /api-keys
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "N8N Integration Key",
  "expiresAt": "2025-12-31T23:59:59Z" // Opcional
}

Response:
{
  "id": "uuid",
  "name": "N8N Integration Key",
  "key": "crm_a1b2c3d4...", // GUARDAR - não será mostrado novamente
  "tenantId": "uuid",
  "warning": "Guarde esta chave em local seguro. Ela não poderá ser recuperada novamente."
}
```

#### Listar API Keys
```http
GET /api-keys
Authorization: Bearer {jwt_token}
```

#### Revogar API Key
```http
DELETE /api-keys/{id}
Authorization: Bearer {jwt_token}
```

---

### Webhooks N8N (Usar com API Key)

**Autenticação**: Incluir header `X-API-Key: crm_...`

#### Atualizar Nome do Lead
```http
PATCH /webhooks/n8n/leads/{phone}/name
X-API-Key: crm_...
Content-Type: application/json

{
  "name": "João Silva"
}
```

#### Adicionar/Remover Tags (Interesses)
```http
PATCH /webhooks/n8n/leads/{phone}/tags
X-API-Key: crm_...

{
  "tags": ["interessado", "vip"],
  "action": "add" // "add", "remove", "replace"
}
```

#### Mudar Estágio do Lead
```http
PATCH /webhooks/n8n/leads/{phone}/status
X-API-Key: crm_...

{
  "status": "EM_ATENDIMENTO" // NOVO, EM_ATENDIMENTO, AGUARDANDO, CONCLUIDO
}
```

#### Obter Informações do Lead
```http
GET /webhooks/n8n/leads/{phone}
X-API-Key: crm_...
```

#### Transferir Atendimento para Departamento
```http
POST /webhooks/n8n/attendances/{leadId}/transfer-department
X-API-Key: crm_...

{
  "departmentId": "uuid",
  "notes": "Transferência automática",
  "priority": "HIGH" // LOW, NORMAL, HIGH
}
```

#### Transferir Atendimento para Usuário
```http
POST /webhooks/n8n/attendances/{leadId}/transfer-user
X-API-Key: crm_...

{
  "userId": "uuid",
  "departmentId": "uuid", // Opcional
  "notes": "Transferência automática"
}
```

#### Encerrar Atendimento
```http
POST /webhooks/n8n/attendances/{leadId}/close
X-API-Key: crm_...

{
  "notes": "Atendimento finalizado automaticamente"
}
```

#### Alterar Prioridade do Atendimento
```http
PATCH /webhooks/n8n/attendances/{leadId}/priority
X-API-Key: crm_...

{
  "priority": "HIGH"
}
```

#### Enviar Mensagem
```http
POST /webhooks/n8n/messages/send
X-API-Key: crm_...

{
  "phone": "5511999999999",
  "message": "Olá! Como posso ajudar?",
  "connectionId": "uuid", // Opcional - usa primeira conexão ativa
  "contentType": "TEXT", // TEXT, IMAGE, AUDIO, VIDEO, DOCUMENT
  "mediaUrl": "https://..." // Para mídia
}
```

#### Listar Mensagens do Lead
```http
GET /webhooks/n8n/messages/{leadId}
X-API-Key: crm_...
```

---

### Agentes de IA

#### Criar Agente de IA
```http
POST /ai-agents
Authorization: Bearer {jwt_token}

{
  "name": "Atendente Virtual",
  "description": "Agente para atendimento inicial",
  "systemPrompt": "Você é um assistente virtual...",
  "userPrompt": "Responda de forma profissional...",
  "model": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 1000,
  "departmentId": "uuid" // Opcional
}
```

#### Listar Agentes
```http
GET /ai-agents?departmentId=uuid
Authorization: Bearer {jwt_token}
```

#### Atualizar Agente (incluindo prompts)
```http
PATCH /ai-agents/{id}
Authorization: Bearer {jwt_token}

{
  "systemPrompt": "Novo prompt...",
  "temperature": 0.8
}
```

#### Deletar Agente
```http
DELETE /ai-agents/{id}
Authorization: Bearer {jwt_token}
```

---

### Workflow Templates (Super Admin)

#### Criar Template
```http
POST /workflow-templates
Authorization: Bearer {jwt_token}

{
  "name": "Atendimento Automático com IA",
  "description": "Template para atendimento inicial automatizado",
  "category": "Atendimento",
  "icon": "bot",
  "isGlobal": true,
  "n8nWorkflowData": {
    "name": "Atendimento Automático",
    "nodes": [
      {
        "name": "Webhook",
        "type": "n8n-nodes-base.webhook",
        "parameters": {
          "path": "atendimento-auto"
        }
      },
      {
        "name": "AI Agent",
        "type": "n8n-nodes-base.httpRequest",
        "parameters": {
          "url": "{{aiApiUrl}}",
          "method": "POST",
          "body": {
            "prompt": "{{systemPrompt}}"
          }
        }
      }
    ],
    "connections": {}
  },
  "variables": {
    "systemPrompt": {
      "type": "textarea",
      "label": "Prompt do Sistema",
      "description": "Instruções para o agente de IA",
      "required": true,
      "default": "Você é um assistente virtual..."
    },
    "aiApiUrl": {
      "type": "text",
      "label": "URL da API de IA",
      "required": true,
      "default": "https://api.openai.com/v1/chat/completions"
    },
    "departmentId": {
      "type": "select",
      "label": "Departamento",
      "required": false
    }
  }
}
```

#### Listar Templates
```http
GET /workflow-templates?category=Atendimento
Authorization: Bearer {jwt_token}
```

#### Atualizar Template
```http
PATCH /workflow-templates/{id}
Authorization: Bearer {jwt_token}
```

#### Deletar Template
```http
DELETE /workflow-templates/{id}
Authorization: Bearer {jwt_token}
```

---

### Workflow Instances (Tenant Admin)

#### Criar Instância (Ativar Automação)
```http
POST /workflow-templates/{templateId}/instantiate
Authorization: Bearer {jwt_token}

{
  "name": "Meu Atendimento Automático",
  "config": {
    "systemPrompt": "Você é o assistente da Empresa XYZ...",
    "aiApiUrl": "https://api.openai.com/v1/chat/completions",
    "departmentId": "uuid-do-departamento"
  },
  "aiAgentId": "uuid" // Opcional
}

Response:
{
  "id": "uuid",
  "name": "Meu Atendimento Automático",
  "n8nWorkflowId": "123",
  "webhookUrl": "http://localhost:5678/webhook/atendimento-auto",
  "isActive": false
}
```

#### Ativar Instância
```http
POST /workflow-templates/instances/{id}/activate
Authorization: Bearer {jwt_token}
```

#### Desativar Instância
```http
POST /workflow-templates/instances/{id}/deactivate
Authorization: Bearer {jwt_token}
```

#### Listar Instâncias
```http
GET /workflow-templates/instances/all
Authorization: Bearer {jwt_token}
```

#### Atualizar Instância
```http
PATCH /workflow-templates/instances/{id}
Authorization: Bearer {jwt_token}

{
  "config": {
    "systemPrompt": "Novo prompt..."
  }
}
```

#### Deletar Instância
```http
DELETE /workflow-templates/instances/{id}
Authorization: Bearer {jwt_token}
```

---

## Estrutura de Variáveis em Templates

As variáveis são definidas no campo `variables` do template e permitem personalização pelos tenants:

```json
{
  "nomeVariavel": {
    "type": "text|textarea|select|number",
    "label": "Label para exibição",
    "description": "Descrição da variável",
    "required": true|false,
    "default": "valor padrão",
    "options": [] // Para type: "select"
  }
}
```

### Tipos de Variáveis

- **text**: Campo de texto simples
- **textarea**: Campo de texto multilinha (para prompts)
- **select**: Lista de opções
- **number**: Valor numérico

### Uso no Workflow

No JSON do workflow, use `{{nomeVariavel}}` para marcar onde a variável será substituída:

```json
{
  "parameters": {
    "prompt": "{{systemPrompt}}",
    "url": "{{apiUrl}}"
  }
}
```

## Exemplo Completo: Atendimento com IA

### 1. Super Admin cria template

```json
{
  "name": "Atendimento IA WhatsApp",
  "category": "Atendimento",
  "n8nWorkflowData": { /* workflow completo */ },
  "variables": {
    "systemPrompt": {
      "type": "textarea",
      "label": "Prompt do Agente",
      "required": true
    }
  }
}
```

### 2. Tenant configura e ativa

```json
{
  "name": "Atendente Virtual - Empresa XYZ",
  "config": {
    "systemPrompt": "Você é o atendente da Empresa XYZ..."
  }
}
```

### 3. Sistema cria workflow no n8n

- Substitui `{{systemPrompt}}` pelo valor configurado
- Cria workflow no n8n via API
- Retorna webhook URL
- Tenant pode começar a usar

## Variáveis de Ambiente Completas

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/crm

# JWT
JWT_SECRET=sua_secret_key_aqui
JWT_EXPIRES_IN=7d

# N8N Integration
N8N_URL=http://localhost:5678
N8N_API_KEY=sua_n8n_api_key

# OpenAI (opcional, para agentes de IA)
OPENAI_API_KEY=sk-...
```

## Boas Práticas

1. **Segurança**
   - Nunca compartilhe API Keys
   - Use HTTPS em produção
   - Rotacione keys periodicamente

2. **Templates**
   - Sempre documente as variáveis
   - Forneça valores padrão úteis
   - Teste antes de disponibilizar para tenants

3. **Automações**
   - Monitore logs do n8n
   - Configure alertas para falhas
   - Mantenha backups dos workflows

## Troubleshooting

### Erro ao criar workflow no n8n
- Verifique se N8N_URL está correto
- Confirme se N8N_API_KEY é válida
- Certifique-se que o n8n está rodando

### Webhook não funciona
- Verifique se o workflow está ativo
- Confirme a URL do webhook
- Teste manualmente com Postman/Insomnia

### Variáveis não substituídas
- Verifique se usou sintaxe `{{variavel}}`
- Confirme que a variável está definida em `variables`
- Certifique-se que o tenant forneceu o valor

