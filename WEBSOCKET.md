# WebSocket Gateway - Mensagens em Tempo Real

## Visão Geral

O WebSocket Gateway permite comunicação em tempo real entre atendentes através de mensagens. Todas as conexões são autenticadas via JWT e isoladas por tenant.

## Configuração

### Conexão

Para conectar ao WebSocket, você precisa:

1. **Token JWT válido** - Obtido através do endpoint `/auth/login`
2. **URL do WebSocket** - `ws://localhost:3000/messages` (ou o host do seu servidor)

### Autenticação

O token JWT pode ser enviado de duas formas:

1. **Header Authorization** (recomendado):
   ```
   Authorization: Bearer <token>
   ```

2. **Query Parameter**:
   ```
   ws://localhost:3000/messages?token=<token>
   ```

## Eventos

### Eventos do Cliente → Servidor

#### `message:send`
Envia uma nova mensagem.

**Payload:**
```json
{
  "conversationId": "uuid-da-conversa",
  "senderType": "USER",
  "contentType": "TEXT",
  "contentText": "Olá, como posso ajudar?",
  "contentUrl": null
}
```

**Tipos de conteúdo:**
- `TEXT` - Texto simples (requer `contentText`)
- `IMAGE` - Imagem (requer `contentUrl`)
- `AUDIO` - Áudio (requer `contentUrl`)
- `VIDEO` - Vídeo (requer `contentUrl`)
- `DOCUMENT` - Documento (requer `contentUrl` ou `contentText`)

#### `conversation:join`
Entra em uma sala específica de conversa para receber apenas mensagens dessa conversa.

**Payload:**
```json
{
  "conversationId": "uuid-da-conversa"
}
```

#### `conversation:leave`
Sai de uma sala específica de conversa.

**Payload:**
```json
{
  "conversationId": "uuid-da-conversa"
}
```

### Eventos do Servidor → Cliente

#### `message:new`
Nova mensagem recebida.

**Payload:**
```json
{
  "message": {
    "id": "uuid",
    "conversationId": "uuid",
    "senderType": "USER",
    "contentType": "TEXT",
    "contentText": "Olá, como posso ajudar?",
    "contentUrl": null,
    "tenantId": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "sender": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nome do Usuário",
    "role": "USER"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `message:sent`
Confirmação de que a mensagem foi enviada com sucesso.

**Payload:**
```json
{
  "success": true,
  "message": {
    // Objeto da mensagem criada
  }
}
```

#### `message:error`
Erro ao enviar mensagem.

**Payload:**
```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

#### `user:connected`
Usuário conectado ao WebSocket.

**Payload:**
```json
{
  "userId": "uuid",
  "email": "user@example.com"
}
```

#### `user:disconnected`
Usuário desconectado do WebSocket.

**Payload:**
```json
{
  "userId": "uuid",
  "email": "user@example.com"
}
```

#### `conversation:joined`
Confirmação de entrada em uma conversa.

**Payload:**
```json
{
  "success": true,
  "conversationId": "uuid"
}
```

#### `conversation:left`
Confirmação de saída de uma conversa.

**Payload:**
```json
{
  "success": true,
  "conversationId": "uuid"
}
```

## Validações e Permissões

### Validação de Tenant
- Todas as mensagens são validadas para garantir que pertencem ao tenant do usuário autenticado
- Usuários só podem ver/enviar mensagens do próprio tenant

### Permissões de Envio
- Se a conversa está atribuída a um usuário, apenas esse usuário ou um ADMIN pode enviar mensagens
- Se a conversa não está atribuída, qualquer usuário do tenant pode enviar mensagens
- Não é possível enviar mensagens em conversas fechadas (status: CLOSED)

### Validação de Conteúdo
- `contentText` é obrigatório para `TEXT`
- `contentUrl` é obrigatório para `IMAGE`, `AUDIO`, `VIDEO`
- Para `DOCUMENT`, pode ter `contentText` ou `contentUrl`

## Exemplo de Uso (JavaScript/TypeScript)

```javascript
import io from 'socket.io-client';

// Conectar ao WebSocket
const socket = io('http://localhost:3000/messages', {
  auth: {
    token: 'seu-jwt-token-aqui'
  },
  // Ou usar query parameter:
  // query: {
  //   token: 'seu-jwt-token-aqui'
  // }
});

// Escutar novas mensagens
socket.on('message:new', (data) => {
  console.log('Nova mensagem recebida:', data);
  // Atualizar UI com a nova mensagem
});

// Escutar confirmação de envio
socket.on('message:sent', (data) => {
  console.log('Mensagem enviada com sucesso:', data);
});

// Escutar erros
socket.on('message:error', (error) => {
  console.error('Erro ao enviar mensagem:', error);
});

// Entrar em uma conversa específica
socket.emit('conversation:join', {
  conversationId: 'uuid-da-conversa'
});

// Enviar uma mensagem
socket.emit('message:send', {
  conversationId: 'uuid-da-conversa',
  senderType: 'USER',
  contentType: 'TEXT',
  contentText: 'Olá, como posso ajudar?'
});

// Sair de uma conversa
socket.emit('conversation:leave', {
  conversationId: 'uuid-da-conversa'
});
```

## Salas (Rooms)

O sistema utiliza salas do Socket.IO para organizar as mensagens:

- **`tenant:{tenantId}`** - Todos os clientes do mesmo tenant
- **`conversation:{conversationId}`** - Clientes em uma conversa específica

### Comportamento

1. Ao conectar, o cliente automaticamente entra na sala do tenant
2. Mensagens são enviadas para todas as salas relevantes:
   - Sala do tenant (todos os usuários do tenant)
   - Sala da conversa (usuários específicos da conversa)
3. Isso garante que todos os atendentes do tenant vejam as mensagens, mas também permite escutar apenas conversas específicas

## Segurança

- **Autenticação JWT obrigatória** - Conexões sem token válido são rejeitadas
- **Isolamento por tenant** - Usuários só veem mensagens do próprio tenant
- **Validação de permissões** - Verifica se o usuário tem permissão para enviar mensagens na conversa
- **Validação de dados** - Todos os dados são validados antes de serem processados

## Troubleshooting

### Conexão rejeitada
- Verifique se o token JWT é válido e não expirou
- Verifique se o token está sendo enviado corretamente (header ou query parameter)
- Verifique se o usuário e tenant estão corretos no token

### Mensagem não enviada
- Verifique se a conversa existe e pertence ao tenant
- Verifique se a conversa está aberta (status: ACTIVE)
- Verifique se você tem permissão para enviar mensagens na conversa
- Verifique se os dados da mensagem estão corretos (contentType, contentText/contentUrl)

### Mensagem não recebida
- Verifique se está conectado ao WebSocket
- Verifique se está na sala correta (tenant ou conversa)
- Verifique se o tenant da mensagem corresponde ao seu tenant

