# 🔧 Correção de Problemas de WebSocket no Easypanel - V2

## ⚠️ Problema: Timeout no WebSocket

O erro de timeout ocorre porque o proxy reverso do Easypanel (Traefik) pode ter problemas com WebSocket puro.

## ✅ Solução: Usar Polling Primeiro

### Alterações Implementadas

1. **Frontend - Configuração do Socket.IO**:
   - **Transport**: `['polling', 'websocket']` - Polling primeiro, depois websocket
   - **Upgrade**: `true` - Permitir upgrade de polling para websocket
   - **Remember Upgrade**: `true` - Lembrar upgrade para próximas conexões
   - **Timeout**: `10000` - Timeout de 10 segundos (mais curto para detectar problemas mais rápido)
   - **Reconnection**: `Infinity` - Tentar reconectar indefinidamente
   - **Path**: `/socket.io/` - Caminho padrão do Socket.IO
   - **With Credentials**: `false` - Não enviar credenciais (evita problemas com CORS)

2. **Backend - Configuração dos Gateways**:
   - **Transports**: `['polling', 'websocket']` - Permitir polling e websocket
   - **Credentials**: `false` - Não enviar credenciais
   - **Ping Timeout**: `60000` - Timeout de ping (60 segundos)
   - **Ping Interval**: `25000` - Intervalo de ping (25 segundos)
   - **Allow EIO3**: `true` - Permitir cliente Socket.IO v3

3. **Backend - CORS**:
   - **Credentials**: `false` - Não enviar credenciais (evita problemas com WebSocket)
   - **Methods**: `['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']`
   - **Allowed Headers**: `['Content-Type', 'Authorization', 'x-tenant-id']`

## 📋 Configuração no Easypanel

### 1. Variáveis de Ambiente - Frontend

```env
NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
NEXT_PUBLIC_WS_URL=https://api.seu-dominio.com
```

**⚠️ IMPORTANTE**: 
- `NEXT_PUBLIC_WS_URL` deve ser **HTTPS**
- Deve apontar para o **mesmo domínio** do backend
- Não deve ser um domínio diferente

### 2. Variáveis de Ambiente - Backend

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=seu-jwt-secret
DATABASE_URL=postgresql://...
REDIS_HOST=redis
REDIS_PORT=6379
```

### 3. Configuração do Domínio

- **Backend**: `api.seu-dominio.com`
- **Frontend**: `crm.seu-dominio.com`
- **SSL/TLS**: Ativado para ambos (Let's Encrypt)

## 🔍 Verificação

### 1. Testar Conexão Manualmente

```bash
# Testar endpoint do Socket.IO
curl https://api.seu-dominio.com/socket.io/?EIO=4&transport=polling

# Deve retornar uma resposta do Socket.IO
```

### 2. Verificar Logs do Backend

```
[MessagesGateway] Cliente conectado: <socket-id> - Usuário: <email> - Tenant: <tenant-id>
[SchedulerGateway] Cliente conectado ao scheduler: <socket-id> - Usuário: <email> - Tenant: <tenant-id>
[AttendancesGateway] Cliente conectado ao atendimento: <socket-id>
```

### 3. Verificar Console do Navegador

```
[scheduler] Conectando ao WebSocket: https://api.seu-dominio.com/scheduler
[scheduler] ✅ WebSocket conectado com sucesso
WebSocket conectado
[attendance] socket conectado
```

### 4. Verificar Network no DevTools

- Abra o DevTools do navegador
- Vá para a aba "Network"
- Filtre por "WS" (WebSocket) ou "polling"
- Verifique se há conexões ativas
- Verifique se o transporte está como "polling" ou "websocket"

## 🔧 Troubleshooting

### Erro: "Error: timeout"

**Causa**: O WebSocket não consegue conectar ao backend.

**Soluções**:
1. **Verificar URL**: Certifique-se de que `NEXT_PUBLIC_WS_URL` está configurado corretamente
2. **Verificar Backend**: Certifique-se de que o backend está rodando e acessível
3. **Verificar Proxy**: O Easypanel deve fazer proxy reverso automaticamente para WebSocket
4. **Testar Polling**: Se o problema persistir, force o uso de polling apenas:
   ```typescript
   transports: ['polling'], // Apenas polling
   ```

### Erro: "Invalid namespace"

**Causa**: O namespace não está sendo encontrado no backend.

**Soluções**:
1. **Verificar URL**: Certifique-se de que a URL está correta: `https://api.seu-dominio.com/scheduler`
2. **Verificar Backend**: Certifique-se de que o backend está rodando e os namespaces estão registrados
3. **Verificar Logs**: Verifique os logs do backend para ver se o namespace está sendo criado

### Mensagens não aparecem automaticamente

**Causa**: O WebSocket não está conectando ou os eventos não estão sendo recebidos.

**Soluções**:
1. **Verificar Conexão**: Verifique se o WebSocket está conectado (console do navegador)
2. **Verificar Eventos**: Verifique se os eventos `message:new` estão sendo emitidos (logs do backend)
3. **Verificar ChatContext**: Verifique se o `ChatContext` está escutando os eventos corretamente
4. **Verificar Conversa**: Verifique se a conversa está selecionada quando a mensagem é recebida

## 🚀 Deploy

Após fazer as alterações, faça deploy:

```bash
git add .
git commit -m "fix: otimizar WebSocket para Easypanel"
git push origin main
```

## 📝 Notas

- **Polling vs WebSocket**: No Easypanel, o proxy reverso (Traefik) pode ter problemas com WebSocket puro. Por isso, usamos polling primeiro e depois fazemos upgrade para websocket.

- **Ping/Pong**: Configurei intervalos de ping/pong para manter a conexão ativa e evitar timeouts.

- **CORS**: Desabilitei credenciais para evitar problemas com CORS, especialmente com WebSocket.

- **Reconnection**: Configurei para tentar reconectar indefinidamente, para garantir que a conexão seja estabelecida mesmo em caso de problemas temporários.

## 📚 Referências

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO Client Options](https://socket.io/docs/v4/client-options/)
- [Easypanel Documentation](https://easypanel.io/docs)
- [Traefik WebSocket Support](https://doc.traefik.io/traefik/routing/providers/kubernetes-ingress/#websocket)

