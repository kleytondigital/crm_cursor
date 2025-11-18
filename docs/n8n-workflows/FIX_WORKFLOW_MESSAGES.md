# 🔧 Fix para Workflow Messages-send-crm

## 🐛 Problema Identificado

O workflow atual:
- ✅ Recebe payload do CRM com `tempId`
- ✅ Envia para WAHA
- ✅ Responde ao CRM com `{ success: true, tempId }`
- ❌ **NÃO envia de volta para o webhook WAHA do CRM com o `idMessage` do WhatsApp**

## 🎯 Solução

Adicionar um **HTTP Request node** após cada node de envio para notificar o CRM webhook WAHA com os dados completos da mensagem.

---

## 📦 Node a Adicionar: "Send to CRM Webhook"

### Configuração do Node HTTP Request

**Nome:** `Send to CRM Webhook`

**Tipo:** `HTTP Request`

**Posição:** Entre os nodes de envio (Send a text message, Send an image, etc) e o node "Tempid"

### Parâmetros:

```json
{
  "method": "POST",
  "url": "https://backcrm.aoseudispor.com.br/webhooks/waha",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      }
    ]
  },
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "={{ \n  {\n    \"senderFinal\": $('Webhook').item.json.body.phone,\n    \"session\": $('Webhook').item.json.body.session,\n    \"timestamp\": $json.timestamp || Math.floor(Date.now() / 1000),\n    \"fromMe\": true,\n    \"conversation\": $('Webhook').item.json.body.text || '',\n    \"hasMedia\": ['imagem', 'audio', 'video', 'documento'].includes($('Webhook').item.json.body.type),\n    \"pushName\": null,\n    \"media\": {\n      \"url\": $('Webhook').item.json.body.url || null,\n      \"mimetype\": $('Webhook').item.json.body.mimetype || null\n    },\n    \"locationMessage\": {\n      \"latitude\": null,\n      \"longitude\": null,\n      \"name\": null,\n      \"URL\": null,\n      \"JPEGThumbnail\": null\n    },\n    \"idMessage\": $json.id,\n    \"tempId\": $('Webhook').item.json.body.tempId,\n    \"reply\": \"false\",\n    \"replyto\": {\n      \"id\": null,\n      \"body\": null\n    }\n  }\n}}",
  "options": {}
}
```

---

## 🔀 Fluxo Correto

### ANTES (Atual - com duplicação):

```
Webhook
  ↓
Switch (determina tipo)
  ↓
Send a text message / Send an image / etc (WAHA responde com idMessage)
  ↓
Tempid (prepara resposta)
  ↓
Respond to Webhook (responde ao CRM)
```

**Resultado:** CRM não recebe o `idMessage`, cria mensagem duplicada ❌

### DEPOIS (Corrigido - sem duplicação):

```
Webhook
  ↓
Switch (determina tipo)
  ↓
Send a text message / Send an image / etc (WAHA responde com idMessage)
  ↓
*** NOVO NODE: Send to CRM Webhook (envia para /webhooks/waha) ***
  ↓
Tempid (prepara resposta)
  ↓
Respond to Webhook (responde ao CRM)
```

**Resultado:** CRM recebe o `idMessage`, atualiza mensagem otimista, sem duplicação ✅

---

## 🛠️ Passos para Implementar

### 1. Adicionar Node "Send to CRM Webhook"

1. Abra o workflow no n8n
2. Clique em **+** entre "Send a text message" e "Tempid"
3. Adicione um node **HTTP Request**
4. Nomeie como **"Send to CRM Webhook"**
5. Configure conforme os parâmetros acima

### 2. Código do Node (JSON Body)

```javascript
{{
  {
    "senderFinal": $('Webhook').item.json.body.phone,
    "session": $('Webhook').item.json.body.session,
    "timestamp": $json.timestamp || Math.floor(Date.now() / 1000),
    "fromMe": true,
    "conversation": $('Webhook').item.json.body.text || '',
    "hasMedia": ['imagem', 'audio', 'video', 'documento'].includes($('Webhook').item.json.body.type),
    "pushName": null,
    "media": {
      "url": $('Webhook').item.json.body.url || null,
      "mimetype": $('Webhook').item.json.body.mimetype || null
    },
    "locationMessage": {
      "latitude": null,
      "longitude": null,
      "name": null,
      "URL": null,
      "JPEGThumbnail": null
    },
    "idMessage": $json.id,
    "tempId": $('Webhook').item.json.body.tempId,
    "reply": "false",
    "replyto": {
      "id": null,
      "body": null
    }
  }
}}
```

### 3. Conectar Nodes

Você precisa conectar **CADA** node de envio ao novo node "Send to CRM Webhook":

- `Send a text message` → `Send to CRM Webhook` → `Tempid`
- `Send an image` → `Send to CRM Webhook` → `Tempid`
- `Send a video` → `Send to CRM Webhook` → `Tempid`
- `Send a file` → `Send to CRM Webhook` → `Tempid`
- `Enviar Audio` → `Send to CRM Webhook` → `Tempid`

### 4. Ativar Workflow

- Salve as mudanças
- Ative o workflow
- Teste enviando uma mensagem

---

## 🧪 Testar o Fix

### 1. Enviar mensagem pelo CRM

```
Frontend (CRM) envia mensagem "teste"
  ↓
Backend cria mensagem otimista com tempId
  ↓
Backend chama n8n webhook
  ↓
n8n envia para WAHA
  ↓
WAHA responde com idMessage: "3EB0105B8A0A88D7E36BD4"
  ↓
n8n chama /webhooks/waha do CRM com:
  {
    "idMessage": "3EB0105B8A0A88D7E36BD4",
    "tempId": "7a258c01-19d2-4e59-b66d-01cf417c43e2",
    ...
  }
  ↓
Backend atualiza mensagem com idMessage
  ↓
Frontend substitui mensagem otimista
```

### 2. Verificar Logs do Backend

```bash
docker logs <container-id> | grep "tempId recebida"
```

**Esperado:**
```
[WahaWebhookController] Mensagem com tempId recebida: 7a258c01-19d2-4e59-b66d-01cf417c43e2
```

### 3. Verificar Frontend

- ✅ Mensagem aparece com relógio ⏱️ (otimista)
- ✅ Relógio muda para double check ✅✅
- ✅ **Apenas 1 mensagem** (não duplica!)

---

## 📊 Payload Esperado no Webhook WAHA

```json
{
  "senderFinal": "556296724968@c.us",
  "session": "B2X7Y93VN",
  "timestamp": 1763475024,
  "fromMe": true,
  "conversation": "teste",
  "hasMedia": false,
  "pushName": null,
  "media": {
    "url": null,
    "mimetype": null
  },
  "locationMessage": {
    "latitude": null,
    "longitude": null,
    "name": null,
    "URL": null,
    "JPEGThumbnail": null
  },
  "idMessage": "3EB0105B8A0A88D7E36BD4",
  "tempId": "7a258c01-19d2-4e59-b66d-01cf417c43e2",
  "reply": "false",
  "replyto": {
    "id": null,
    "body": null
  }
}
```

---

## ⚠️ Importante

- O `idMessage` vem da **resposta do WAHA** (`$json.id`)
- O `tempId` vem do **payload original do CRM** (`$('Webhook').item.json.body.tempId`)
- O node "Send to CRM Webhook" deve ser **assíncrono** (não bloqueia a resposta ao CRM)
- O node "Tempid" continua respondendo `{ success: true, tempId }` ao CRM (resposta síncrona)

---

## 🎯 Resumo

**O que mudou:**
- Adicionamos um node HTTP Request para chamar `/webhooks/waha` do CRM
- Este node inclui o `idMessage` do WhatsApp e o `tempId` original
- O backend atualiza a mensagem ao invés de criar uma nova
- Frontend substitui a mensagem otimista pela real

**Resultado:**
- ✅ Mensagens não duplicam mais
- ✅ Status visual correto (loading → enviado)
- ✅ `messageId` do WhatsApp salvo no banco

