# 🤖 Configuração de Prompt do Agente

Este documento explica como usar a funcionalidade de criação e ajuste de prompts estruturados para agentes de IA nas automações.

## 📋 Visão Geral

A funcionalidade permite criar e ajustar prompts de agentes de IA através de um webhook especialista (`N8N_WEBHOOK_CREATE_PROMPT`) que utiliza inteligência artificial para gerar prompts estruturados e otimizados.

## 🔧 Configuração Necessária

### Variável de Ambiente

Adicione ao `.env` do backend:

```env
# Webhook especialista em criação de prompts estruturados
N8N_WEBHOOK_CREATE_PROMPT=https://seu-n8n.com/webhook/create-prompt
# ou para desenvolvimento local:
N8N_WEBHOOK_CREATE_PROMPT=http://localhost:5678/webhook/create-prompt
```

## 📊 Funcionalidades

### 1. Criar Prompt (type=system)

Cria um prompt do zero a partir das variáveis da automação.

**Payload enviado ao webhook:**
```json
{
  "type": "system",
  "variables": [
    { "name": "nomeEmpresa", "value": "Minha Empresa" },
    { "name": "setor", "value": "Vendas" },
    { "name": "tipoAtendimento", "value": "Suporte Técnico" }
  ]
}
```

**Resposta esperada do webhook:**
```json
{
  "prompt": "Você é um assistente virtual de atendimento da Minha Empresa, especializado em Suporte Técnico no setor de Vendas..."
}
```

### 2. Ajustar Prompt (type=user)

Ajusta um prompt existente com base em uma solicitação de melhoria.

**Payload enviado ao webhook:**
```json
{
  "type": "user",
  "prompt_ajuste": "Você é um assistente virtual...",
  "text_ajuste": "Torne o prompt mais formal e adicione instruções sobre como tratar clientes insatisfeitos"
}
```

**Resposta esperada do webhook:**
```json
{
  "prompt": "Você é um assistente virtual profissional e formal da Minha Empresa... Quando encontrar clientes insatisfeitos, siga estas diretrizes..."
}
```

## 🚀 Como Usar

### Acessar o Formulário

1. Acesse a página de **Automações**: `http://localhost:3000/automacoes`
2. Na aba **"Minhas Automações"**, encontre a automação desejada
3. Clique no botão de **Configurações** (ícone de engrenagem) 🛠️
4. O modal de **Configuração de Prompt do Agente** será aberto

### Criar um Novo Prompt

1. No modal, selecione a aba **"Criar Prompt"**
2. As variáveis serão preenchidas automaticamente com os valores da configuração da automação
3. (Opcional) Edite os valores das variáveis se necessário
4. Clique em **"Criar Prompt"**
5. O prompt será gerado pelo webhook especialista e salvo automaticamente
6. Use o botão **"Visualizar"** para ver o prompt gerado

### Ajustar um Prompt Existente

1. No modal, selecione a aba **"Ajustar Prompt"**
2. O prompt atual será exibido no campo "Prompt Atual para Ajustar"
3. No campo **"Solicitação de Ajuste"**, descreva como deseja ajustar:
   - Exemplo: "Torne o prompt mais formal"
   - Exemplo: "Adicione instruções sobre como tratar clientes insatisfeitos"
   - Exemplo: "Remova referências a preços e adicione foco em suporte técnico"
4. Clique em **"Ajustar Prompt"**
5. O prompt ajustado será gerado e salvo automaticamente
6. Use o botão **"Visualizar"** para ver o prompt ajustado

### Limpar Prompt

- Clique no botão **"Limpar Prompt"** para remover o prompt gerado
- Isso não remove a automação, apenas o prompt associado

## 🔐 Permissões

- **Qualquer usuário autenticado** pode criar e ajustar prompts
- O prompt é salvo com **isolamento de tenant** (cada empresa vê apenas seus próprios prompts)

## 🗄️ Armazenamento

O prompt gerado é salvo no banco de dados no campo `generatedPrompt` da tabela `workflow_instances`:

```sql
-- Estrutura no banco
workflow_instances
  ├── id
  ├── name
  ├── config (JSON com variáveis)
  ├── generatedPrompt (TEXT) ← Prompt gerado pelo webhook
  ├── tenantId (isolamento)
  └── ...
```

## 📡 Endpoints da API

### POST `/workflow-templates/instances/:id/prompt`

Criar ou ajustar prompt do agente.

**Body:**
```json
{
  "type": "system" | "user",
  "variables": [...],        // Obrigatório se type=system
  "prompt_ajuste": "...",    // Obrigatório se type=user
  "text_ajuste": "..."       // Obrigatório se type=user
}
```

**Response:**
```json
{
  "prompt": "Prompt gerado...",
  "instance": { ... }
}
```

### GET `/workflow-templates/instances/:id/prompt`

Obter prompt gerado da instância.

**Response:**
```json
{
  "prompt": "Prompt gerado..." | null
}
```

### DELETE `/workflow-templates/instances/:id/prompt`

Limpar prompt gerado da instância.

**Response:**
```
204 No Content
```

## 🔗 Integração com Webhook N8N

### Requisitos do Webhook

O webhook `N8N_WEBHOOK_CREATE_PROMPT` deve:

1. **Aceitar POST requests** com o formato abaixo
2. **Retornar JSON** com o campo `prompt`

### Exemplo de Workflow N8N

**Trigger:** Webhook (POST)

**Node 1: Webhook**
- Method: POST
- Path: `/webhook/create-prompt`
- Response Mode: Respond to Webhook

**Node 2: IF (type check)**
- Condition: `{{ $json.type === "system" }}`

**Node 3a: Criar Prompt (type=system)**
- Use as variáveis recebidas
- Gere prompt estruturado
- Retorne: `{ "prompt": "..." }`

**Node 3b: Ajustar Prompt (type=user)**
- Use `prompt_ajuste` e `text_ajuste`
- Ajuste o prompt conforme solicitado
- Retorne: `{ "prompt": "..." }`

**Node 4: Response**
```json
{
  "prompt": "{{ $json.prompt }}"
}
```

## 🧪 Testando

### Teste 1: Criar Prompt do Zero

1. Acesse `/automacoes`
2. Clique em Configurações em uma automação
3. Selecione "Criar Prompt"
4. Clique em "Criar Prompt"
5. Verifique o prompt gerado

### Teste 2: Ajustar Prompt Existente

1. Acesse `/automacoes`
2. Clique em Configurações em uma automação que já tenha prompt
3. Selecione "Ajustar Prompt"
4. Digite uma solicitação de ajuste (ex: "Torne mais formal")
5. Clique em "Ajustar Prompt"
6. Verifique o prompt ajustado

## ⚠️ Troubleshooting

### Erro: "N8N_WEBHOOK_CREATE_PROMPT não configurado"

**Solução:** Verifique se a variável está no `.env` do backend

### Erro: "Webhook não retornou prompt válido"

**Solução:** 
1. Verifique se o webhook está retornando `{ "prompt": "..." }`
2. Verifique os logs do n8n
3. Certifique-se de que o webhook não está retornando erro

### Erro: "Erro ao criar/ajustar prompt"

**Solução:**
1. Verifique se o webhook está acessível
2. Verifique se o timeout está adequado (60 segundos)
3. Verifique os logs do backend

### Prompt não aparece após criar

**Solução:**
1. Recarregue a página de automações
2. Verifique se o prompt foi salvo no banco de dados
3. Verifique se há erros no console do navegador

## 📚 Próximos Passos

Após criar/ajustar o prompt:

1. O prompt fica disponível na instância da automação
2. O prompt pode ser usado pela automação quando ativada
3. O prompt pode ser ajustado quantas vezes for necessário até ficar ideal
4. O prompt é único por tenant (isolamento garantido)

---

**Dúvidas?** Consulte a documentação do webhook N8N ou entre em contato com o time de desenvolvimento.

