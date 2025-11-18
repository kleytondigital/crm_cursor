# Variáveis de Ambiente para Integração N8N

Este documento descreve as variáveis de ambiente necessárias para a integração com o n8n.

## Variáveis Obrigatórias

### N8N_URL
- **Descrição**: URL base da instância do n8n
- **Formato**: `https://seu-n8n.com` (sem barra no final)
- **Exemplo**: `https://n8n.aoseudispor.com.br`
- **Padrão**: `http://localhost:5678`

### N8N_API_KEY
- **Descrição**: Chave de API do n8n para autenticação
- **Como obter**:
  1. Acesse seu n8n
  2. Vá em Settings > API
  3. Crie uma nova API key
  4. Copie a chave gerada
- **Exemplo**: `n8n_api_1234567890abcdef`
- **Padrão**: (vazio)

## Configuração no .env

Adicione as seguintes linhas ao seu arquivo `.env`:

```bash
# N8N Integration
N8N_URL=https://seu-n8n.com
N8N_API_KEY=sua-api-key-aqui
```

## Como Usar

### 1. Desenvolvimento Local

Para desenvolvimento local com n8n rodando na mesma máquina:

```bash
N8N_URL=http://localhost:5678
N8N_API_KEY=sua-api-key
```

### 2. Produção

Para produção, use a URL pública do seu n8n:

```bash
N8N_URL=https://n8n.seudominio.com
N8N_API_KEY=sua-api-key-de-producao
```

## Webhook URLs

O sistema automaticamente constrói URLs de webhooks no formato:

```
{N8N_URL}/webhook/{webhook-path-uuid}
```

Exemplo:
```
https://n8n.aoseudispor.com.br/webhook/a0b316a9-3e7b-40a4-828e-0a998b1f4908
```

## Segurança

⚠️ **IMPORTANTE:**
- Nunca commite o arquivo `.env` com credenciais reais
- Use API keys diferentes para desenvolvimento e produção
- Mantenha as API keys seguras e rotacione-as periodicamente
- Revogue imediatamente qualquer chave que seja exposta

## Troubleshooting

### Erro: "Erro ao criar workflow no n8n"

**Causa**: Credenciais inválidas ou URL incorreta

**Solução**:
1. Verifique se `N8N_URL` está correto e acessível
2. Confirme que `N8N_API_KEY` está válida
3. Teste a conexão: `curl -H "X-N8N-API-KEY: sua-key" https://seu-n8n.com/api/v1/workflows`

### Erro: "Webhook URL não foi gerado"

**Causa**: Workflow não tem nó de webhook

**Solução**: Certifique-se de que o template do workflow inclui pelo menos um nó do tipo `n8n-nodes-base.webhook`

## Referências

- [Documentação da API do n8n](https://docs.n8n.io/api/)
- [Guia de Integração N8N](../N8N_INTEGRATION.md)

