# API de Integrações Sociais (Instagram & Facebook Messenger)

## Visão Geral

Esta documentação descreve os endpoints da API para integração com Instagram Direct e Facebook Messenger através do n8n.

## Arquitetura de Apps Meta

O sistema suporta duas configurações para apps Meta:

### Configuração Unificada (Padrão)
- Um único app Meta (`META_APP_ID`/`META_APP_SECRET`) usado para autenticação OAuth e operações Graph API
- Ideal para a maioria dos casos de uso

### Configuração Separada (Avançada)
- **App OAuth** (`META_OAUTH_APP_ID`/`META_OAUTH_APP_SECRET`): Usado exclusivamente para autenticação e login
- **App Graph API** (`META_GRAPH_APP_ID`/`META_GRAPH_APP_SECRET`): Usado para operações com Instagram/Messenger via Graph API
- Útil quando você precisa de permissões ou escopos diferentes para cada operação

**Fluxo de Fallback:**
- Se `META_OAUTH_APP_ID` não existir → usa `META_APP_ID`
- Se `META_GRAPH_APP_ID` não existir → usa `META_OAUTH_APP_ID`
- Isso garante compatibilidade retroativa com configurações antigas

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
- `state` (obrigatório): Estado codificado contendo tenantId e provider (e opcionalmente `step: 'graph'`)

**Resposta (Sucesso):**
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

**Resposta (Requer Segunda Autorização - Apps Separados):**
```json
{
  "requiresSecondAuth": true,
  "authUrl": "https://www.facebook.com/v21.0/dialog/oauth?...",
  "message": "Autorização básica concluída. É necessário autorizar acesso às páginas e Instagram."
}
```

**Nota:** Quando `requiresSecondAuth: true`, o frontend deve redirecionar o usuário para `authUrl` para completar a autorização dos escopos de páginas/Instagram via App Graph API.

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

### Configuração Básica (Usando um único App)

```env
# Meta OAuth - Configuração unificada (um app para tudo)
META_APP_ID=seu_app_id
META_APP_SECRET=seu_app_secret
META_REDIRECT_URI=https://seu-dominio.com/connections/social/oauth/callback

# n8n
N8N_API_URL=https://seu-n8n.com
N8N_API_KEY=sua_api_key
WEBHOOK_SOCIAL_URL=https://seu-dominio.com/webhooks/social
WEBHOOK_SOCIAL_SECRET=seu_secret_para_validacao_hmac
```

### Configuração Avançada (Separando Apps OAuth e Graph API)

Quando você quiser usar dois apps Meta diferentes - um para autenticação OAuth e outro para operações Graph API:

```env
# Meta OAuth - App para autenticação/login
META_OAUTH_APP_ID=seu_app_oauth_id
META_OAUTH_APP_SECRET=seu_app_oauth_secret

# Meta Graph API - App para operações Instagram/Messenger (opcional)
# Se não configurado, usa o OAuth App como fallback
META_GRAPH_APP_ID=seu_app_graph_id
META_GRAPH_APP_SECRET=seu_app_graph_secret

# Redirect URI
META_REDIRECT_URI=https://seu-dominio.com/connections/social/oauth/callback

# n8n
N8N_API_URL=https://seu-n8n.com
N8N_API_KEY=sua_api_key
WEBHOOK_SOCIAL_URL=https://seu-dominio.com/webhooks/social
WEBHOOK_SOCIAL_SECRET=seu_secret_para_validacao_hmac
```

**Nota sobre Compatibilidade:**
- Se `META_OAUTH_APP_ID` não existir, o sistema usa `META_APP_ID` como fallback
- Se `META_GRAPH_APP_ID` não existir, o sistema usa `META_OAUTH_APP_ID` como fallback
- Isso permite migração gradual e mantém compatibilidade com configurações antigas

**Quando usar Apps Separados:**
- **App OAuth**: Focado apenas em autenticação e login de usuários (sem escopos de páginas)
- **App Graph API**: Focado em operações com Instagram/Messenger, métricas de anúncios, envio/recebimento de mensagens
- **Recomendado quando**: Você recebe erro "Invalid Scopes" no login OAuth, ou precisa separar responsabilidades para maior robustez

**Configuração dos Apps no Facebook Developer:**

1. **App OAuth (Login)**:
   - Tipo: Facebook Login
   - Escopos: Nenhum ou apenas `email`, `public_profile` (básicos)
   - Não solicite escopos de páginas/Instagram aqui

2. **App Graph API (Operações)**:
   - Tipo: Business ou Consumer
   - Escopos: `pages_show_list`, `pages_messaging`, `instagram_basic`, `instagram_manage_messages`, `pages_read_engagement`
   - Este app será usado para todas as operações após o login

**Uso dos Apps nas Operações:**
- **OAuth App** é usado para:
  - `generateAuthUrl()` - Gerar URL de autorização básica (login sem escopos de páginas)
  - `exchangeCodeForToken()` - Trocar código por token
  - `getLongLivedToken()` - Converter token curto para longo
  - `refreshAccessToken()` - Renovar token expirado

- **Graph App** é usado para:
  - `generateGraphApiAuthUrl()` - Gerar URL de autorização para escopos de páginas/Instagram (segunda etapa)
  - `getTokenInfo()` - Validar e obter informações do token (debug_token)
  - Operações futuras que requeiram credenciais de app

- **Access Token do Usuário** é usado para:
  - `getPages()` - Listar páginas do usuário
  - `getPageInfo()` - Obter informações de uma página
  - `getInstagramBusinessAccount()` - Obter conta Instagram Business
  - Todas as chamadas Graph API usando o token do usuário autenticado

## Fluxo de Autorização em Duas Etapas (Apps Separados)

Quando você configura dois apps separados, o sistema usa um fluxo de autorização em duas etapas:

### Etapa 1: Login OAuth Básico (App OAuth)
1. Usuário clica em "Conectar Instagram/Facebook"
2. Sistema redireciona para Meta usando **App OAuth** (sem escopos de páginas)
3. Usuário faz login e autoriza o app
4. Sistema recebe token básico (apenas autenticação)

### Etapa 2: Autorização de Escopos (App Graph API)
1. Sistema detecta que o token não tem escopos necessários
2. Retorna URL de segunda autorização usando **App Graph API**
3. Usuário autoriza acesso às páginas e Instagram
4. Sistema recebe token completo com todos os escopos
5. Conexão é criada com sucesso

**Vantagens:**
- App OAuth focado apenas em login (evita erros de escopos inválidos)
- App Graph API gerencia permissões de páginas/mensagens
- Maior robustez e separação de responsabilidades
- Evita o erro "Invalid Scopes" no login

## Notas Importantes

1. **Renovação Automática de Tokens**: O `TokenRefreshService` verifica tokens próximos do vencimento a cada 6 horas. Para habilitar, instale `@nestjs/schedule` e importe `ScheduleModule` no `AppModule`.

2. **Isolamento por Tenant**: Todas as conexões são isoladas por `tenantId`. Um tenant não pode acessar conexões de outro tenant.

3. **Validação de Assinatura**: Os webhooks podem ser validados via HMAC SHA256 se `WEBHOOK_SOCIAL_SECRET` estiver configurado.

4. **Múltiplas Páginas**: O sistema suporta múltiplas conexões por tenant, permitindo gerenciar várias páginas do Facebook/Instagram.

