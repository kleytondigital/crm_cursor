# Guia Rápido - Webhook Instagram para o CRM

## Endpoint

```
POST https://backcrm.aoseudispor.com.br/webhooks/social
```

## Headers Obrigatórios

```json
{
  "Content-Type": "application/json",
  "x-n8n-signature": "hmac-sha256-signature" // Opcional se WEBHOOK_SOCIAL_SECRET estiver configurado
}
```

---

## JSON Body para Mensagem de Texto

```json
{
  "tenantId": "uuid-do-tenant",
  "connectionId": "uuid-da-conexao-instagram",
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

---

## JSON Body para Mensagem com Imagem

```json
{
  "tenantId": "uuid-do-tenant",
  "connectionId": "uuid-da-conexao-instagram",
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

---

## JSON Body para Mensagem com Vídeo

```json
{
  "tenantId": "uuid-do-tenant",
  "connectionId": "uuid-da-conexao-instagram",
  "provider": "INSTAGRAM",
  "message": {
    "id": "mid.GHI789RST",
    "from": {
      "id": "17841405309211844",
      "name": "Pedro Costa"
    },
    "text": "Veja este vídeo",
    "type": "video",
    "mediaUrl": "https://scontent.cdninstagram.com/v/t51.2885-15/...",
    "mediaMimeType": "video/mp4",
    "timestamp": 1701172800,
    "isFromMe": false
  }
}
```

---

## JSON Body para Mensagem com Áudio

```json
{
  "tenantId": "uuid-do-tenant",
  "connectionId": "uuid-da-conexao-instagram",
  "provider": "INSTAGRAM",
  "message": {
    "id": "mid.JKL012UVW",
    "from": {
      "id": "17841405309211844",
      "name": "Ana Paula"
    },
    "text": null,
    "type": "audio",
    "mediaUrl": "https://scontent.cdninstagram.com/v/t51.2885-15/...",
    "mediaMimeType": "audio/mpeg",
    "timestamp": 1701172800,
    "isFromMe": false
  }
}
```

---

## JSON Body para Mensagem com Documento/Arquivo

```json
{
  "tenantId": "uuid-do-tenant",
  "connectionId": "uuid-da-conexao-instagram",
  "provider": "INSTAGRAM",
  "message": {
    "id": "mid.MNO345XYZ",
    "from": {
      "id": "17841405309211844",
      "name": "Carlos Mendes"
    },
    "text": "Aqui está o documento",
    "type": "file",
    "mediaUrl": "https://scontent.cdninstagram.com/v/t51.2885-15/...",
    "mediaMimeType": "application/pdf",
    "timestamp": 1701172800,
    "isFromMe": false
  }
}
```

---

## Campos Obrigatórios

### Raiz do JSON:
- `tenantId` (string): UUID do tenant/empresa no CRM
- `connectionId` (string): UUID da conexão Instagram criada no CRM
- `provider` (string): Sempre `"INSTAGRAM"` para mensagens do Instagram
- `message` (object): Objeto com os dados da mensagem

### Objeto `message`:
- `id` (string): ID único da mensagem no Instagram (ex: `"mid.ABC123XYZ"`)
- `from.id` (string): ID do Instagram do remetente
- `from.name` (string, opcional): Nome do remetente
- `from.picture` (string, opcional): URL da foto de perfil
- `text` (string, opcional): Texto da mensagem (null se for só mídia)
- `type` (string): Tipo da mensagem: `"text"`, `"image"`, `"video"`, `"audio"`, `"file"`
- `mediaUrl` (string, opcional): URL da mídia (obrigatório se type != "text")
- `mediaMimeType` (string, opcional): Tipo MIME da mídia (obrigatório se type != "text")
- `timestamp` (string|number): Timestamp da mensagem (ISO 8601 ou Unix timestamp)
- `isFromMe` (boolean): Sempre `false` para mensagens recebidas

---

## Resposta do CRM (Sucesso)

```json
{
  "status": "ok",
  "processed": 1
}
```

---

## Resposta do CRM (Erro)

```json
{
  "statusCode": 400,
  "message": "Descrição do erro",
  "error": "Bad Request"
}
```

---

## Como Obter os UUIDs Necessários

### tenantId
O `tenantId` é o ID da empresa no CRM. Você pode obter:
- Via API: `GET /api/companies/me` (retorna o `id` da empresa do usuário autenticado)
- No banco de dados: tabela `companies`, campo `id`

### connectionId
O `connectionId` é o ID da conexão Instagram criada na página de Conexões. Você pode obter:
- Via API: `GET /api/connections/social` (retorna todas as conexões sociais)
- No banco de dados: tabela `connections`, campo `id` onde `provider = 'INSTAGRAM'`

---

## Exemplo Completo de Transformação (n8n)

### Payload Recebido da Meta:
```json
{
  "object": "instagram",
  "entry": [{
    "id": "17841405309211844",
    "messaging": [{
      "sender": {
        "id": "17841405309211844"
      },
      "recipient": {
        "id": "123456789"
      },
      "timestamp": 1701172800000,
      "message": {
        "mid": "mid.ABC123XYZ",
        "text": "Olá, preciso de ajuda"
      }
    }]
  }]
}
```

### Transformação para Enviar ao CRM:
```javascript
// No n8n, use um node "Code" ou "Function" para transformar:

const entry = $input.item.json.entry[0];
const messaging = entry.messaging[0];
const message = messaging.message;

// Extrair dados (ajuste conforme sua configuração)
const tenantId = $env.TENANT_ID; // ou buscar dinamicamente
const connectionId = $env.INSTAGRAM_CONNECTION_ID; // ou buscar dinamicamente

return {
  tenantId: tenantId,
  connectionId: connectionId,
  provider: "INSTAGRAM",
  message: {
    id: message.mid || message.id,
    from: {
      id: messaging.sender.id,
      name: messaging.sender.name || null,
      picture: messaging.sender.profile_picture || null
    },
    text: message.text || null,
    type: message.attachments && message.attachments.length > 0 
      ? message.attachments[0].type 
      : "text",
    mediaUrl: message.attachments && message.attachments.length > 0
      ? message.attachments[0].payload.url
      : null,
    mediaMimeType: message.attachments && message.attachments.length > 0
      ? message.attachments[0].payload.mime_type
      : null,
    timestamp: messaging.timestamp 
      ? new Date(messaging.timestamp).toISOString()
      : new Date().toISOString(),
    isFromMe: false
  }
};
```

---

## Assinatura HMAC (Opcional)

Se você configurou `WEBHOOK_SOCIAL_SECRET` no backend, precisa incluir o header `x-n8n-signature`:

```javascript
const crypto = require('crypto');

const secret = $env.WEBHOOK_SOCIAL_SECRET;
const payload = JSON.stringify($json);
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

// Adicionar ao header:
headers: {
  "x-n8n-signature": signature
}
```

---

## Tipos de Mídia Suportados

| Tipo | mediaMimeType Exemplo |
|------|----------------------|
| Imagem | `image/jpeg`, `image/png`, `image/gif`, `image/webp` |
| Vídeo | `video/mp4`, `video/3gpp` |
| Áudio | `audio/mpeg`, `audio/aac`, `audio/ogg` |
| Documento | `application/pdf`, `application/msword`, `text/plain`, `application/zip` |

---

## Troubleshooting

### Erro 400: "tenantId ou connectionId não fornecido"
- Verifique se os campos `tenantId` e `connectionId` estão presentes e são UUIDs válidos
- Confirme que a conexão Instagram existe no CRM e está ativa

### Erro 401/403: "Assinatura inválida"
- Verifique se o `WEBHOOK_SOCIAL_SECRET` está configurado no backend
- Confirme que o header `x-n8n-signature` está sendo enviado corretamente
- Verifique se a assinatura HMAC está sendo calculada corretamente

### Mensagem não aparece no CRM
- Verifique os logs do backend para erros
- Confirme que o `message.id` é único (não duplicado)
- Verifique se o formato do timestamp está correto

### Mídia não é processada
- Confirme que `mediaUrl` é acessível (URL pública)
- Verifique se `mediaMimeType` está presente e correto
- Confirme que o token de acesso tem permissão para baixar a mídia

---

## Teste Rápido com cURL

```bash
curl -X POST https://backcrm.aoseudispor.com.br/webhooks/social \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "seu-tenant-id",
    "connectionId": "sua-connection-id",
    "provider": "INSTAGRAM",
    "message": {
      "id": "mid.TEST123",
      "from": {
        "id": "17841405309211844",
        "name": "Teste"
      },
      "text": "Mensagem de teste",
      "type": "text",
      "timestamp": "2025-11-28T14:30:00Z",
      "isFromMe": false
    }
  }'
```

---

**Nota:** Substitua `seu-tenant-id` e `sua-connection-id` pelos valores reais do seu ambiente.

