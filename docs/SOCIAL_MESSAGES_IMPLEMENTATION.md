# Manual de Execução e Implementação - Mensagens Instagram e Facebook

## 📋 Visão Geral

Este documento descreve a implementação completa da integração de mensagens do Instagram Direct e Facebook Messenger através do n8n como orquestrador. O fluxo segue o mesmo padrão da integração com WhatsApp (WAHA), mas utilizando a API Meta (Graph API).

---

## 🏗️ Arquitetura

### Fluxo de Mensagens Recebidas (Meta → CRM)

```
1. Meta (Instagram/Facebook) → n8n Webhook
   └─ Envia mensagem recebida

2. n8n Workflow → Processa mensagem
   └─ Normaliza payload
   └─ Envia para CRM

3. CRM (/webhooks/social)
   └─ Valida payload
   └─ Normaliza mensagem
   └─ Cria/atualiza lead
   └─ Cria/atualiza conversa
   └─ Salva mensagem
   └─ Processa mídia (download/upload MinIO)
   └─ Cria/atualiza atendimento
   └─ Emite via WebSocket
```

### Fluxo de Mensagens Enviadas (CRM → Meta)

```
1. Frontend → Backend CRM
   POST /messages/send
   └─ Cria mensagem otimista com tempId

2. Backend CRM → n8n
   POST {N8N_API_URL}/webhook/send-social-message
   └─ Envia payload com tempId

3. n8n Workflow → Meta Graph API
   └─ Envia mensagem via HTTP Request
   └─ Obtém messageId da Meta

4. n8n → CRM (/webhooks/social/message.sent)
   └─ Envia confirmação com messageId e tempId
   └─ CRM atualiza mensagem otimista
   └─ Emite atualização via WebSocket
```

---

## 🔌 Endpoints Utilizados

### CRM → n8n (Envio de Mensagens)

**Endpoint do n8n:** `{N8N_API_URL}/webhook/send-social-message`

**Método:** `POST`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-N8N-API-KEY": "{N8N_API_KEY}" // Opcional
}
```

**Payload:**
```json
{
  "connectionId": "uuid-da-conexao",
  "tenantId": "uuid-do-tenant",
  "provider": "INSTAGRAM" | "FACEBOOK",
  "recipientId": "id-do-instagram-ou-facebook",
  "messageType": "text" | "image" | "video" | "audio" | "file",
  "content": "Texto da mensagem (se messageType=text)",
  "mediaUrl": "https://... (se messageType != text)",
  "tempId": "uuid-temporario-para-correlacao",
  "replyTo": "message-id-da-mensagem-original" // Opcional, para replies
}
```

**Exemplo:**
```json
{
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "660e8400-e29b-41d4-a716-446655440001",
  "provider": "INSTAGRAM",
  "recipientId": "17841405309211844",
  "messageType": "text",
  "content": "Olá! Como posso ajudar?",
  "tempId": "770e8400-e29b-41d4-a716-446655440002"
}
```

---

### n8n → CRM (Mensagens Recebidas)

**Endpoint do CRM:** `{CRM_URL}/webhooks/social`

**Método:** `POST`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "x-n8n-signature": "hmac-sha256-signature" // Opcional, se WEBHOOK_SOCIAL_SECRET configurado
}
```

**Payload:**
```json
{
  "tenantId": "uuid-do-tenant",
  "connectionId": "uuid-da-conexao",
  "provider": "INSTAGRAM" | "FACEBOOK",
  "message": {
    "id": "mid.123456789",
    "from": {
      "id": "17841405309211844",
      "name": "Nome do Usuário",
      "picture": "https://..."
    },
    "text": "Mensagem de texto",
    "type": "text" | "image" | "video" | "audio" | "file",
    "mediaUrl": "https://..." // Se type != text
    "mediaMimeType": "image/jpeg" // Se type != text
    "timestamp": "2025-11-28T10:00:00Z" | 1701172800,
    "isFromMe": false
  }
}
```

**Exemplo (Mensagem de Texto):**
```json
{
  "tenantId": "660e8400-e29b-41d4-a716-446655440001",
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "INSTAGRAM",
  "message": {
    "id": "mid.ABC123XYZ",
    "from": {
      "id": "17841405309211844",
      "name": "João Silva",
      "picture": "https://scontent.cdninstagram.com/v/..."
    },
    "text": "Olá, preciso de ajuda",
    "type": "text",
    "timestamp": "2025-11-28T14:30:00Z",
    "isFromMe": false
  }
}
```

**Exemplo (Mensagem com Imagem):**
```json
{
  "tenantId": "660e8400-e29b-41d4-a716-446655440001",
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "INSTAGRAM",
  "message": {
    "id": "mid.DEF456UVW",
    "from": {
      "id": "17841405309211844",
      "name": "Maria Santos"
    },
    "text": "Veja esta foto",
    "type": "image",
    "mediaUrl": "https://scontent.cdninstagram.com/v/t51.2885-15/...",
    "mediaMimeType": "image/jpeg",
    "timestamp": 1701172800,
    "isFromMe": false
  }
}
```

**Resposta do CRM:**
```json
{
  "status": "ok",
  "processed": 1
}
```

---

### n8n → CRM (Confirmação de Mensagens Enviadas)

**Endpoint do CRM:** `{CRM_URL}/webhooks/social/message.sent`

**Método:** `POST`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "x-n8n-signature": "hmac-sha256-signature" // Opcional
}
```

**Payload:**
```json
{
  "tenantId": "uuid-do-tenant",
  "connectionId": "uuid-da-conexao",
  "messageId": "mid.123456789",
  "tempId": "uuid-temporario-fornecido-pelo-crm",
  "payload": {
    "timestamp": 1701172800,
    "from": {
      "id": "page-id"
    }
  }
}
```

**Exemplo:**
```json
{
  "tenantId": "660e8400-e29b-41d4-a716-446655440001",
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "messageId": "mid.ABC123XYZ",
  "tempId": "770e8400-e29b-41d4-a716-446655440002",
  "payload": {
    "timestamp": 1701172800
  }
}
```

**Resposta do CRM:**
```json
{
  "status": "ok",
  "updated": true
}
```

---

## 📤 JSON Enviado pela Meta para o n8n

O n8n recebe webhooks da Meta quando uma mensagem é recebida. O formato pode variar, mas geralmente segue esta estrutura:

### Webhook do Instagram

```json
{
  "object": "instagram",
  "entry": [
    {
      "id": "17841405309211844",
      "messaging": [
        {
          "sender": {
            "id": "17841405309211844"
          },
          "recipient": {
            "id": "123456789"
          },
          "timestamp": 1701172800000,
          "message": {
            "mid": "mid.ABC123XYZ",
            "text": "Mensagem de texto",
            "attachments": [
              {
                "type": "image",
                "payload": {
                  "url": "https://scontent.cdninstagram.com/v/..."
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### Webhook do Facebook Messenger

```json
{
  "object": "page",
  "entry": [
    {
      "id": "123456789",
      "time": 1701172800000,
      "messaging": [
        {
          "sender": {
            "id": "987654321"
          },
          "recipient": {
            "id": "123456789"
          },
          "timestamp": 1701172800000,
          "message": {
            "mid": "mid.ABC123XYZ",
            "text": "Mensagem de texto"
          }
        }
      ]
    }
  ]
}
```

---

## 🔄 JSON Enviado pelo n8n para o CRM

O n8n deve normalizar os dados da Meta e enviar para o CRM no formato descrito acima (seção "n8n → CRM (Mensagens Recebidas)").

**Pontos Importantes:**
- O n8n deve extrair `tenantId` e `connectionId` do contexto (configuração da conexão)
- Deve normalizar o formato do payload independente de ser Instagram ou Facebook
- Deve incluir todas as informações necessárias (from, text, type, mediaUrl, etc.)

---

## ✅ JSON Esperado como Retorno dos Endpoints do CRM

### Resposta Genérica (Sucesso)

```json
{
  "status": "ok",
  "processed": 1
}
```

### Resposta de Erro

```json
{
  "statusCode": 400,
  "message": "Descrição do erro",
  "error": "Bad Request"
}
```

### Resposta de Confirmação (message.sent)

```json
{
  "status": "ok",
  "updated": true
}
```

---

## 🔐 Variáveis de Ambiente Necessárias

### Backend (CRM)

```env
# Meta OAuth
META_OAUTH_APP_ID=seu_app_oauth_id
META_OAUTH_APP_SECRET=seu_app_oauth_secret
META_GRAPH_APP_ID=seu_app_graph_id
META_GRAPH_APP_SECRET=seu_app_graph_secret
META_REDIRECT_URI=https://seu-dominio.com/connections/social/oauth/callback

# n8n
N8N_API_URL=https://seu-n8n.com
N8N_API_KEY=sua_api_key_opcional

# Webhook Social
WEBHOOK_SOCIAL_URL=https://seu-dominio.com/webhooks/social
WEBHOOK_SOCIAL_SECRET=seu_secret_para_validacao_hmac

# MinIO (para armazenar mídia)
MINIO_ENDPOINT=https://seu-minio.com
MINIO_API_ENDPOINT=https://seu-minio-api.com
MINIO_ACCESS_KEY=seu_access_key
MINIO_SECRET_KEY=seu_secret_key
MINIO_BUCKET=crm
MINIO_USE_SSL=true
```

### n8n (Configuração nos Workflows)

```env
# URL do CRM
CRM_WEBHOOK_URL=https://seu-dominio.com/webhooks/social
CRM_MESSAGE_SENT_URL=https://seu-dominio.com/webhooks/social/message.sent

# Secret para assinatura HMAC
WEBHOOK_SOCIAL_SECRET=seu_secret_para_validacao_hmac

# Tokens de acesso Meta (gerenciados dinamicamente via conexões)
# Não devem ser hardcoded - vêm do CRM via configuração de conexão
```

---

## 🔧 Estrutura dos Webhooks do n8n

### Workflow 1: Receber Mensagens do Meta

**Trigger:** Webhook (configurado no Meta Developer Console)

**Parâmetros:**
- Path: `/webhook/instagram` ou `/webhook/facebook`
- Method: `POST`
- Response Mode: `Response Node` (para responder ao Meta)

**Node 1: Webhook Trigger**
- Recebe payload da Meta

**Node 2: Processar Payload**
- Extrai informações da mensagem
- Normaliza formato (Instagram vs Facebook)
- Identifica `tenantId` e `connectionId` do contexto

**Node 3: Enviar para CRM**
- HTTP Request para `{CRM_URL}/webhooks/social`
- Payload normalizado conforme especificação
- Headers com assinatura HMAC (se configurado)

**Node 4: Responder ao Meta**
- Response Node com status 200
- Responde ao Meta para confirmar recebimento

---

### Workflow 2: Enviar Mensagens para o Meta

**Trigger:** Webhook recebido do CRM

**Parâmetros:**
- Path: `/webhook/send-social-message`
- Method: `POST`

**Node 1: Webhook Trigger**
- Recebe payload do CRM

**Node 2: Extrair Configuração**
- Busca `connectionId` e `tenantId` do payload
- Busca token de acesso da conexão (do CRM ou cache)

**Node 3: Determinar Tipo de Mensagem**
- Switch baseado em `messageType`

**Node 4a: Enviar Texto**
- HTTP Request para Meta Graph API
- `POST /{page-id}/messages` ou `/v18.0/{page-id}/messages`

**Node 4b: Enviar Mídia**
- Download de mídia (se necessário)
- Upload para Meta (se necessário)
- HTTP Request para Meta Graph API

**Node 5: Confirmar Envio**
- HTTP Request para `{CRM_URL}/webhooks/social/message.sent`
- Inclui `messageId` da Meta e `tempId` original

---

### Workflow 3: Confirmar Mensagens Enviadas

Este workflow é parte do Workflow 2, mas pode ser separado:

**Node: Confirmar Envio**
- HTTP Request para `{CRM_URL}/webhooks/social/message.sent`
- Payload:
  ```json
  {
    "tenantId": "{{ $json.tenantId }}",
    "connectionId": "{{ $json.connectionId }}",
    "messageId": "{{ $json.messageId }}",
    "tempId": "{{ $json.tempId }}",
    "payload": {
      "timestamp": {{ $json.timestamp }}
    }
  }
  ```

---

## 🚀 Autenticação e Tokens

### Obtendo Tokens de Acesso

Os tokens são obtidos quando o usuário conecta Instagram/Facebook no CRM através do fluxo OAuth (ver `docs/SOCIAL_INTEGRATIONS_API.md`).

### Usando Tokens no n8n

O n8n deve usar o token de acesso armazenado na conexão. O token está disponível em:

**Via Configuração de Conexão no CRM:**
- Endpoint: `GET /connections/social/{id}`
- Retorna `metadata.accessToken`

**Via Payload do Webhook:**
- Quando o CRM envia mensagem para o n8n, pode incluir o token no payload
- Ou o n8n pode buscar o token via API do CRM antes de enviar

**Recomendação:** Armazenar token no n8n após configuração da conexão e renovar automaticamente quando expirar.

---

## 📝 Processamento de Mídia

### Download de Mídia

Quando uma mensagem contém mídia (imagem, vídeo, áudio, documento):

1. O n8n envia `mediaUrl` para o CRM
2. O CRM faz download da mídia usando o token de acesso
3. O CRM salva no MinIO
4. O CRM atualiza a mensagem com a URL do MinIO

### Formatos Suportados

- **Imagens:** JPEG, PNG, GIF, WebP
- **Vídeos:** MP4, 3GP
- **Áudios:** MP3, AAC, OGG
- **Documentos:** PDF, DOC, XLS, PPT, TXT, ZIP

---

## 🔍 Validação de Assinatura (HMAC)

O CRM pode validar assinaturas dos webhooks do n8n para segurança.

**Configuração:**
- Variável de ambiente: `WEBHOOK_SOCIAL_SECRET`
- Header esperado: `x-n8n-signature` ou `x-webhook-signature`
- Algoritmo: HMAC SHA256

**No n8n:**
- Usar node "HMAC" para gerar assinatura
- Adicionar ao header `x-n8n-signature`

---

## 🐛 Troubleshooting

### Mensagens não aparecem no CRM

1. Verificar logs do CRM (`docker logs <container>`)
2. Verificar se webhook do n8n está ativo
3. Verificar se `WEBHOOK_SOCIAL_SECRET` está configurado corretamente
4. Verificar se conexão está ativa no CRM

### Mensagens enviadas duplicam

1. Verificar se `tempId` está sendo enviado corretamente
2. Verificar se webhook `message.sent` está sendo chamado
3. Verificar logs do endpoint `/webhooks/social/message.sent`

### Mídia não aparece

1. Verificar logs de processamento de mídia
2. Verificar configuração do MinIO
3. Verificar se token de acesso tem permissão para baixar mídia
4. Verificar se `mediaUrl` está acessível

### Erro de autenticação com Meta

1. Verificar se token não expirou
2. Verificar se token tem escopos necessários
3. Renovar token via endpoint `/connections/social/oauth/refresh/{id}`

---

## 📚 Referências

- [Meta Graph API - Send Messages](https://developers.facebook.com/docs/graph-api/reference/v18.0/page/messages)
- [Meta Graph API - Webhooks](https://developers.facebook.com/docs/graph-api/webhooks)
- [Instagram Messaging API](https://developers.facebook.com/docs/instagram-api/guides/messaging)
- [Facebook Messenger API](https://developers.facebook.com/docs/messenger-platform)

---

## ✅ Checklist de Implementação

### Backend (CRM)
- [x] Webhook `/webhooks/social` implementado
- [x] Webhook `/webhooks/social/message.sent` implementado
- [x] Processamento de mídia implementado
- [x] Validação HMAC implementada
- [x] Logs detalhados implementados

### n8n (Workflows)
- [ ] Workflow de recebimento de mensagens configurado
- [ ] Workflow de envio de mensagens configurado
- [ ] Webhook do Meta configurado no Developer Console
- [ ] Assinatura HMAC configurada (se necessário)
- [ ] Tokens de acesso configurados

### Testes
- [ ] Testar recebimento de mensagem de texto
- [ ] Testar recebimento de mensagem com imagem
- [ ] Testar envio de mensagem de texto
- [ ] Testar envio de mensagem com mídia
- [ ] Testar confirmação de mensagem enviada
- [ ] Testar processamento de mídia
- [ ] Testar validação HMAC

