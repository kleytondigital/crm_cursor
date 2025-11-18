# Variáveis de Ambiente para Integração N8N

Este documento descreve as variáveis de ambiente necessárias para a integração com o n8n via Webhook Gestor.

## Nova Arquitetura com Webhook Gestor

A partir de agora, o CRM não se comunica diretamente com a API do n8n. Ao invés disso, todas as operações são feitas através de um **Webhook Gestor** que orquestra a criação e gestão dos workflows.

## Variáveis Obrigatórias

### N8N_MANAGER_WEBHOOK_URL
- **Descrição**: URL do webhook gestor no n8n
- **Formato**: `https://seu-n8n.com/webhook/manager-crm`
- **Exemplo**: `https://n8n.aoseudispor.com.br/webhook/manager-crm`
- **Padrão**: `http://localhost:5678/webhook/manager-crm`

## Configuração no .env

Adicione a seguinte linha ao seu arquivo `.env`:

```bash
# N8N Integration (via Webhook Gestor)
N8N_MANAGER_WEBHOOK_URL=https://seu-n8n.com/webhook/manager-crm
```

## Variáveis Removidas

As seguintes variáveis **não são mais necessárias**:
- ~~`N8N_URL`~~ (substituída por `N8N_MANAGER_WEBHOOK_URL`)
- ~~`N8N_API_KEY`~~ (não é mais necessária, a API key fica apenas no n8n)

## Como Usar

### 1. Desenvolvimento Local

Para desenvolvimento local com n8n rodando na mesma máquina:

```bash
N8N_MANAGER_WEBHOOK_URL=http://localhost:5678/webhook/manager-crm
```

### 2. Produção

Para produção, use a URL pública do seu n8n:

```bash
N8N_MANAGER_WEBHOOK_URL=https://n8n.seudominio.com/webhook/manager-crm
```

## Como Funciona

1. **CRM envia requisição** para o webhook gestor com action e dados
2. **Webhook gestor processa** a requisição no n8n
3. **N8N cria/atualiza/deleta** o workflow conforme necessário
4. **Webhook gestor retorna** os dados (workflowId, webhookUrl, etc)
5. **CRM salva** os dados retornados no banco

## Exemplo de Requisição

```json
{
  "action": "create",
  "tenantId": "uuid-do-tenant",
  "templateName": "SDR",
  "automationName": "SDR Vendas 2024",
  "variables": {
    "nomeEmpresa": "Minha Empresa",
    "horarioFuncionamento": "8h-18h",
    "systemPrompt": "Você é um SDR..."
  }
}
```

## Exemplo de Resposta

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

## Segurança

⚠️ **IMPORTANTE:**
- O webhook gestor deve ter autenticação configurada no n8n
- Nunca commite o arquivo `.env` com URLs reais
- O webhook gestor tem acesso à API key do n8n internamente
- Configure rate limiting no webhook gestor para evitar abuso

## Troubleshooting

### Erro: "Erro ao comunicar com webhook gestor do n8n"

**Causa**: Webhook gestor não está acessível ou não existe

**Solução**:
1. Verifique se `N8N_MANAGER_WEBHOOK_URL` está correto
2. Confirme que o webhook gestor está criado e ativo no n8n
3. Teste a conexão: `curl -X POST https://seu-n8n.com/webhook/manager-crm`

### Erro: "Webhook gestor não retornou dados"

**Causa**: Erro no processamento dentro do n8n

**Solução**: 
1. Verifique os logs de execução do workflow gestor no n8n
2. Confirme que todos os nodes estão configurados corretamente
3. Valide o JSON de resposta do webhook gestor

## Referências

- [Guia do Webhook Gestor](./N8N_WEBHOOK_MANAGER.md)
- [Guia de Integração N8N](../N8N_INTEGRATION.md)

