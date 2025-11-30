# Payload JSON Esperado - Relatórios Meta Ads (n8n → CRM)

Esta documentação descreve o formato JSON que o n8n deve enviar para o endpoint de webhook de relatórios Meta Ads do CRM.

## Endpoint

```
POST /webhooks/ad-reports
```

## Autenticação

O endpoint requer autenticação via API Key global no header:

```
X-API-Key: <sua-api-key-global>
```

Para mais informações sobre criação de API Keys, consulte: [API_KEY_AUTHENTICATION.md](./API_KEY_AUTHENTICATION.md)

## Estrutura do Payload

```json
{
  "tenantId": "uuid-do-tenant",
  "adAccountId": "act_123456789",
  "dateStart": "2025-11-23T00:00:00.000Z",
  "dateEnd": "2025-11-30T23:59:59.999Z",
  "metrics": {
    "spend": 1500.50,
    "impressions": 125000,
    "reach": 98000,
    "clicks": 3500,
    "cpc": 0.43,
    "cpm": 12.00,
    "ctr": 0.028,
    "cpa": 25.50,
    "messages": 120,
    "costPerMessage": 12.50,
    "conversions": 50,
    "conversionRate": 0.014
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
      "name": "Anúncio - Produto A",
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
      "name": "Anúncio - Produto B",
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
```

## Campos Detalhados

### Nível Raiz

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `tenantId` | `string (UUID)` | Sim | ID do tenant no CRM |
| `adAccountId` | `string` | Sim | ID da conta de anúncio Meta (formato: `act_123456789`) |
| `dateStart` | `string (ISO 8601)` | Sim | Data/hora inicial do período (UTC) |
| `dateEnd` | `string (ISO 8601)` | Sim | Data/hora final do período (UTC) |
| `metrics` | `object` | Sim | Métricas agregadas do período |
| `timeline` | `array` | Sim | Array de métricas diárias |
| `adsBreakdown` | `array` | Sim | Breakdown por anúncio/criativo |

### Objeto `metrics` (Métricas Agregadas)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `spend` | `number` | Sim | Total investido no período (em moeda da conta) |
| `impressions` | `number` | Sim | Total de impressões |
| `reach` | `number` | Sim | Total de pessoas alcançadas |
| `clicks` | `number` | Sim | Total de cliques |
| `cpc` | `number` | Sim | Custo por clique (Cost Per Click) |
| `cpm` | `number` | Sim | Custo por mil impressões (Cost Per Mille) |
| `ctr` | `number` | Sim | Taxa de cliques (Click-Through Rate) - decimal (ex: 0.028 = 2.8%) |
| `cpa` | `number` | Sim | Custo por aquisição/conversão (Cost Per Acquisition) |
| `messages` | `number` | Sim | Total de mensagens recebidas atribuídas aos anúncios |
| `costPerMessage` | `number` | Sim | Custo por mensagem |
| `conversions` | `number` | Sim | Total de conversões |
| `conversionRate` | `number` | Sim | Taxa de conversão - decimal (ex: 0.014 = 1.4%) |

### Array `timeline` (Evolução Diária)

Cada item do array representa as métricas de um dia específico:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `date` | `string (ISO 8601)` | Sim | Data do dia (formato: `2025-11-23T00:00:00.000Z`) |
| `spend` | `number` | Sim | Investimento do dia |
| `impressions` | `number` | Sim | Impressões do dia |
| `clicks` | `number` | Sim | Cliques do dia |
| `messages` | `number` | Sim | Mensagens recebidas no dia |

**Nota:** O array `timeline` deve incluir um objeto para cada dia do período (de `dateStart` a `dateEnd`), mesmo que as métricas sejam zero.

### Array `adsBreakdown` (Breakdown por Anúncio)

Cada item do array representa as métricas de um anúncio/criativo específico:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `adId` | `string` | Sim | ID do anúncio na Meta |
| `name` | `string` | Sim | Nome do anúncio/criativo |
| `spend` | `number` | Sim | Investimento total do anúncio |
| `impressions` | `number` | Sim | Impressões do anúncio |
| `clicks` | `number` | Sim | Cliques do anúncio |
| `ctr` | `number` | Sim | Taxa de cliques - decimal (ex: 0.0267 = 2.67%) |
| `messages` | `number` | Sim | Mensagens recebidas atribuídas a este anúncio |
| `cpm` | `number` | Sim | Custo por mil impressões |
| `cpc` | `number` | Sim | Custo por clique |
| `cpa` | `number` | Sim | Custo por aquisição |

## Exemplo Completo

```json
{
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "adAccountId": "act_123456789",
  "dateStart": "2025-11-23T00:00:00.000Z",
  "dateEnd": "2025-11-30T23:59:59.999Z",
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
    },
    {
      "date": "2025-11-25T00:00:00.000Z",
      "spend": 180.50,
      "impressions": 14000,
      "clicks": 400,
      "messages": 12
    },
    {
      "date": "2025-11-26T00:00:00.000Z",
      "spend": 195.75,
      "impressions": 16000,
      "clicks": 480,
      "messages": 16
    },
    {
      "date": "2025-11-27T00:00:00.000Z",
      "spend": 210.25,
      "impressions": 17500,
      "clicks": 510,
      "messages": 17
    },
    {
      "date": "2025-11-28T00:00:00.000Z",
      "spend": 225.00,
      "impressions": 19000,
      "clicks": 540,
      "messages": 19
    },
    {
      "date": "2025-11-29T00:00:00.000Z",
      "spend": 160.00,
      "impressions": 13000,
      "clicks": 350,
      "messages": 11
    },
    {
      "date": "2025-11-30T00:00:00.000Z",
      "spend": 109.00,
      "impressions": 12500,
      "clicks": 250,
      "messages": 12
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
    },
    {
      "adId": "12345678901234569",
      "name": "Anúncio - Produto A - Versão 2",
      "spend": 400.50,
      "impressions": 35000,
      "clicks": 950,
      "ctr": 0.0271,
      "messages": 32,
      "cpm": 11.44,
      "cpc": 0.42,
      "cpa": 12.52
    },
    {
      "adId": "12345678901234570",
      "name": "Anúncio - Produto C",
      "spend": 299.00,
      "impressions": 15000,
      "clicks": 550,
      "ctr": 0.0367,
      "messages": 23,
      "cpm": 19.93,
      "cpc": 0.54,
      "cpa": 13.00
    }
  ]
}
```

## Resposta do Endpoint

### Sucesso (200)

```json
{
  "status": "ok",
  "reportId": "uuid-do-relatorio-criado",
  "message": "Relatório salvo com sucesso"
}
```

### Erro (400/404/500)

```json
{
  "statusCode": 400,
  "message": "Mensagem de erro descritiva",
  "timestamp": "2025-11-30T18:30:00.000Z",
  "path": "/webhooks/ad-reports"
}
```

## Notas Importantes

1. **Formato de Data**: Todas as datas devem estar no formato ISO 8601 (UTC): `YYYY-MM-DDTHH:mm:ss.sssZ`

2. **Moeda**: O campo `spend` deve usar a mesma moeda da conta de anúncio. O CRM não faz conversão de moedas.

3. **Taxas e Percentuais**: 
   - `ctr` e `conversionRate` devem ser valores decimais (0.028 = 2.8%, não 2.8)
   - O CRM exibirá como percentual no frontend

4. **Timeline Completa**: O array `timeline` deve incluir todos os dias do período, mesmo que não haja atividade (usar 0 para valores zero).

5. **Correlação com Mensagens**: O campo `messages` representa mensagens recebidas no CRM que foram correlacionadas com os anúncios através dos campos `adId`, `campaignId` ou `adsetId` nas mensagens.

6. **Idempotência**: O CRM faz upsert baseado em `tenantId`, `adAccountId`, `dateStart` e `dateEnd`. Enviar o mesmo payload novamente atualizará os dados existentes.

## Exemplo de cURL

```bash
curl -X POST https://seu-crm.com/webhooks/ad-reports \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-api-key-global" \
  -d '{
    "tenantId": "550e8400-e29b-41d4-a716-446655440000",
    "adAccountId": "act_123456789",
    "dateStart": "2025-11-23T00:00:00.000Z",
    "dateEnd": "2025-11-30T23:59:59.999Z",
    "metrics": {
      "spend": 1500.50,
      "impressions": 125000,
      "reach": 98000,
      "clicks": 3500,
      "cpc": 0.43,
      "cpm": 12.00,
      "ctr": 0.028,
      "cpa": 25.50,
      "messages": 120,
      "costPerMessage": 12.50,
      "conversions": 50,
      "conversionRate": 0.014
    },
    "timeline": [...],
    "adsBreakdown": [...]
  }'
```

## Fluxo de Integração n8n

1. **n8n busca métricas da Meta Marketing API** periodicamente (ex: a cada hora)
2. **n8n consulta mensagens no CRM** (via API) para correlacionar com anúncios
3. **n8n agrega e formata** os dados conforme este schema
4. **n8n envia POST** para `/webhooks/ad-reports` com autenticação API Key
5. **CRM salva os dados** no banco e disponibiliza no dashboard

Para mais informações sobre a integração completa, consulte a documentação principal de integrações sociais.

