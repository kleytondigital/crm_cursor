# API de Integrações Sociais (Instagram & Facebook Messenger)

## Visão Geral

Esta documentação descreve os endpoints da API para integração com Instagram Direct e Facebook Messenger através do n8n.

## Autenticação

Todos os endpoints (exceto webhooks públicos) requerem autenticação JWT via header:
```
Authorization: Bearer <token>
```

## Endpoints OAuth

### Iniciar Fluxo OAuth

**GET** `/connections/social/oauth/start?provider=INSTAGRAM|FACEBOOK`

Inicia o fluxo OAuth para conectar uma conta social.

**Query Parameters:**
- `provider` (obrigatório): `INSTAGRAM` ou `FACEBOOK`

**Resposta:**
```json
{
  "authUrl": "https://www.facebook.com/v21.0/dialog/oauth?...",
  "provider": "INSTAGRAM"
}
```

### Callback OAuth

**GET** `/connections/social/oauth/callback?code=<code>&state=<state>`

Endpoint chamado pelo Meta após autorização do usuário.

**Query Parameters:**
- `code` (obrigatório): Código de autorização retornado pelo Meta
- `state` (obrigatório): Estado codificado contendo tenantId e provider

**Resposta:**
```json
{
  "success": true,
  "connection": {
    "id": "uuid",
    "name": "Instagram - Minha Página",
    "provider": "INSTAGRAM",
    "status": "ACTIVE"
  }
}
```

### Renovar Token

**POST** `/connections/social/oauth/refresh/:id`

Renova manualmente o token de acesso de uma conexão.

**Resposta:**
```json
{
  "success": true,
  "expiresAt": "2025-12-28T10:00:00.000Z"
}
```

## Gerenciamento de Conexões

### Listar Conexões Sociais

**GET** `/connections/social`

Lista todas as conexões sociais do tenant.

**Resposta:**
```json
[
  {
    "id": "uuid",
    "name": "Instagram - Minha Página",
    "provider": "INSTAGRAM",
    "status": "ACTIVE",
    "isActive": true,
    "metadata": {
      "pageId": "123456789",
      "pageName": "Minha Página",
      "instagramBusinessId": "987654321",
      "instagramUsername": "minha_conta",
      "accessToken": "...",
      "tokenExpiresAt": "2025-12-28T10:00:00.000Z"
    },
    "createdAt": "2025-11-28T10:00:00.000Z",
    "updatedAt": "2025-11-28T10:00:00.000Z"
  }
]
```

### Criar Conexão Social

**POST** `/connections/social`

Prepara uma nova conexão social (inicia OAuth).

**Body:**
```json
{
  "provider": "INSTAGRAM",
  "name": "Instagram Principal"
}
```

### Atualizar Conexão Social

**PATCH** `/connections/social/:id`

Atualiza uma conexão social.

**Body:**
```json
{
  "name": "Novo Nome",
  "isActive": true,
  "metadata": {}
}
```

### Desconectar Conexão Social

**POST** `/connections/social/:id/disconnect`

Desconecta uma conexão social.

**Resposta:**
```json
{
  "id": "uuid",
  "status": "STOPPED",
  "isActive": false
}
```

## Webhooks (n8n → CRM)

### Receber Mensagens

**POST** `/webhooks/social`

Endpoint público para receber mensagens do n8n.

**Headers:**
- `x-n8n-signature` ou `x-webhook-signature` (opcional): Assinatura HMAC para validação

**Body:**
```json
{
  "provider": "INSTAGRAM",
  "tenantId": "uuid",
  "connectionId": "uuid",
  "message": {
    "id": "mid.123456",
    "from": {
      "id": "sender_id",
      "name": "Nome do Usuário",
      "picture": "https://..."
    },
    "text": "Mensagem de texto",
    "type": "text",
    "timestamp": "2025-11-28T10:00:00Z",
    "isFromMe": false
  }
}
```

**Resposta:**
```json
{
  "status": "ok",
  "processed": 1
}
```

## Envio de Mensagens (CRM → n8n)

O envio de mensagens é feito automaticamente pelo `MessagesService` quando uma mensagem é criada com `senderType: USER` e a conversa está vinculada a uma conexão social.

O sistema detecta automaticamente o provider da conexão e roteia para o `SocialMessageSenderService`, que envia para o n8n.

## Variáveis de Ambiente Necessárias

```env
# Meta OAuth
META_APP_ID=seu_app_id
META_APP_SECRET=seu_app_secret
META_REDIRECT_URI=https://seu-dominio.com/connections/social/oauth/callback

# n8n
N8N_API_URL=https://seu-n8n.com
N8N_API_KEY=sua_api_key
WEBHOOK_SOCIAL_URL=https://seu-dominio.com/webhooks/social
WEBHOOK_SOCIAL_SECRET=seu_secret_para_validacao_hmac
```

## Notas Importantes

1. **Renovação Automática de Tokens**: O `TokenRefreshService` verifica tokens próximos do vencimento a cada 6 horas. Para habilitar, instale `@nestjs/schedule` e importe `ScheduleModule` no `AppModule`.

2. **Isolamento por Tenant**: Todas as conexões são isoladas por `tenantId`. Um tenant não pode acessar conexões de outro tenant.

3. **Validação de Assinatura**: Os webhooks podem ser validados via HMAC SHA256 se `WEBHOOK_SOCIAL_SECRET` estiver configurado.

4. **Múltiplas Páginas**: O sistema suporta múltiplas conexões por tenant, permitindo gerenciar várias páginas do Facebook/Instagram.

