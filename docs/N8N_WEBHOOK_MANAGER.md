# Webhook Gestor N8N - Documentação Completa

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Actions Disponíveis](#actions-disponíveis)
4. [Como Criar o Webhook Gestor](#como-criar-o-webhook-gestor)
5. [Formato de Requisições e Respostas](#formato-de-requisições-e-respostas)
6. [Templates de Workflow](#templates-de-workflow)
7. [Segurança](#segurança)
8. [Troubleshooting](#troubleshooting)

## Visão Geral

O **Webhook Gestor** é um workflow no n8n que atua como orquestrador central para todas as operações de gestão de workflows do CRM. Ele recebe requisições HTTP do CRM, processa as actions solicitadas e retorna os resultados.

### Benefícios

1. **Desacoplamento**: CRM não precisa conhecer detalhes da API do n8n
2. **Segurança**: API key do n8n fica apenas no workflow gestor
3. **Flexibilidade**: Lógica de criação pode ser modificada sem alterar o CRM
4. **Extensibilidade**: Novas actions sem mudanças no backend
5. **Centralização**: Toda gestão de workflows em um único lugar

## Arquitetura

```
CRM Backend
    ↓
    | HTTP POST com action e dados
    ↓
Webhook Gestor (N8N)
    ↓
    | - Valida requisição
    | - Roteia por action
    | - Processa no n8n
    ↓
API N8N
    ↓
    | - Cria/Atualiza/Deleta workflow
    | - Retorna resultado
    ↓
Webhook Gestor (N8N)
    ↓
    | HTTP Response padronizada
    ↓
CRM Backend
```

## Actions Disponíveis

### 1. create - Criar Workflow

Cria um novo workflow a partir de um template.

**Request:**
```json
{
  "action": "create",
  "tenantId": "uuid-tenant",
  "templateName": "SDR",
  "automationName": "SDR Vendas 2024",
  "variables": {
    "nomeEmpresa": "Minha Empresa",
    "horarioFuncionamento": "Segunda a Sexta, 8h-18h",
    "departamentos": ["Vendas", "Suporte"],
    "systemPrompt": "Você é um SDR especializado..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "123",
    "webhookUrl": "https://n8n.com/webhook/uuid-gerado",
    "status": "created",
    "active": false
  }
}
```

### 2. update - Atualizar Workflow

Atualiza variáveis de um workflow existente.

**Request:**
```json
{
  "action": "update",
  "tenantId": "uuid-tenant",
  "workflowId": "123",
  "automationName": "SDR Vendas 2024 - Atualizado",
  "variables": {
    "horarioFuncionamento": "24/7",
    "systemPrompt": "Novo prompt..."
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "123",
    "status": "updated",
    "active": false
  }
}
```

### 3. delete - Deletar Workflow

Remove um workflow do n8n.

**Request:**
```json
{
  "action": "delete",
  "tenantId": "uuid-tenant",
  "workflowId": "123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow deletado com sucesso"
}
```

### 4. activate - Ativar Workflow

Ativa um workflow para começar a receber eventos.

**Request:**
```json
{
  "action": "activate",
  "tenantId": "uuid-tenant",
  "workflowId": "123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "123",
    "status": "activated",
    "active": true
  }
}
```

### 5. deactivate - Desativar Workflow

Desativa um workflow temporariamente.

**Request:**
```json
{
  "action": "deactivate",
  "tenantId": "uuid-tenant",
  "workflowId": "123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "123",
    "status": "deactivated",
    "active": false
  }
}
```

### 6. get - Obter Informações

Retorna informações detalhadas de um workflow.

**Request:**
```json
{
  "action": "get",
  "tenantId": "uuid-tenant",
  "workflowId": "123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "123",
    "name": "SDR Vendas 2024",
    "active": true,
    "webhookUrl": "https://n8n.com/webhook/uuid",
    "variables": { /* ... */ },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

### 7. validate - Validar Variáveis

Valida se as variáveis fornecidas são suficientes para criar um workflow.

**Request:**
```json
{
  "action": "validate",
  "tenantId": "uuid-tenant",
  "templateName": "SDR",
  "variables": {
    "nomeEmpresa": "Minha Empresa"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "missingFields": ["horarioFuncionamento", "systemPrompt"],
    "invalidFields": []
  }
}
```

### 8. logs (Opcional)

Retorna logs de execução do workflow.

**Request:**
```json
{
  "action": "logs",
  "tenantId": "uuid-tenant",
  "workflowId": "123",
  "limit": 50,
  "offset": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflowId": "123",
    "logs": [
      {
        "executionId": "exec-1",
        "startedAt": "2024-01-01T10:00:00Z",
        "finishedAt": "2024-01-01T10:00:05Z",
        "status": "success"
      }
    ],
    "total": 150
  }
}
```

## Como Criar o Webhook Gestor

### Passo 1: Criar Workflow no N8N

1. Acesse seu n8n
2. Crie um novo workflow
3. Nomeie como "Webhook Gestor CRM"

### Passo 2: Node Webhook (Entrada)

```json
{
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "manager-crm",
    "httpMethod": "POST",
    "responseMode": "responseNode",
    "options": {}
  }
}
```

### Passo 3: Node Function (Validação e Roteamento)

```javascript
const body = $input.item.json.body;

// Validar campos obrigatórios
if (!body.action || !body.tenantId) {
  return {
    json: {
      success: false,
      error: {
        code: "MISSING_FIELDS",
        message: "action e tenantId são obrigatórios"
      }
    }
  };
}

// Adicionar dados para roteamento
return {
  json: {
    ...body,
    _route: body.action
  }
};
```

### Passo 4: Node Switch (Roteamento por Action)

Configurar saídas para cada action:
- Route 0: `{{ $json._route === 'create' }}`
- Route 1: `{{ $json._route === 'update' }}`
- Route 2: `{{ $json._route === 'delete' }}`
- Route 3: `{{ $json._route === 'activate' }}`
- Route 4: `{{ $json._route === 'deactivate' }}`
- Route 5: `{{ $json._route === 'get' }}`
- Route 6: `{{ $json._route === 'validate' }}`

### Passo 5: Implementar Cada Action

#### Action: CREATE

```javascript
// Function Node - Preparar Template
const { templateName, automationName, variables, tenantId } = $input.item.json;

// Carregar template base (você pode ter templates armazenados)
let workflow = {
  name: automationName,
  nodes: [],
  connections: {},
  settings: {},
  staticData: {}
};

// Se for template SDR
if (templateName === 'SDR') {
  workflow.nodes = [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": `${tenantId}-${Date.now()}`,
        "httpMethod": "POST",
        "responseMode": "onReceived"
      },
      "position": [250, 300]
    },
    {
      "name": "AI Agent",
      "type": "n8n-nodes-base.openai",
      "parameters": {
        "model": "gpt-4",
        "text": `${variables.systemPrompt}\n\nEmpresa: ${variables.nomeEmpresa}\nHorário: ${variables.horarioFuncionamento}`
      },
      "position": [450, 300]
    }
    // ... mais nodes
  ];
}

return { json: workflow };
```

```json
// HTTP Request Node - Criar no N8N
{
  "method": "POST",
  "url": "={{ $env.N8N_API_URL }}/workflows",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "n8nApi",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "X-N8N-API-KEY",
        "value": "={{ $env.N8N_API_KEY }}"
      }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": []
  },
  "options": {}
}
```

```javascript
// Function Node - Formatar Resposta
const workflow = $input.item.json;

return {
  json: {
    success: true,
    data: {
      workflowId: workflow.id,
      webhookUrl: `${process.env.N8N_URL}/webhook/${workflow.nodes[0].parameters.path}`,
      status: "created",
      active: workflow.active || false
    }
  }
};
```

#### Action: ACTIVATE/DEACTIVATE

```json
// HTTP Request Node
{
  "method": "PATCH",
  "url": "={{ $env.N8N_API_URL }}/workflows/{{ $json.workflowId }}",
  "sendBody": true,
  "body": {
    "active": true // ou false para deactivate
  }
}
```

#### Action: DELETE

```json
// HTTP Request Node
{
  "method": "DELETE",
  "url": "={{ $env.N8N_API_URL }}/workflows/{{ $json.workflowId }}"
}
```

### Passo 6: Node Response (Saída)

Todos os caminhos devem convergir para um node de resposta HTTP.

## Templates de Workflow

### Estrutura de um Template

Cada template deve ter:
1. Nome único (`templateName`)
2. Variáveis configuráveis
3. Nodes pré-configurados
4. Webhook de entrada
5. Lógica de processamento

### Exemplo: Template SDR

**Variáveis:**
- `nomeEmpresa` (text, required)
- `horarioFuncionamento` (text, required)
- `departamentos` (array, required)
- `systemPrompt` (textarea, required)

**Nodes:**
1. Webhook (entrada de mensagens do WhatsApp)
2. Function (processar mensagem)
3. AI Agent (responder com IA)
4. HTTP Request (enviar resposta para CRM)
5. Conditional (rotear para departamento se necessário)

## Segurança

### 1. Autenticação do Webhook

Configure autenticação no webhook node:
- Header authentication
- Query parameter
- Basic auth

### 2. Validação de TenantId

Sempre valide que o tenantId existe e tem permissões.

### 3. Rate Limiting

Configure rate limiting no n8n ou use um proxy reverso.

### 4. Logs e Auditoria

Mantenha logs de todas as operações:
- Quem criou/atualizou
- Quando
- Quais variáveis foram alteradas

## Troubleshooting

### Erro: "Timeout ao criar workflow"

**Causa**: Template muito complexo ou n8n sobrecarregado

**Solução**:
- Aumente o timeout no CRM
- Otimize o template
- Escale o n8n

### Erro: "Template não encontrado"

**Causa**: templateName não existe no webhook gestor

**Solução**:
- Verifique o nome do template
- Adicione o template no switch do webhook gestor

### Erro: "Variáveis inválidas"

**Causa**: Variáveis obrigatórias faltando ou tipo incorreto

**Solução**:
- Use a action `validate` antes de criar
- Verifique a documentação do template

## Próximos Passos

1. [Criar Template SDR](./templates/sdr-template.md)
2. [Configurar Variáveis de Ambiente](./N8N_ENV_VARS.md)
3. [Integrar com CRM](../N8N_INTEGRATION.md)

