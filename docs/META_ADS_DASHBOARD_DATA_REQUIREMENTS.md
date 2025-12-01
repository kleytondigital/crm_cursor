# Requisitos de Dados para Dashboard Meta Ads

Este documento lista os dados necessários para o dashboard de relatórios Meta Ads e quais campos podem estar faltando na resposta atual do webhook gestor.

## Dados Atualmente Disponíveis

A resposta do webhook `list_metricas` já retorna:

```json
{
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
    }
  ],
  "adsBreakdown": [...]
}
```

## Dados Faltantes (Opcionais para Melhorar Dashboard)

### 1. Revenue (Receita)

**Campo:** `revenue` ou `purchaseValue`

**Onde adicionar:**
- `metrics.revenue` (number): Receita total do período
- `timeline[].revenue` (number): Receita por dia

**Uso no dashboard:**
- KPI "Compras" (atualmente calculado como `conversions * cpa`)
- Gráfico temporal de compras
- Cálculo de ROAS mais preciso

**Como obter:**
- Meta Insights API: campo `purchase_value` ou `value` quando `action_type = purchase`
- Agregar: `sum(purchase_value)` ou `sum(value)` onde `action_type = 'purchase'`

---

### 2. Budget/Target (Orçado)

**Campos:** `budget`, `targetSpend`, `targetConversions`, `targetRevenue`

**Onde adicionar:**
```json
{
  "metrics": {
    "spend": 1500.50,
    "budget": 2000.00,
    "targetSpend": 2000.00,
    "targetConversions": 60,
    "targetRevenue": 18000.00
  }
}
```

**Uso no dashboard:**
- Comparação "vs Orçado" nos KPIs (atualmente mostra 0%)
- Indicadores de performance vs meta

**Como obter:**
- Meta Campaigns API: campo `daily_budget` ou `lifetime_budget` da campanha
- Ou configurar manualmente no CRM

---

### 3. Revenue por Plataforma (para gráfico temporal)

**Campo:** `timeline[].revenue` ou `timeline[].purchaseValue`

**Uso no dashboard:**
- Gráfico "Visão temporal de Compras" mostra compras por plataforma
- Atualmente só mostra Meta Ads (100%)

**Nota:** Se você só usa Meta Ads, isso não é necessário. O gráfico já funciona mostrando apenas Meta.

---

### 4. Conversions por Anúncio (para ranking)

**Campo:** `adsBreakdown[].conversions` ou `adsBreakdown[].purchases`

**Onde adicionar:**
```json
{
  "adsBreakdown": [
    {
      "adId": "12345678901234567",
      "name": "Anúncio - Produto A",
      "spend": 500.25,
      "conversions": 40,
      "purchases": 40,
      "revenue": 1200.00
    }
  ]
}
```

**Uso no dashboard:**
- Ranking "Melhores Ads" (atualmente calculado como `spend / cpa`)
- Mais preciso mostrar conversões reais

**Como obter:**
- Meta Insights API: campo `actions` com `action_type = 'purchase'` ou `action_type = 'offsite_conversion'`
- Agregar por `ad_id`

---

### 5. Reach por Dia (para timeline)

**Campo:** `timeline[].reach`

**Onde adicionar:**
```json
{
  "timeline": [
    {
      "date": "2025-11-23T00:00:00.000Z",
      "spend": 200.00,
      "impressions": 15000,
      "reach": 12000,
      "clicks": 450,
      "messages": 15
    }
  ]
}
```

**Uso no dashboard:**
- Funil de conversão mais preciso
- Análise de alcance diário

**Como obter:**
- Meta Insights API: campo `reach` já disponível, apenas precisa ser incluído na timeline

---

## Prioridade de Implementação

### Alta Prioridade (Melhora Significativa)
1. ✅ **Revenue** - Essencial para KPIs de Compras e ROAS preciso
2. ✅ **Conversions por Anúncio** - Melhora ranking de melhores ads

### Média Prioridade (Melhora Visual)
3. ⚠️ **Budget/Target** - Melhora comparação vs orçado (pode ser configurado no CRM)
4. ⚠️ **Reach na Timeline** - Melhora funil (já temos no metrics, só falta na timeline)

### Baixa Prioridade (Opcional)
5. ℹ️ **Revenue por Plataforma** - Só necessário se usar múltiplas plataformas além de Meta

---

## Exemplo de Resposta Completa (Ideal)

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
      "conversionRate": 0.0142857,
      "revenue": 15000.00,
      "budget": 2000.00,
      "targetSpend": 2000.00,
      "targetConversions": 60,
      "targetRevenue": 18000.00
    },
    "timeline": [
      {
        "date": "2025-11-23T00:00:00.000Z",
        "spend": 200.00,
        "impressions": 15000,
        "reach": 12000,
        "clicks": 450,
        "messages": 15,
        "conversions": 5,
        "revenue": 1500.00
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
        "conversions": 40,
        "revenue": 1200.00,
        "cpm": 11.12,
        "cpc": 0.42,
        "cpa": 12.51
      }
    ]
  }
}
```

---

## Como Adicionar no n8n

### Para Revenue:
```javascript
// No n8n, após buscar insights da Meta API
const insights = $json.data;

// Adicionar revenue agregando purchase_value
const revenue = insights
  .filter(item => item.actions)
  .flatMap(item => item.actions)
  .filter(action => action.action_type === 'purchase' || action.action_type === 'offsite_conversion')
  .reduce((sum, action) => sum + (action.value || 0), 0);

// Adicionar ao metrics
metrics.revenue = revenue;
```

### Para Conversions por Anúncio:
```javascript
// No breakdown por anúncio
adBreakdown.forEach(ad => {
  const conversions = ad.actions
    ?.filter(action => action.action_type === 'purchase' || action.action_type === 'offsite_conversion')
    .reduce((sum, action) => sum + (action.value || 0), 0) || 0;
  
  ad.conversions = conversions;
  ad.revenue = ad.actions
    ?.filter(action => action.action_type === 'purchase')
    .reduce((sum, action) => sum + (action.value || 0), 0) || 0;
});
```

---

## Notas

- O dashboard **funciona** com os dados atuais, mas alguns cálculos são estimados
- Revenue é o campo mais importante para melhorar a precisão
- Budget pode ser configurado no CRM se não vier da API
- O gráfico temporal funciona mesmo sem dados de Google/TikTok (mostra só Meta)

