# 📡 Formato de Resposta do Webhook (n8n → CRM)

## 📋 Visão Geral

Este documento descreve o formato que o webhook do n8n deve retornar para o CRM após processar uma mensagem enviada.

---

## 🚀 Fluxo Completo

```
1. Frontend → Backend CRM
   POST /messages/send
   {
     conversationId: "uuid",
     senderType: "USER",
     contentType: "TEXT",
     contentText: "Olá!",
     tempId: "temp-uuid-123" // ← IMPORTANTE!
   }

2. Backend CRM → n8n
   POST https://seu-n8n.com/webhook/send-message
   {
     session: "default",
     phone: "5511999999999",
     type: "text",
     text: "Olá!",
     tempId: "temp-uuid-123" // ← IMPORTANTE!
   }

3. n8n → WAHA
   POST https://waha.com/api/sendText
   {
     session: "default",
     chatId: "5511999999999@c.us",
     text: "Olá!"
   }

4. WAHA → n8n (Resposta)
   {
     "id": "true_5511999999999@c.us_3EB0XXXXX",
     "timestamp": 1700000000,
     "from": "5511888888888@c.us",
     "fromMe": true,
     "body": "Olá!",
     "hasMedia": false,
     // ... outros campos
   }

5. n8n → Backend CRM (Webhook message.sent)
   POST https://seu-crm.com/webhooks/waha/message.sent
   {
     event: "message.sent",
     session: "default",
     payload: {
       id: "true_5511999999999@c.us_3EB0XXXXX",
       timestamp: 1700000000,
       from: "5511888888888@c.us",
       fromMe: true,
       body: "Olá!",
       tempId: "temp-uuid-123" // ← IMPORTANTE! Incluir no payload
     }
   }
```

---

## 📤 Payload Enviado (CRM → n8n)

### Estrutura Base

```json
{
  "session": "string",        // Nome da sessão WAHA
  "phone": "string",          // Telefone do destinatário (5511999999999)
  "type": "string",           // Tipo: text, image, audio, video, document
  "text": "string?",          // Texto (obrigatório para text/document)
  "url": "string?",           // URL da mídia (obrigatório para image/audio/video)
  "mimetype": "string?",      // MIME type da mídia
  "filename": "string?",      // Nome do arquivo
  "tempId": "string?",        // ← ID temporário para correlação
  "action": "string?",        // reply, edit, delete
  "replyTo": "string?"        // ID da mensagem para responder
}
```

### Exemplos por Tipo

#### Mensagem de Texto
```json
{
  "session": "default",
  "phone": "5511999999999",
  "type": "text",
  "text": "Olá, tudo bem?",
  "tempId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Mensagem com Imagem
```json
{
  "session": "default",
  "phone": "5511999999999",
  "type": "image",
  "url": "https://crm.com/uploads/image.jpg",
  "mimetype": "image/jpeg",
  "filename": "foto.jpg",
  "tempId": "550e8400-e29b-41d4-a716-446655440001"
}
```

#### Mensagem de Áudio
```json
{
  "session": "default",
  "phone": "5511999999999",
  "type": "audio",
  "url": "https://crm.com/uploads/audio.ogg",
  "mimetype": "audio/ogg",
  "filename": "audio.ogg",
  "tempId": "550e8400-e29b-41d4-a716-446655440002"
}
```

#### Resposta (Reply)
```json
{
  "session": "default",
  "phone": "5511999999999",
  "type": "text",
  "text": "Entendi!",
  "action": "reply",
  "replyTo": "true_5511999999999@c.us_3EB0XXXXX",
  "tempId": "550e8400-e29b-41d4-a716-446655440003"
}
```

---

## 📥 Resposta Esperada (n8n → CRM via Webhook)

### Formato Padronizado

O n8n deve enviar um webhook de volta para o CRM no endpoint:

```
POST https://seu-crm.com/webhooks/waha/message.sent
```

### Estrutura da Resposta

```json
{
  "event": "message.sent",
  "session": "default",
  "payload": {
    "id": "true_5511999999999@c.us_3EB0XXXXX",
    "timestamp": 1700000000,
    "from": "5511888888888@c.us",
    "to": "5511999999999@c.us",
    "fromMe": true,
    "body": "Texto da mensagem",
    "type": "chat",
    "hasMedia": false,
    "tempId": "550e8400-e29b-41d4-a716-446655440000",  // ← CRUCIAL!
    
    // Para mensagens com mídia
    "mediaUrl": "https://waha.com/api/files/xxx.jpg",
    "mimetype": "image/jpeg",
    "filename": "foto.jpg",
    
    // Para respostas (replies)
    "quotedMsg": {
      "id": "false_5511999999999@c.us_3EB0YYYYY",
      "body": "Mensagem original"
    }
  }
}
```

### Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `event` | string | Sempre "message.sent" |
| `session` | string | Nome da sessão |
| `payload.id` | string | ID do WhatsApp (messageId) |
| `payload.timestamp` | number | Unix timestamp |
| `payload.from` | string | Remetente |
| `payload.to` | string | Destinatário |
| `payload.fromMe` | boolean | Se é mensagem enviada |
| `payload.body` | string | Texto da mensagem |
| **`payload.tempId`** | string | **ID temporário (CRUCIAL!)** |

---

## 🔧 Implementação no n8n

### Workflow no n8n

```
┌─────────────────┐
│ Webhook Trigger │ ← Recebe do CRM
│ /send-message   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract tempId  │ ← Guardar tempId em variável
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HTTP Request    │ ← Enviar para WAHA
│ → WAHA API      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Set Variables   │ ← Adicionar tempId na resposta
│ + tempId        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HTTP Request    │ ← Enviar resposta para CRM
│ → CRM Webhook   │
└─────────────────┘
```

### Exemplo de Código no n8n

**Node "Extract tempId":**
```javascript
// Guardar tempId do payload recebido
const tempId = $input.item.json.tempId;

return {
  tempId: tempId,
  ...($input.item.json)
};
```

**Node "HTTP Request → WAHA":**
```javascript
// Configurar request para WAHA
const payload = {
  session: $input.item.json.session,
  chatId: `${$input.item.json.phone}@c.us`,
};

// Adicionar campos conforme tipo
switch ($input.item.json.type) {
  case 'text':
    payload.text = $input.item.json.text;
    break;
  case 'image':
  case 'audio':
  case 'video':
  case 'document':
    payload.file = {
      url: $input.item.json.url,
      mimetype: $input.item.json.mimetype,
      filename: $input.item.json.filename
    };
    break;
}

return [{ json: payload }];
```

**Node "Set Response with tempId":**
```javascript
// Combinar resposta do WAHA com tempId
const wahaResponse = $input.item.json;
const tempId = $node["Extract tempId"].json.tempId;

return {
  event: 'message.sent',
  session: $node["Extract tempId"].json.session,
  payload: {
    id: wahaResponse.id,
    timestamp: wahaResponse.timestamp,
    from: wahaResponse.from,
    to: wahaResponse.to,
    fromMe: true,
    body: wahaResponse.body,
    type: wahaResponse.type,
    hasMedia: wahaResponse.hasMedia || false,
    tempId: tempId, // ← IMPORTANTE!
    
    // Campos opcionais de mídia
    ...(wahaResponse.mediaUrl && {
      mediaUrl: wahaResponse.mediaUrl,
      mimetype: wahaResponse.mimetype,
      filename: wahaResponse.filename
    }),
    
    // Campos opcionais de resposta
    ...(wahaResponse.quotedMsg && {
      quotedMsg: wahaResponse.quotedMsg
    })
  }
};
```

**Node "HTTP Request → CRM":**
```
Method: POST
URL: https://seu-crm.com/webhooks/waha/message.sent
Body: {{ $json }}
Headers:
  Content-Type: application/json
  x-api-key: sua-api-key-aqui
```

---

## ✅ Validação

### Como Testar

1. **Enviar mensagem do frontend:**
```javascript
await messagesAPI.send({
  conversationId: "uuid",
  senderType: "USER",
  contentType: "TEXT",
  contentText: "Teste",
  tempId: "test-123"
});
```

2. **Verificar logs do n8n:**
- Webhook recebeu tempId? ✓
- WAHA retornou sucesso? ✓
- Webhook enviou de volta com tempId? ✓

3. **Verificar no CRM:**
- Mensagem substituiu a otimista? ✓
- Não há duplicação? ✓
- Status mudou de "sending" para confirmado? ✓

### Debug no Backend CRM

```typescript
// Em waha-webhook.controller.ts
console.log('[WEBHOOK] Mensagem recebida:', payload);
console.log('[WEBHOOK] tempId presente?', payload.tempId);
```

---

## 🚨 Tratamento de Erros

### Erro no WAHA

Se o WAHA retornar erro, o n8n deve enviar:

```json
{
  "event": "message.error",
  "session": "default",
  "payload": {
    "tempId": "550e8400-e29b-41d4-a716-446655440000",
    "error": {
      "code": "WAHA_ERROR",
      "message": "Sessão não conectada",
      "details": "..."
    }
  }
}
```

### Timeout

Se o envio demorar muito:

```json
{
  "event": "message.error",
  "session": "default",
  "payload": {
    "tempId": "550e8400-e29b-41d4-a716-446655440000",
    "error": {
      "code": "TIMEOUT",
      "message": "Timeout ao enviar mensagem"
    }
  }
}
```

---

## 📚 Referências

- **Endpoint CRM:** `POST /messages/send`
- **Webhook n8n:** `POST /webhooks/waha/message.sent`
- **Documentação WAHA:** https://waha.devlike.pro/docs/how-to/send-messages/

---

## 🔑 Pontos Cruciais

1. ⚠️ **SEMPRE incluir `tempId` no payload enviado para o n8n**
2. ⚠️ **SEMPRE retornar `tempId` na resposta do webhook**
3. ⚠️ O `tempId` é gerado no frontend e mantido em todo o fluxo
4. ⚠️ O CRM usa `tempId` para correlacionar mensagem otimista com mensagem confirmada
5. ⚠️ Sem `tempId`, haverá duplicação de mensagens

---

**Última atualização:** 2025-01-18  
**Versão:** 1.0  
**Status:** ✅ Implementado

