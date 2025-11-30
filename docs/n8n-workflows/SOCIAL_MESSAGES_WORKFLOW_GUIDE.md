# Guia Prático - Configuração de Workflows n8n para Instagram e Facebook

Este guia fornece instruções passo a passo para configurar os workflows do n8n que integram mensagens do Instagram e Facebook com o CRM.

---

## 📋 Pré-requisitos

1. **n8n instalado e configurado**
2. **Acesso ao Meta Developer Console** (para configurar webhooks)
3. **URLs do CRM disponíveis:**
   - `{CRM_URL}/webhooks/social` - Receber mensagens
   - `{CRM_URL}/webhooks/social/message.sent` - Confirmar mensagens enviadas
4. **Variáveis de ambiente configuradas:**
   - `CRM_WEBHOOK_URL`
   - `CRM_MESSAGE_SENT_URL`
   - `WEBHOOK_SOCIAL_SECRET` (para assinatura HMAC)

---

## 🔄 Workflow 1: Receber Mensagens do Meta

### Objetivo

Receber mensagens do Instagram/Facebook e encaminhar para o CRM.

### Passo 1: Criar Webhook Trigger

1. No n8n, crie um novo workflow
2. Adicione um node **"Webhook"**
3. Configure:
   - **HTTP Method:** `POST`
   - **Path:** `/webhook/instagram` ou `/webhook/facebook`
   - **Response Mode:** `Using 'Respond to Webhook' Node`
   - **Response Code:** `200`
   - **Response Headers:** (opcional)
     ```json
     {
       "X-Content-Type-Options": "nosniff"
     }
     ```

4. **Salve o workflow** e copie a URL do webhook (ex: `https://seu-n8n.com/webhook/instagram`)

### Passo 2: Configurar Webhook no Meta Developer Console

1. Acesse [Meta Developer Console](https://developers.facebook.com/)
2. Selecione seu app
3. Vá em **Webhooks**
4. Clique em **"Add Callback URL"**
5. Cole a URL do n8n
6. Configure os eventos:
   - **Instagram:** `instagram.messages`
   - **Facebook:** `messages`
7. Salve e verifique o webhook (Meta enviará uma requisição de verificação)

### Passo 3: Processar Payload do Meta

1. Adicione um node **"Code"** após o Webhook
2. Configure para normalizar o payload:

```javascript
// Código para normalizar payload do Instagram
const entry = $input.item.json.entry;
const messaging = entry[0]?.messaging || entry[0]?.messaging || [];

if (messaging.length === 0) {
  return [];
}

const results = [];

for (const message of messaging) {
  const messageData = message.message || {};
  const sender = message.sender?.id;
  const recipient = message.recipient?.id;
  
  // Extrair tipo de mensagem
  let messageType = 'text';
  let mediaUrl = null;
  let mediaMimeType = null;
  
  if (messageData.attachments && messageData.attachments.length > 0) {
    const attachment = messageData.attachments[0];
    messageType = attachment.type; // image, video, audio, file
    mediaUrl = attachment.payload?.url;
    mediaMimeType = attachment.payload?.mime_type;
  }
  
  // Extrair tenantId e connectionId do contexto
  // IMPORTANTE: Estes devem vir da configuração da conexão
  // Você pode armazenar em variável de ambiente ou buscar do CRM
  const tenantId = $env.TENANT_ID; // Ajustar conforme necessário
  const connectionId = $env.CONNECTION_ID; // Ajustar conforme necessário
  
  results.push({
    tenantId: tenantId,
    connectionId: connectionId,
    provider: 'INSTAGRAM', // ou 'FACEBOOK'
    message: {
      id: messageData.mid || messageData.id,
      from: {
        id: sender,
        name: messageData.sender_name || null,
        picture: messageData.sender_profile_picture || null
      },
      text: messageData.text || null,
      type: messageType,
      mediaUrl: mediaUrl,
      mediaMimeType: mediaMimeType,
      timestamp: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString(),
      isFromMe: false
    }
  });
}

return results;
```

### Passo 4: Enviar para CRM

1. Adicione um node **"HTTP Request"**
2. Configure:
   - **Method:** `POST`
   - **URL:** `{{ $env.CRM_WEBHOOK_URL }}`
   - **Authentication:** None (ou Basic se necessário)
   - **Body:** `JSON`
   - **JSON Body:**
   ```json
   {{ $json }}
   ```
   - **Headers:**
     ```json
     {
       "Content-Type": "application/json",
       "x-n8n-signature": "{{ $generateSignature() }}"
     }
     ```

3. **Gerar Assinatura HMAC:**
   - Adicione um node **"Function"** antes do HTTP Request para gerar assinatura:
   ```javascript
   const crypto = require('crypto');
   
   const secret = $env.WEBHOOK_SOCIAL_SECRET;
   const payload = JSON.stringify($input.item.json);
   const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
   
   return {
     ...$input.item.json,
     _signature: signature
   };
   ```
   - Use `{{ $json._signature }}` no header

### Passo 5: Responder ao Meta

1. Adicione um node **"Respond to Webhook"**
2. Configure:
   - **Respond With:** `JSON`
   - **Response Body:**
   ```json
   {
     "status": "ok"
   }
   ```

### Estrutura Final do Workflow

```
[Webhook] → [Code: Normalizar] → [Function: Assinatura] → [HTTP Request: CRM] → [Respond to Webhook]
```

---

## 📤 Workflow 2: Enviar Mensagens para o Meta

### Objetivo

Receber mensagem do CRM e enviar para Instagram/Facebook via Meta Graph API.

### Passo 1: Criar Webhook Trigger

1. Crie um novo workflow
2. Adicione um node **"Webhook"**
3. Configure:
   - **HTTP Method:** `POST`
   - **Path:** `/webhook/send-social-message`
   - **Response Mode:** `Last Node`

### Passo 2: Buscar Token de Acesso

1. Adicione um node **"HTTP Request"** para buscar token do CRM:
   - **Method:** `GET`
   - **URL:** `https://seu-crm.com/api/connections/social/{{ $json.connectionId }}`
   - **Headers:**
     ```json
     {
       "Authorization": "Bearer {{ $env.CRM_API_TOKEN }}"
     }
     ```

2. **OU** armazenar token no n8n após configuração da conexão (recomendado)

### Passo 3: Determinar Tipo de Mensagem

1. Adicione um node **"Switch"**
2. Configure baseado em `{{ $json.messageType }}`:
   - **Route 1:** `text`
   - **Route 2:** `image`
   - **Route 3:** `video`
   - **Route 4:** `audio`
   - **Route 5:** `file`

### Passo 4a: Enviar Mensagem de Texto

1. Adicione um node **"HTTP Request"** na rota `text`
2. Configure:
   - **Method:** `POST`
   - **URL:** `https://graph.facebook.com/v18.0/{{ $json.recipientId }}/messages`
   - **Authentication:** Generic Credential Type
   - **Generic Auth Type:** Header Auth
   - **Name:** `Authorization`
   - **Value:** `Bearer {{ $json.accessToken }}`
   - **Body:** `JSON`
   - **JSON Body:**
   ```json
   {
     "recipient": {
       "id": "{{ $json.recipientId }}"
     },
     "message": {
       "text": "{{ $json.content }}"
     },
     "messaging_type": "RESPONSE"
   }
   ```

### Passo 4b: Enviar Mensagem com Mídia

1. Para cada tipo de mídia (image, video, audio, file), adicione um node **"HTTP Request"**
2. Configure similar ao texto, mas com estrutura de anexo:

**Para Instagram:**
```json
{
  "recipient": {
    "id": "{{ $json.recipientId }}"
  },
  "message": {
    "attachment": {
      "type": "{{ $json.messageType }}",
      "payload": {
        "url": "{{ $json.mediaUrl }}",
        "is_reusable": true
      }
    }
  },
  "messaging_type": "RESPONSE"
}
```

**Para Facebook Messenger:**
```json
{
  "recipient": {
    "id": "{{ $json.recipientId }}"
  },
  "message": {
    "attachment": {
      "type": "{{ $json.messageType }}",
      "payload": {
        "url": "{{ $json.mediaUrl }}"
      }
    }
  },
  "messaging_type": "RESPONSE"
}
```

### Passo 5: Confirmar Envio para CRM

1. Após qualquer rota de envio, adicione um node **"HTTP Request"**
2. Configure:
   - **Method:** `POST`
   - **URL:** `{{ $env.CRM_MESSAGE_SENT_URL }}`
   - **Body:** `JSON`
   - **JSON Body:**
   ```json
   {
     "tenantId": "{{ $('Webhook').item.json.tenantId }}",
     "connectionId": "{{ $('Webhook').item.json.connectionId }}",
     "messageId": "{{ $json.message_id || $json.id }}",
     "tempId": "{{ $('Webhook').item.json.tempId }}",
     "payload": {
       "timestamp": {{ $json.timestamp || Math.floor(Date.now() / 1000) }}
     }
   }
   ```

3. Adicione assinatura HMAC (similar ao Workflow 1)

### Passo 6: Responder ao CRM

1. Adicione um node **"Respond to Webhook"** (se Response Mode = Last Node, não é necessário)
2. Configure resposta de sucesso

### Estrutura Final do Workflow

```
[Webhook] → [HTTP Request: Buscar Token] → [Switch: Tipo] → 
  ├─ [HTTP Request: Texto] ──┐
  ├─ [HTTP Request: Imagem] ─┤
  ├─ [HTTP Request: Vídeo] ──┼→ [HTTP Request: Confirmar CRM]
  ├─ [HTTP Request: Áudio] ──┤
  └─ [HTTP Request: Arquivo] ┘
```

---

## 🔄 Workflow 3: Confirmar Mensagens Enviadas (Alternativo)

Se preferir separar a confirmação em um workflow diferente:

### Passo 1: Criar Webhook Trigger

1. Crie workflow separado
2. Adicione node **"Webhook"**
3. Path: `/webhook/confirm-social-message`

### Passo 2: Confirmar no CRM

1. Adicione node **"HTTP Request"**
2. Mesma configuração do Passo 5 do Workflow 2

---

## 🧪 Testando os Workflows

### Teste 1: Receber Mensagem

1. Envie uma mensagem para sua página Instagram/Facebook
2. Verifique logs do workflow no n8n
3. Verifique se mensagem aparece no CRM

### Teste 2: Enviar Mensagem

1. Envie mensagem pelo CRM
2. Verifique logs do workflow no n8n
3. Verifique se mensagem foi enviada no Instagram/Facebook
4. Verifique se confirmação chegou no CRM

### Teste 3: Mensagem com Mídia

1. Envie imagem/vídeo pelo Instagram/Facebook
2. Verifique se mídia foi processada no CRM
3. Verifique se mídia aparece no chat

---

## 🔐 Gerenciamento de Tokens

### Opção 1: Armazenar no n8n (Recomendado)

1. Após conectar Instagram/Facebook no CRM, criar workflow para sincronizar token
2. Armazenar token em variável de ambiente ou banco de dados do n8n
3. Atualizar automaticamente quando token expirar

### Opção 2: Buscar do CRM

1. Antes de enviar mensagem, fazer GET para `/api/connections/social/{connectionId}`
2. Extrair token de `metadata.accessToken`
3. Usar token na requisição

---

## 📝 Expressões Úteis

### Extrair dados do payload do Meta

```javascript
// Instagram
const messageId = $json.entry[0].messaging[0].message.mid;
const senderId = $json.entry[0].messaging[0].sender.id;
const text = $json.entry[0].messaging[0].message.text;

// Facebook
const messageId = $json.entry[0].messaging[0].message.mid;
const senderId = $json.entry[0].messaging[0].sender.id;
const text = $json.entry[0].messaging[0].message.text;
```

### Gerar assinatura HMAC

```javascript
const crypto = require('crypto');
const secret = $env.WEBHOOK_SOCIAL_SECRET;
const payload = JSON.stringify($input.item.json);
return crypto.createHmac('sha256', secret).update(payload).digest('hex');
```

### Formatar timestamp

```javascript
// Converter timestamp do Meta para ISO
new Date($json.timestamp).toISOString();

// Timestamp atual
Math.floor(Date.now() / 1000);
```

---

## ⚠️ Pontos de Atenção

1. **Rate Limits da Meta:**
   - Instagram: 24 requests por segundo
   - Facebook: 200 requests por segundo
   - Implementar delay se necessário

2. **Validação de Webhook:**
   - Meta envia requisição GET para verificar webhook
   - Retornar `hub.challenge` se `hub.verify_token` corresponder

3. **Token Expiração:**
   - Tokens de longa duração expiram em ~60 dias
   - Implementar renovação automática

4. **Erros Comuns:**
   - `(#100) Invalid parameter`: Verificar formato do payload
   - `(#200) Permission denied`: Verificar escopos do token
   - `(#190) Invalid OAuth access token`: Token expirado ou inválido

---

## 📚 Referências

- [n8n Documentation](https://docs.n8n.io/)
- [Meta Graph API](https://developers.facebook.com/docs/graph-api)
- [Instagram Messaging API](https://developers.facebook.com/docs/instagram-api/guides/messaging)
- [Facebook Messenger API](https://developers.facebook.com/docs/messenger-platform)

---

## ✅ Checklist de Configuração

### Workflow de Recebimento
- [ ] Webhook trigger configurado
- [ ] Webhook verificado no Meta Developer Console
- [ ] Código de normalização implementado
- [ ] Assinatura HMAC configurada
- [ ] HTTP Request para CRM configurado
- [ ] Resposta ao Meta configurada

### Workflow de Envio
- [ ] Webhook trigger configurado
- [ ] Busca de token implementada
- [ ] Switch por tipo de mensagem configurado
- [ ] HTTP Request para Meta API configurado
- [ ] Confirmação para CRM configurada
- [ ] Tratamento de erros implementado

### Testes
- [ ] Mensagem de texto recebida
- [ ] Mensagem com mídia recebida
- [ ] Mensagem de texto enviada
- [ ] Mensagem com mídia enviada
- [ ] Confirmação de envio funcionando
- [ ] Mídia processada corretamente

