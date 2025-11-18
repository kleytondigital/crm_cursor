# 🎯 Solução: Duplicação de Mensagens

## 🐛 Raiz do Problema

Seu workflow do n8n **não está enviando o `idMessage` de volta para o CRM**.

### O que acontece:

1. ✅ CRM cria mensagem otimista com `tempId`
2. ✅ n8n recebe e envia para WAHA
3. ✅ WAHA processa e retorna `idMessage` do WhatsApp
4. ❌ **n8n responde ao CRM mas NÃO envia para o webhook WAHA**
5. ❌ Backend não consegue atualizar a mensagem otimista
6. ❌ Mensagem duplica no frontend

---

## ✅ Solução Rápida

Adicione **1 node HTTP Request** no seu workflow n8n para chamar o webhook WAHA do CRM.

### 📦 Node a Adicionar

**Nome:** `Send to CRM Webhook`  
**Tipo:** `HTTP Request`  
**Posição:** Depois dos nodes de envio (Send a text message, Send an image, etc) e antes do node "Tempid"

### Configuração:

```
Method: POST
URL: https://backcrm.aoseudispor.com.br/webhooks/waha

Headers:
  Content-Type: application/json

Body (JSON):
```

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

---

## 🔀 Fluxo Correto

### Antes (duplica):

```
Send a text message → Tempid → Respond to Webhook
```

### Depois (não duplica):

```
Send a text message → Send to CRM Webhook → Tempid → Respond to Webhook
```

---

## 📋 Passo a Passo

### 1. Abrir Workflow no n8n

1. Acesse seu n8n
2. Abra o workflow "Messages-send-crm"
3. Clique para editar

### 2. Adicionar Node HTTP Request

1. Clique no **+** depois do node "Send a text message"
2. Procure por **HTTP Request**
3. Adicione o node
4. Renomeie para **"Send to CRM Webhook"**

### 3. Configurar o Node

**Method:** POST  
**URL:** `https://backcrm.aoseudispor.com.br/webhooks/waha`

**Authentication:** None

**Send Headers:** ✅ Enabled  
- Header 1: `Content-Type` = `application/json`

**Send Body:** ✅ Enabled  
**Body Content Type:** JSON

**JSON Body:** Cole o código acima (do bloco JavaScript)

**Options → Timeout:** 10000 (10 segundos)

### 4. Conectar Nodes

Você precisa conectar CADA node de envio ao novo node:

```
Send a text message     → Send to CRM Webhook
Send an image           → Send to CRM Webhook
Send a video            → Send to CRM Webhook
Send a file             → Send to CRM Webhook
Enviar Audio            → Send to CRM Webhook
Edits a message         → Send to CRM Webhook
Deletes a message       → Send to CRM Webhook
Archive the chat        → Send to CRM Webhook
Unarchive the chat      → Send to CRM Webhook
```

Depois conecte:

```
Send to CRM Webhook → Tempid → Respond to Webhook
```

### 5. Remover Conexões Antigas

❌ **Remova** as conexões diretas dos nodes de envio para o "Tempid":

- `Send a text message` → `Tempid` (remover)
- `Send an image` → `Tempid` (remover)
- `Send a video` → `Tempid` (remover)
- etc...

✅ **Agora deve ser:**

- Todos nodes de envio → `Send to CRM Webhook` → `Tempid`

### 6. Salvar e Ativar

1. Clique em **Save**
2. Clique em **Active** (se não estiver ativo)
3. Pronto!

---

## 🧪 Teste

### 1. Enviar Mensagem pelo CRM

1. Abra o CRM
2. Envie uma mensagem de teste: "teste fix duplicação"
3. Observe o frontend

### 2. Resultado Esperado

✅ **1 mensagem apenas** (não duplica!)
- Aparece com relógio ⏱️ (enviando)
- Muda para double check ✅✅ (enviado)

### 3. Verificar Logs Backend

```bash
docker logs <seu-container-id> | grep "tempId"
```

**Esperado:**
```
[WahaWebhookController] Mensagem com tempId recebida: 7a258c01-...
```

Se aparecer essa linha, significa que o fix funcionou! ✅

---

## ⚠️ Pontos Importantes

1. **`idMessage`** vem da resposta do WAHA (`$json.id`)
2. **`tempId`** vem do payload original do CRM (`$('Webhook').item.json.body.tempId`)
3. O node "Send to CRM Webhook" é **assíncrono** (não bloqueia a resposta)
4. O node "Tempid" continua respondendo `{ success: true, tempId }` normalmente

---

## 🎯 Campos Cruciais no Payload

### Obrigatórios:

- ✅ `idMessage`: ID da mensagem do WhatsApp (do WAHA)
- ✅ `tempId`: ID temporário (do CRM)
- ✅ `senderFinal`: Telefone do destinatário
- ✅ `session`: Nome da sessão WAHA
- ✅ `fromMe`: true (mensagem enviada pelo CRM)

### Opcionais (mas recomendados):

- `timestamp`: Unix timestamp
- `conversation`: Texto da mensagem
- `hasMedia`: true/false
- `media.url`, `media.mimetype`: Para mídias

---

## 📊 Debug

### Problema: Mensagens ainda duplicam

**Causa:** O `tempId` não está chegando ao webhook

**Solução:**
1. Verifique no n8n se o node "Send to CRM Webhook" está executando
2. Veja os logs do n8n (executions)
3. Confirme que o payload inclui `tempId`

### Problema: Erro 500 no webhook

**Causa:** Payload malformado

**Solução:**
1. Veja os logs do backend: `docker logs <container>`
2. Verifique se todos os campos obrigatórios estão presentes

### Problema: Timeout

**Causa:** Webhook WAHA demorou muito

**Solução:**
1. Aumente o timeout no node: `Options → Timeout: 30000` (30s)
2. Verifique se o backend está respondendo: `curl https://backcrm.aoseudispor.com.br/health`

---

## 📁 Arquivos de Referência

- `docs/n8n-workflows/FIX_WORKFLOW_MESSAGES.md` - Guia detalhado
- `docs/n8n-workflows/VISUAL_FIX_GUIDE.md` - Guia visual completo
- `docs/n8n-workflows/node-send-to-crm-webhook.json` - Node pronto para importar
- `docs/WEBHOOK_RESPONSE_FORMAT.md` - Formato esperado do payload

---

## ✅ Checklist

- [ ] Node "Send to CRM Webhook" adicionado
- [ ] URL configurada: `https://backcrm.aoseudispor.com.br/webhooks/waha`
- [ ] JSON Body inclui `idMessage` e `tempId`
- [ ] Todos nodes de envio conectados ao novo node
- [ ] Conexões antigas (envio → Tempid) removidas
- [ ] Workflow salvo e ativado
- [ ] Teste enviando mensagem pelo CRM
- [ ] ✅ Apenas 1 mensagem aparece (sem duplicação!)

---

## 🎉 Resultado Final

**Antes:** 😢
```
Mensagem 1: ⏱️ (otimista, sem messageId)
Mensagem 2: ✅✅ (real, sem tempId)
```

**Depois:** 🎉
```
Mensagem 1: ⏱️ → ✅✅ (atualizada, com messageId e tempId)
```

**1 mensagem apenas!** ✨

