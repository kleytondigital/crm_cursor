# 🚀 FIX RÁPIDO: Duplicação de Mensagens

## 🎯 Problema

Mensagens enviadas pelo CRM aparecem **duplicadas** no frontend.

## ✅ Solução

Adicionar **1 node** no workflow n8n para enviar o `idMessage` do WhatsApp de volta para o CRM.

---

## 📦 O Que Fazer

### 1️⃣ Abrir n8n

Acesse: seu n8n → Workflow "Messages-send-crm"

### 2️⃣ Adicionar Node HTTP Request

**Onde:** Entre os nodes de envio (Send a text message, Send an image, etc) e o node "Tempid"

**Configuração Rápida:**

```
Nome: Send to CRM Webhook
Tipo: HTTP Request

Method: POST
URL: https://backcrm.aoseudispor.com.br/webhooks/waha

Headers:
  Content-Type: application/json

Body (JSON):
```

**Copie e cole este código no JSON Body:**

```javascript
{{ 
  {
    "senderFinal": $('Webhook').item.json.body.phone,
    "session": $('Webhook').item.json.body.session,
    "timestamp": $json.timestamp || Math.floor(Date.now() / 1000),
    "fromMe": true,
    "conversation": $('Webhook').item.json.body.text || $('Webhook').item.json.body.url || '',
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
    "profilePictureURL": null,
    "idMessage": $json.id || $json.messageId || null,
    "tempId": $('Webhook').item.json.body.tempId,
    "reply": "false",
    "replyto": {
      "id": null,
      "body": null
    }
  }
}}
```

### 3️⃣ Conectar Nodes

**Remova as conexões antigas:**
- ❌ `Send a text message` → `Tempid`
- ❌ `Send an image` → `Tempid`
- ❌ `Send a video` → `Tempid`
- ❌ `Send a file` → `Tempid`
- ❌ `Enviar Audio` → `Tempid`

**Adicione as novas conexões:**
- ✅ `Send a text message` → `Send to CRM Webhook`
- ✅ `Send an image` → `Send to CRM Webhook`
- ✅ `Send a video` → `Send to CRM Webhook`
- ✅ `Send a file` → `Send to CRM Webhook`
- ✅ `Enviar Audio` → `Send to CRM Webhook`
- ✅ `Send to CRM Webhook` → `Tempid`

### 4️⃣ Salvar e Testar

1. Salve o workflow
2. Ative o workflow (se não estiver ativo)
3. Envie uma mensagem pelo CRM
4. ✅ Confirme: **apenas 1 mensagem** no frontend!

---

## 🔍 Como Verificar se Funcionou

### Frontend:
- ✅ Aparece 1 mensagem com relógio ⏱️
- ✅ Muda para double check ✅✅
- ✅ **Não duplica!**

### Backend (logs):
```bash
docker logs <container-id> | grep "tempId recebida"
```

**Esperado:**
```
[WahaWebhookController] Mensagem com tempId recebida: 7a258c01-...
```

---

## 📊 Diagrama Simplificado

### ANTES (duplica):
```
WAHA processa → Responde ao CRM
                (sem chamar webhook WAHA)
                ❌ Mensagens duplicam
```

### DEPOIS (não duplica):
```
WAHA processa → Chama webhook WAHA com idMessage + tempId
                → Responde ao CRM
                ✅ Mensagem atualiza (não duplica)
```

---

## 🆘 Ajuda Rápida

### Ainda duplica?

1. **Verifique o node "Send to CRM Webhook":**
   - URL: `https://backcrm.aoseudispor.com.br/webhooks/waha`
   - Method: POST
   - Body inclui `"tempId": $('Webhook').item.json.body.tempId`

2. **Veja os logs do n8n:**
   - Vá em "Executions"
   - Abra a última execução
   - Verifique se o node "Send to CRM Webhook" foi executado

3. **Veja os logs do backend:**
   ```bash
   docker logs <container> --tail 50 | grep -E "tempId|WebSocket"
   ```

### Erro 404 no webhook?

- ✅ Confirme a URL: `https://backcrm.aoseudispor.com.br/webhooks/waha`
- ✅ Verifique se o backend está rodando: `docker ps`

### Timeout?

- Aumente o timeout no node:
  - Options → Timeout: `30000` (30 segundos)

---

## 📁 Documentação Completa

Se precisar de mais detalhes:

- `docs/SOLUCAO_DUPLICACAO_MENSAGENS.md` - Solução detalhada
- `docs/n8n-workflows/FIX_WORKFLOW_MESSAGES.md` - Guia completo
- `docs/n8n-workflows/VISUAL_FIX_GUIDE.md` - Guia visual
- `docs/n8n-workflows/node-send-to-crm-webhook.json` - Node pronto

---

## ✅ Resultado Final

**Antes do fix:**
```
😢 Mensagem 1 (otimista)
😢 Mensagem 2 (real)
= 2 mensagens (duplicadas!)
```

**Depois do fix:**
```
🎉 Mensagem 1 (atualizada)
= 1 mensagem apenas!
```

---

## 🎯 Resumo

1. ✅ Adicionar node HTTP Request no n8n
2. ✅ Configurar URL: `https://backcrm.aoseudispor.com.br/webhooks/waha`
3. ✅ Incluir `idMessage` e `tempId` no payload
4. ✅ Conectar nodes corretamente
5. ✅ Testar enviando mensagem
6. ✅ **Mensagens não duplicam mais!** 🎉

