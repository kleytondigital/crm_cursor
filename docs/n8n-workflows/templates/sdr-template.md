# Template SDR - Sales Development Representative

## Descrição

Template de automação para SDR (Sales Development Representative) que utiliza IA para qualificar leads, responder perguntas iniciais e agendar reuniões automaticamente.

## Variáveis Configuráveis

### 1. nomeEmpresa (obrigatório)
- **Tipo**: text
- **Descrição**: Nome da empresa para personalização das mensagens
- **Exemplo**: "Minha Empresa LTDA"

### 2. horarioFuncionamento (obrigatório)
- **Tipo**: text
- **Descrição**: Horário de funcionamento para informar disponibilidade
- **Exemplo**: "Segunda a Sexta, 8h às 18h"

### 3. departamentos (obrigatório)
- **Tipo**: array
- **Descrição**: Lista de departamentos disponíveis para transferência
- **Exemplo**: ["Vendas", "Suporte", "Financeiro"]

### 4. systemPrompt (obrigatório)
- **Tipo**: textarea
- **Descrição**: Prompt do sistema para o agente de IA
- **Exemplo**:
```
Você é um SDR (Sales Development Representative) da {{nomeEmpresa}}.

Seu objetivo é:
1. Qualificar leads através de perguntas estratégicas
2. Identificar a necessidade e orçamento do potencial cliente
3. Agendar reuniões com o time comercial para leads qualificados
4. Responder perguntas iniciais sobre produtos/serviços

Informações da empresa:
- Nome: {{nomeEmpresa}}
- Horário de atendimento: {{horarioFuncionamento}}
- Departamentos: {{departamentos}}

Seja sempre profissional, educado e objetivo.
```

### 5. produtosServicos (opcional)
- **Tipo**: textarea
- **Descrição**: Lista de produtos/serviços oferecidos
- **Exemplo**: "CRM, Automação de Marketing, Chatbots"

### 6. perguntasQualificacao (opcional)
- **Tipo**: array
- **Descrição**: Perguntas para qualificar leads
- **Exemplo**: 
```json
[
  "Qual o tamanho da sua empresa?",
  "Qual o seu orçamento mensal?",
  "Quando pretende implementar a solução?"
]
```

## Fluxo do Workflow

```
WhatsApp Message
    ↓
[Webhook Entrada]
    ↓
[Verificar Horário]
    ↓
    ├─ Fora do Horário → [Mensagem Automática de Retorno]
    └─ Dentro do Horário
        ↓
    [Extrair Contexto Lead]
        ↓
    [AI Agent - Processar]
        ↓
    [Classificar Intenção]
        ↓
        ├─ Qualificado → [Agendar Reunião]
        ├─ Precisa Suporte → [Transferir Departamento]
        ├─ Dúvida Simples → [Responder Diretamente]
        └─ Não Qualificado → [Mensagem Educada de Encerramento]
            ↓
        [Enviar Resposta CRM]
            ↓
        [Atualizar Lead no CRM]
            ↓
        [Log de Interação]
```

## Nodes do Template

### 1. Webhook Entrada
```json
{
  "name": "Webhook Entrada",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "{{tenantId}}-{{uuid}}",
    "httpMethod": "POST",
    "responseMode": "onReceived"
  }
}
```

### 2. Verificar Horário
```javascript
// Function Node
const agora = new Date();
const hora = agora.getHours();
const diaSemana = agora.getDay();

// {{horarioFuncionamento}} ex: "8-18" ou "8h-18h"
const [inicio, fim] = "{{horarioFuncionamento}}"
  .match(/\d+/g)
  .map(Number);

const dentroHorario = 
  diaSemana >= 1 && // Segunda
  diaSemana <= 5 && // Sexta
  hora >= inicio &&
  hora < fim;

return [{
  json: {
    ...$json,
    dentroHorario,
    mensagemForaHorario: `Olá! Nosso horário de atendimento é {{horarioFuncionamento}}. Retornaremos em breve.`
  }
}];
```

### 3. AI Agent - Processar
```json
{
  "name": "AI Agent",
  "type": "n8n-nodes-base.openai",
  "parameters": {
    "resource": "chat",
    "model": "gpt-4",
    "messages": {
      "values": [
        {
          "role": "system",
          "content": "{{systemPrompt}}"
        },
        {
          "role": "user",
          "content": "={{ $json.mensagem }}"
        }
      ]
    },
    "options": {
      "temperature": 0.7,
      "maxTokens": 500
    }
  }
}
```

### 4. Classificar Intenção
```javascript
// Function Node
const resposta = $json.choices[0].message.content;

// Análise de intenção
let intencao = 'duvida';
let qualificado = false;

// Palavras-chave para qualificação
const palavrasQualificacao = [
  'quero comprar',
  'interessado',
  'orçamento',
  'contratar',
  'plano'
];

const palavrasSuporte = [
  'problema',
  'erro',
  'não funciona',
  'ajuda',
  'suporte'
];

const mensagemLower = $json.mensagem.toLowerCase();

if (palavrasQualificacao.some(p => mensagemLower.includes(p))) {
  intencao = 'qualificado';
  qualificado = true;
} else if (palavrasSuporte.some(p => mensagemLower.includes(p))) {
  intencao = 'suporte';
}

return [{
  json: {
    ...$json,
    resposta,
    intencao,
    qualificado
  }
}];
```

### 5. Enviar Resposta CRM
```json
{
  "name": "Enviar Resposta",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "={{$env.CRM_API_URL}}/webhooks/n8n/messages",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "X-API-KEY",
          "value": "={{$env.CRM_API_KEY}}"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "leadId",
          "value": "={{$json.leadId}}"
        },
        {
          "name": "mensagem",
          "value": "={{$json.resposta}}"
        },
        {
          "name": "tipo",
          "value": "bot"
        }
      ]
    }
  }
}
```

### 6. Atualizar Lead no CRM
```json
{
  "name": "Atualizar Lead",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "PATCH",
    "url": "={{$env.CRM_API_URL}}/webhooks/n8n/leads/{{$json.leadId}}",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "X-API-KEY",
          "value": "={{$env.CRM_API_KEY}}"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "status",
          "value": "={{$json.qualificado ? 'qualificado' : 'em_qualificacao'}}"
        },
        {
          "name": "ultimaInteracao",
          "value": "={{new Date().toISOString()}}"
        }
      ]
    }
  }
}
```

## Exemplo de Uso

### Configuração no CRM

```json
{
  "templateName": "SDR",
  "automationName": "SDR Vendas Produto X",
  "variables": {
    "nomeEmpresa": "Tech Solutions LTDA",
    "horarioFuncionamento": "Segunda a Sexta, 8h às 18h",
    "departamentos": ["Vendas", "Suporte Técnico", "Financeiro"],
    "systemPrompt": "Você é um SDR da Tech Solutions LTDA...",
    "produtosServicos": "CRM Empresarial, Automação de Marketing, Chatbots com IA",
    "perguntasQualificacao": [
      "Quantos usuários precisam acessar o sistema?",
      "Qual o orçamento mensal disponível?",
      "Quando pretende iniciar?"
    ]
  }
}
```

### Teste

1. Envie mensagem via WhatsApp: "Olá, quero saber sobre o CRM"
2. O bot responde qualificando o lead
3. Continua a conversa naturalmente
4. Se qualificado, agenda reunião automaticamente

## Métricas

O template SDR rastreia:
- Número de conversas iniciadas
- Taxa de qualificação de leads
- Tempo médio de resposta
- Reuniões agendadas automaticamente
- Taxa de transferência para humanos

## Personalizações Avançadas

### Integração com Calendário

Adicione node para integrar com Google Calendar ou similar para agendamento automático de reuniões.

### Enriquecimento de Dados

Adicione nodes para enriquecer dados do lead com APIs externas (Clearbit, LinkedIn, etc).

### Score de Qualificação

Implemente sistema de pontuação baseado nas respostas do lead.

## Manutenção

- Revisar e atualizar `systemPrompt` mensalmente
- Analisar conversas para melhorar qualificação
- Ajustar horários de funcionamento conforme necessário
- Adicionar novos departamentos quando necessário

