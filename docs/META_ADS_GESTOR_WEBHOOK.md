# Webhook Gestor Meta Ads (n8n)

Esta documentação descreve o formato de requisições e respostas esperadas do webhook gestor Meta Ads do n8n.

## Configuração

O webhook gestor deve ser configurado no `.env`:

```
N8N_WEBHOOK_GESTOR_META=https://seu-n8n.com/webhook/meta-ads-gestor
```

## Endpoint

O CRM chama o webhook gestor via `POST` com diferentes ações (`action`) no body.

## Estrutura da Requisição

Todas as requisições seguem o mesmo formato base:

```json
{
  "action": "list_contas" | "list_campanhas" | "list_metricas",
  "tenantId": "uuid-do-tenant",
  "connectionId": "uuid-da-conexao",
  "userAccessToken": "EAAxxxxxxxxxxxxx",
  // Campos adicionais dependendo da ação
}
```

**IMPORTANTE:** O `userAccessToken` é sempre enviado na requisição. É o token de acesso do usuário (user access token) necessário para acessar as contas de anúncio via Meta Marketing API. O CRM busca automaticamente este token da conexão antes de chamar o webhook.

## Ações Disponíveis

### 1. `list_contas` - Listar Contas de Anúncio

**Requisição:**

```json
{
  "action": "list_contas",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "connectionId": "123e4567-e89b-12d3-a456-426614174000",
  "userAccessToken": "EAAxxxxxxxxxxxxx"
}
```

**Resposta Esperada:**

```json
{
  "success": true,
  "data": [
    {
      "id": "act_123456789",
      "account_id": "123456789",
      "name": "Minha Conta de Anúncios",
      "currency": "BRL",
      "account_status": 1,
      "business": {
        "id": "123456789012345",
        "name": "Minha Empresa"
      }
    },
    {
      "id": "act_987654321",
      "account_id": "987654321",
      "name": "Conta de Anúncios 2",
      "currency": "USD",
      "account_status": 1,
      "business": {
        "id": "987654321098765",
        "name": "Outra Empresa"
      }
    }
  ]
}
```

**Campos da Resposta:**
- `id` (string, obrigatório): ID da conta de anúncio (formato: `act_123456789`)
- `account_id` (string, obrigatório): ID numérico da conta
- `name` (string, obrigatório): Nome da conta
- `currency` (string, obrigatório): Moeda da conta (ex: `BRL`, `USD`)
- `account_status` (number, obrigatório): Status da conta (1 = ativa, outros valores = inativa)
- `business` (object, opcional): Informações do negócio
  - `id` (string): ID do negócio
  - `name` (string): Nome do negócio

---

### 2. `list_campanhas` - Listar Campanhas

**Requisição:**

```json
{
  "action": "list_campanhas",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "connectionId": "123e4567-e89b-12d3-a456-426614174000",
  "adAccountId": "act_123456789",
  "userAccessToken": "EAAxxxxxxxxxxxxx"
}
```

**Resposta Esperada:**

```json
{
  "success": true,
  "data": [
    {
      "id": "12345678901234567",
      "name": "Campanha - Produto A",
      "status": "ACTIVE",
      "objective": "MESSAGES",
      "created_time": "2025-11-01T10:00:00+0000",
      "updated_time": "2025-11-30T18:00:00+0000",
      "start_time": "2025-11-01T00:00:00+0000",
      "stop_time": null
    },
    {
      "id": "12345678901234568",
      "name": "Campanha - Produto B",
      "status": "PAUSED",
      "objective": "CONVERSIONS",
      "created_time": "2025-11-15T10:00:00+0000",
      "updated_time": "2025-11-29T12:00:00+0000",
      "start_time": "2025-11-15T00:00:00+0000",
      "stop_time": null
    }
  ]
}
```

**Campos da Resposta:**
- `id` (string, obrigatório): ID da campanha
- `name` (string, obrigatório): Nome da campanha
- `status` (string, obrigatório): Status da campanha (`ACTIVE`, `PAUSED`, `ARCHIVED`, `DELETED`)
- `objective` (string, obrigatório): Objetivo da campanha (`MESSAGES`, `CONVERSIONS`, `TRAFFIC`, etc.)
- `created_time` (string, obrigatório): Data de criação (ISO 8601)
- `updated_time` (string, obrigatório): Data de última atualização (ISO 8601)
- `start_time` (string, opcional): Data de início (ISO 8601)
- `stop_time` (string, opcional): Data de término (ISO 8601, `null` se não houver)

---

### 3. `list_metricas` - Listar Métricas

**Requisição:**

```json
{
  "action": "list_metricas",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "connectionId": "123e4567-e89b-12d3-a456-426614174000",
  "adAccountId": "act_123456789",
  "dateStart": "2025-11-23T00:00:00.000Z",
  "dateEnd": "2025-11-30T23:59:59.999Z",
  "userAccessToken": "EAAxxxxxxxxxxxxx",
  "campaignId": "12345678901234567",
  "adsetId": "12345678901234568",
  "adId": "12345678901234569"
}
```

**Nota:** `campaignId`, `adsetId` e `adId` são opcionais. Se não fornecidos, retorna métricas agregadas da conta.

**Resposta Esperada:**

```json
{
  "success": true,
  "data": {
    "metrics": {
      "spend": 1500.50,
      "impressions": 125000,
      "reach": 98000,
      "clicks": 3500,
      "cpc": 0.4287,
      "cpm": 12.004,
      "ctr": 0.028,
      "cpa": 30.01,
      "messages": 120,
      "costPerMessage": 12.5042,
      "conversions": 50,
      "conversionRate": 0.0142857
    },
    "timeline": [
      {
        "date": "2025-11-23T00:00:00.000Z",
        "spend": 200.00,
        "impressions": 15000,
        "clicks": 450,
        "messages": 15
      },
      {
        "date": "2025-11-24T00:00:00.000Z",
        "spend": 220.00,
        "impressions": 18000,
        "clicks": 520,
        "messages": 18
      }
    ],
    "adsBreakdown": [
      {
        "adId": "12345678901234567",
        "name": "Anúncio - Produto A - Versão 1",
        "spend": 500.25,
        "impressions": 45000,
        "clicks": 1200,
        "ctr": 0.0267,
        "messages": 40,
        "cpm": 11.12,
        "cpc": 0.42,
        "cpa": 12.51
      },
      {
        "adId": "12345678901234568",
        "name": "Anúncio - Produto B - Versão 1",
        "spend": 300.75,
        "impressions": 30000,
        "clicks": 800,
        "ctr": 0.0267,
        "messages": 25,
        "cpm": 10.03,
        "cpc": 0.38,
        "cpa": 12.03
      }
    ]
  }
}
```

**Campos da Resposta:**

**`metrics` (objeto):**
- `spend` (number): Total investido no período
- `impressions` (number): Total de impressões
- `reach` (number): Total de pessoas alcançadas
- `clicks` (number): Total de cliques
- `cpc` (number): Custo por clique
- `cpm` (number): Custo por mil impressões
- `ctr` (number): Taxa de cliques (decimal, ex: 0.028 = 2.8%)
- `cpa` (number): Custo por aquisição
- `messages` (number): Total de mensagens recebidas
- `costPerMessage` (number): Custo por mensagem
- `conversions` (number): Total de conversões
- `conversionRate` (number): Taxa de conversão (decimal, ex: 0.014 = 1.4%)

**`timeline` (array):**
- Array de objetos com métricas diárias
- Cada objeto contém:
  - `date` (string, ISO 8601): Data do dia
  - `spend` (number): Investimento do dia
  - `impressions` (number): Impressões do dia
  - `clicks` (number): Cliques do dia
  - `messages` (number): Mensagens do dia

**`adsBreakdown` (array):**
- Array de objetos com métricas por anúncio
- Cada objeto contém:
  - `adId` (string): ID do anúncio
  - `name` (string): Nome do anúncio/criativo
  - `spend` (number): Investimento total
  - `impressions` (number): Impressões
  - `clicks` (number): Cliques
  - `ctr` (number): Taxa de cliques (decimal)
  - `messages` (number): Mensagens recebidas
  - `cpm` (number): Custo por mil impressões
  - `cpc` (number): Custo por clique
  - `cpa` (number): Custo por aquisição

---

## Tratamento de Erros

**Resposta de Erro:**

```json
{
  "success": false,
  "error": "Mensagem de erro descritiva"
}
```

**Exemplos de Erros:**

```json
{
  "success": false,
  "error": "Token de acesso inválido ou expirado"
}
```

```json
{
  "success": false,
  "error": "Conta de anúncio não encontrada"
}
```

```json
{
  "success": false,
  "error": "Erro ao buscar métricas da Meta API: Rate limit exceeded"
}
```

---

## Token de Acesso

O `userAccessToken` é enviado automaticamente pelo CRM em todas as requisições. Não é necessário que o n8n consulte o CRM para obter o token - ele já vem no body da requisição.

**Uso no n8n:**

No primeiro node após o webhook, você pode acessar o token diretamente:

```javascript
// No n8n, acesse o token do body
const userAccessToken = $json.body.userAccessToken;

// Use o token para chamar a Meta Marketing API
const response = await axios.get('https://graph.facebook.com/v21.0/me/adaccounts', {
  params: {
    access_token: userAccessToken,
    fields: 'id,account_id,name,currency,account_status,business{id,name}'
  }
});
```

**Nota:** O token enviado é o user access token com escopo `ads_read` necessário para acessar as contas de anúncio via Meta Marketing API.

---

## Notas Importantes

1. **Timeout**: O CRM espera resposta do webhook em até 30 segundos.

2. **Formato de Data**: Todas as datas devem estar no formato ISO 8601 (UTC).

3. **Moeda**: O campo `currency` deve usar códigos ISO 4217 (ex: `BRL`, `USD`).

4. **Taxas e Percentuais**: `ctr` e `conversionRate` devem ser valores decimais (0.028 = 2.8%, não 2.8).

5. **Timeline Completa**: O array `timeline` deve incluir todos os dias do período, mesmo que não haja atividade (usar 0 para valores zero).

6. **Idempotência**: O webhook pode ser chamado múltiplas vezes com os mesmos parâmetros. Garanta que a resposta seja consistente.

7. **Cache**: O n8n pode implementar cache para reduzir chamadas à Meta API, mas deve respeitar a validade dos dados.

---

## Exemplo de Fluxo n8n

### Para `list_contas`:

1. Receber requisição do CRM
2. Extrair `userAccessToken` do body (`$json.body.userAccessToken`)
3. Chamar Meta Marketing API: `GET /me/adaccounts?access_token={userAccessToken}`
4. Formatar resposta conforme schema acima
5. Retornar JSON para o CRM

**Exemplo de código n8n:**

```javascript
// Extrair token do body
const userAccessToken = $json.body.userAccessToken;

// Chamar Meta API
const response = await axios.get('https://graph.facebook.com/v21.0/me/adaccounts', {
  params: {
    access_token: userAccessToken,
    fields: 'id,account_id,name,currency,account_status,business{id,name}'
  }
});

// Formatar resposta
return {
  success: true,
  data: response.data.data
};
```

### Para `list_campanhas`:

1. Receber requisição do CRM
2. Extrair `userAccessToken` e `adAccountId` do body
3. Chamar Meta Marketing API: `GET /{adAccountId}/campaigns?access_token={userAccessToken}`
4. Formatar resposta conforme schema acima
5. Retornar JSON para o CRM

### Para `list_metricas`:

1. Receber requisição do CRM
2. Extrair todos os parâmetros do body (incluindo `userAccessToken`, filtros opcionais)
3. Chamar Meta Marketing API com os campos necessários:
   - `GET /{adAccountId}/insights?access_token={userAccessToken}&date_preset=last_7d&fields=spend,impressions,reach,clicks,ctr,cpc,cpm`
4. Processar e agregar dados
5. Correlacionar mensagens (se necessário)
6. Formatar resposta conforme schema acima
7. Retornar JSON para o CRM

---

## Autenticação

O webhook gestor pode implementar autenticação adicional (API Key, HMAC, etc.) se necessário. O CRM não envia autenticação no body, apenas os dados da requisição.

Se você precisar validar que a requisição vem do CRM, pode:
- Verificar o IP de origem
- Implementar autenticação via header (ex: `X-API-Key`)
- Usar HTTPS e validar certificados

---

## Suporte

Para dúvidas ou problemas, consulte a documentação principal do CRM ou entre em contato com a equipe de desenvolvimento.

