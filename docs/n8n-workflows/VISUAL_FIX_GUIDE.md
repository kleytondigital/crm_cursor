# 🎨 Guia Visual: Fix de Duplicação de Mensagens

## 🔄 Fluxo Completo (Antes x Depois)

### ❌ ANTES (Atual - Mensagens Duplicadas)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Frontend envia mensagem "teste"                              │
│    tempId: "7a258c01-19d2-4e59-b66d-01cf417c43e2"              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Backend (/messages/send)                                     │
│    - Cria mensagem otimista no banco                            │
│    - Emite via WebSocket (mensagem #1) ⏱️                       │
│    - Chama n8n webhook                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. n8n Workflow                                                 │
│    - Recebe payload com tempId                                  │
│    - Envia para WAHA                                            │
│    - WAHA responde: idMessage: "3EB0..."                        │
│    - ❌ NÃO chama /webhooks/waha                                │
│    - Responde ao CRM: { success: true, tempId }                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. WAHA envia webhook direto para /webhooks/waha               │
│    - ❌ SEM tempId no payload                                   │
│    - Backend cria NOVA mensagem (mensagem #2) ✅✅              │
│    - Emite via WebSocket                                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Frontend                                                     │
│    - ❌ Mostra 2 mensagens (duplicadas!)                        │
│    - Mensagem #1: tempId, sem messageId ⏱️                      │
│    - Mensagem #2: com messageId, sem tempId ✅✅                │
└─────────────────────────────────────────────────────────────────┘
```

---

### ✅ DEPOIS (Corrigido - Sem Duplicação)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Frontend envia mensagem "teste"                              │
│    tempId: "7a258c01-19d2-4e59-b66d-01cf417c43e2"              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Backend (/messages/send)                                     │
│    - Cria mensagem otimista no banco com tempId                 │
│    - Emite via WebSocket (mensagem #1) ⏱️                       │
│    - Chama n8n webhook                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. n8n Workflow                                                 │
│    - Recebe payload com tempId                                  │
│    - Envia para WAHA                                            │
│    - WAHA responde: idMessage: "3EB0..."                        │
│    - ✅ CHAMA /webhooks/waha com idMessage + tempId             │
│    - Responde ao CRM: { success: true, tempId }                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Backend (/webhooks/waha)                                     │
│    - Recebe: { idMessage: "3EB0...", tempId: "7a258..." }      │
│    - ✅ Encontra mensagem pelo tempId                           │
│    - ✅ Atualiza com messageId                                  │
│    - Emite via WebSocket (ATUALIZA mensagem #1)                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Frontend                                                     │
│    - ✅ Encontra mensagem otimista pelo tempId                  │
│    - ✅ Substitui (não duplica!)                                │
│    - ✅ Mostra 1 mensagem apenas ✅✅                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Modificação no n8n (Passo a Passo)

### Estrutura Atual do Workflow

```
Webhook
  ↓
Switch (tipo: text/audio/imagem/video/documento)
  ↓
┌────────────────┬────────────────┬──────────────┬─────────────┬──────────────┐
│ Send a text    │ Send an image  │ Send a video │ Send a file │ Enviar Audio │
└────────────────┴────────────────┴──────────────┴─────────────┴──────────────┘
  ↓                ↓                ↓              ↓             ↓
  └────────────────┴────────────────┴──────────────┴─────────────┘
                            ↓
                        Tempid
                            ↓
                  Respond to Webhook
```

### Estrutura Corrigida (Adicionar Merge Node)

```
Webhook
  ↓
Switch (tipo: text/audio/imagem/video/documento)
  ↓
┌────────────────┬────────────────┬──────────────┬─────────────┬──────────────┐
│ Send a text    │ Send an image  │ Send a video │ Send a file │ Enviar Audio │
└────────────────┴────────────────┴──────────────┴─────────────┴──────────────┘
  ↓                ↓                ↓              ↓             ↓
  └────────────────┴────────────────┴──────────────┴─────────────┘
                            ↓
              ✨ NOVO: Merge Node (unir todas as saídas)
                            ↓
              ✨ NOVO: Send to CRM Webhook
                            ↓
                        Tempid
                            ↓
                  Respond to Webhook
```

---

## 📋 Implementação Detalhada

### Passo 1: Adicionar Merge Node

**Por quê?** Para unificar todas as saídas dos nodes de envio (texto, imagem, áudio, etc) em um único fluxo.

1. Adicione um node **Merge**
2. Mode: **Append**
3. Conecte TODOS os nodes de envio a este Merge:
   - `Send a text message` → `Merge`
   - `Send an image` → `Merge`
   - `Send a video` → `Merge`
   - `Send a file` → `Merge`
   - `Enviar Audio` → `Merge`

**Configuração:**
```json
{
  "mode": "append"
}
```

### Passo 2: Adicionar "Send to CRM Webhook" Node

**Tipo:** HTTP Request

**Configuração Completa:**

```json
{
  "parameters": {
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
    "jsonBody": "={{ \n  {\n    \"senderFinal\": $('Webhook').item.json.body.phone,\n    \"session\": $('Webhook').item.json.body.session,\n    \"timestamp\": $json.timestamp || Math.floor(Date.now() / 1000),\n    \"fromMe\": true,\n    \"conversation\": $('Webhook').item.json.body.text || $('Webhook').item.json.body.url || '',\n    \"hasMedia\": ['imagem', 'audio', 'video', 'documento'].includes($('Webhook').item.json.body.type),\n    \"pushName\": null,\n    \"media\": {\n      \"url\": $('Webhook').item.json.body.url || null,\n      \"mimetype\": $('Webhook').item.json.body.mimetype || null\n    },\n    \"locationMessage\": {\n      \"latitude\": null,\n      \"longitude\": null,\n      \"name\": null,\n      \"URL\": null,\n      \"JPEGThumbnail\": null\n    },\n    \"idMessage\": $json.id,\n    \"tempId\": $('Webhook').item.json.body.tempId,\n    \"reply\": \"false\",\n    \"replyto\": {\n      \"id\": null,\n      \"body\": null\n    }\n  }\n}}",
    "options": {
      "timeout": 10000
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [2400, -256],
  "id": "send-to-crm-webhook",
  "name": "Send to CRM Webhook"
}
```

### Passo 3: Conectar Nodes

```
Merge
  ↓
Send to CRM Webhook
  ↓
Tempid
  ↓
Respond to Webhook
```

### Passo 4: Remover Conexões Antigas

**IMPORTANTE:** Remova as conexões diretas dos nodes de envio para o "Tempid":

❌ Remover:
- `Send a text message` → `Tempid` (conexão antiga)
- `Send an image` → `Tempid` (conexão antiga)
- Etc...

✅ Novo fluxo:
- Todos nodes de envio → `Merge` → `Send to CRM Webhook` → `Tempid`

---

## 🧪 Teste Completo

### 1. Teste Manual (n8n)

1. Abra o workflow no n8n
2. Clique em "Execute Workflow"
3. Use o payload de teste:

```json
{
  "session": "B2X7Y93VN",
  "phone": "556296724968@c.us",
  "type": "text",
  "text": "teste fix duplicação",
  "url": null,
  "tempId": "test-manual-fix-123"
}
```

4. Verifique que o node "Send to CRM Webhook" é executado
5. Confirme que a requisição POST para `/webhooks/waha` é feita

### 2. Teste Real (CRM)

1. Envie uma mensagem pelo CRM
2. Abra DevTools → Network
3. Veja a requisição para `/messages/send`
4. Veja a requisição WebSocket receber a mensagem
5. ✅ Confirme que aparece **1 mensagem apenas**

### 3. Verificar Logs Backend

```bash
docker logs <container-id> --tail 50 | grep -E "tempId|WebSocket"
```

**Esperado:**
```
[MessagesService] Mensagem encaminhada ao N8N
[WahaWebhookController] Mensagem com tempId recebida: test-manual-fix-123
[WahaWebhookController] Lead atualizado
[WahaWebhookController] Criando mensagem no banco de dados
[MessagesGateway] Mensagem emitida via WebSocket
```

---

## ⚙️ Troubleshooting

### Problema: Node "Send to CRM Webhook" não executa

**Solução:** Verifique que o Merge está conectado corretamente

### Problema: Erro 404 no webhook

**Solução:** Confirme a URL: `https://backcrm.aoseudispor.com.br/webhooks/waha`

### Problema: Mensagens ainda duplicam

**Causa:** O `tempId` não está chegando ao webhook

**Solução:** Verifique o payload no node "Send to CRM Webhook":
- `"tempId": $('Webhook').item.json.body.tempId` deve retornar o tempId correto

### Problema: Erro "Cannot read property 'id' of undefined"

**Causa:** O WAHA não retornou `id` na resposta

**Solução:** Adicione fallback:
```javascript
"idMessage": $json.id || $json.messageId || null
```

---

## 📊 Checklist Final

- [ ] Node "Merge" adicionado e conectado a todos nodes de envio
- [ ] Node "Send to CRM Webhook" configurado com URL correta
- [ ] JSON Body inclui `idMessage` e `tempId`
- [ ] Conexões antigas (envio → Tempid) removidas
- [ ] Workflow ativado
- [ ] Teste manual executado com sucesso
- [ ] Teste real pelo CRM sem duplicação
- [ ] Logs do backend mostram "tempId recebida"

---

## 🎯 Resultado Esperado

### Frontend (DevTools - Network)

```
POST /messages/send
Response: {
  "id": "12bfeddb-...",
  "tempId": "7a258c01-...",
  "messageId": null,  // Ainda null na resposta do /messages/send
  ...
}
```

### Frontend (DevTools - WebSocket)

```
Mensagem 1 (otimista):
{
  "id": "12bfeddb-...",
  "tempId": "7a258c01-...",
  "messageId": null,
  "status": "sending"
}

Mensagem 1 (atualizada via WebSocket):
{
  "id": "12bfeddb-...",
  "tempId": "7a258c01-...",
  "messageId": "3EB0105B8A0A88D7E36BD4",  // ✅ Agora tem!
  "status": "sent"
}
```

### Backend (Logs)

```
[MessagesService] Mensagem encaminhada ao N8N
[WahaWebhookController] Mensagem com tempId recebida: 7a258c01-...
[WahaWebhookController] Mensagem criada com sucesso. ID: 12bfeddb-...
[MessagesGateway] Mensagem emitida via WebSocket
```

✅ **1 mensagem apenas no frontend!**

