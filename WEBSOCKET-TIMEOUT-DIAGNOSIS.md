# 🔍 Diagnóstico de Timeout no WebSocket

## ⚠️ Problema: Timeout no WebSocket do Scheduler

O erro de timeout indica que o WebSocket não está conseguindo estabelecer conexão com o backend.

## 🔍 Possíveis Causas

### 1. **URL do WebSocket Incorreta**

**Sintoma**: Timeout ao conectar ao WebSocket.

**Solução**: Verificar se `NEXT_PUBLIC_WS_URL` está configurado corretamente no Easypanel:

```env
NEXT_PUBLIC_WS_URL=https://api.seu-dominio.com
```

**⚠️ IMPORTANTE**: 
- `NEXT_PUBLIC_WS_URL` deve ser o mesmo domínio do backend
- Deve usar HTTPS em produção
- Não deve ter barra final (`/`)

### 2. **Proxy Reverso do Easypanel não Configurado para WebSocket**

**Sintoma**: Timeout ao conectar, mesmo com URL correta.

**Solução**: O Easypanel usa Traefik como proxy reverso, que deve suportar WebSocket automaticamente. No entanto, verifique:

1. **Domínio Configurado Corretamente**:
   - No serviço backend, configure o domínio: `api.seu-dominio.com`
   - Ative SSL/TLS (Let's Encrypt)

2. **Headers do WebSocket**:
   - O Traefik deve fazer upgrade automático de conexão HTTP para WebSocket
   - Verifique se os headers `Upgrade: websocket` e `Connection: Upgrade` estão sendo enviados

3. **Timeout do Proxy**:
   - O Traefik pode ter timeout para conexões WebSocket
   - Verifique se o timeout está configurado corretamente (padrão: 60 segundos)

### 3. **Backend não Acessível**

**Sintoma**: Timeout ao conectar, sem resposta do backend.

**Solução**: Verificar se o backend está rodando e acessível:

1. **Verificar Logs do Backend**:
   ```bash
   # No Easypanel, verifique os logs do serviço backend
   # Você deve ver: "🚀 B2X CRM está rodando na porta 3000"
   ```

2. **Testar Conexão HTTP**:
   ```bash
   curl https://api.seu-dominio.com/health
   # Deve retornar uma resposta (mesmo que seja 401 ou 404)
   ```

3. **Testar Conexão WebSocket**:
   ```bash
   # Testar se o Socket.IO está respondendo
   curl https://api.seu-dominio.com/socket.io/?EIO=4&transport=polling
   # Deve retornar uma resposta (mesmo que seja erro de autenticação)
   ```

### 4. **Problema de CORS**

**Sintoma**: Timeout ou erro de CORS ao conectar.

**Solução**: Verificar configuração de CORS no backend:

```typescript
// src/main.ts
app.enableCors({
  origin: true, // Permitir todas as origens
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
});
```

### 5. **Token JWT Inválido ou Expirado**

**Sintoma**: Timeout ao conectar, mas conexão HTTP funciona.

**Solução**: Verificar se o token JWT está sendo enviado corretamente:

1. **Verificar Token no LocalStorage**:
   ```javascript
   // No console do navegador
   localStorage.getItem('token')
   // Deve retornar um token válido
   ```

2. **Verificar Token no Header**:
   ```javascript
   // No console do navegador, verificar se o token está sendo enviado
   // Abra o DevTools > Network > WS (WebSocket)
   // Verifique se o header Authorization está sendo enviado
   ```

### 6. **Problema com Polling Transport**

**Sintoma**: Timeout mesmo com polling configurado.

**Solução**: Verificar se o polling está funcionando:

1. **Verificar Logs do Backend**:
   ```bash
   # No Easypanel, verifique os logs do serviço backend
   # Você deve ver conexões sendo estabelecidas
   ```

2. **Verificar Console do Navegador**:
   ```javascript
   // No console do navegador, verifique se há erros
   // Verifique se o Socket.IO está tentando conectar via polling
   ```

## 🛠️ Soluções Implementadas

### 1. **Atualização do `useSchedulerSocket`**

- ✅ Usar `NEXT_PUBLIC_WS_URL` ao invés de `NEXT_PUBLIC_API_URL`
- ✅ Configurar polling primeiro, depois websocket
- ✅ Adicionar timeout de 10 segundos (mais curto para detectar problemas mais rápido)
- ✅ Adicionar reconexão automática
- ✅ Adicionar logs detalhados para debug

### 2. **Atualização do `TenantMiddleware`**

- ✅ Pular middleware para rotas `/socket.io/` (WebSocket não usa middleware HTTP)

### 3. **Configuração dos Gateways**

- ✅ Configurar `transports: ['polling', 'websocket']` em todos os gateways
- ✅ Configurar `pingTimeout` e `pingInterval` adequados
- ✅ Configurar `allowEIO3: true` para compatibilidade

## 📋 Checklist de Verificação

- [ ] `NEXT_PUBLIC_WS_URL` configurado no Easypanel (mesmo domínio do backend)
- [ ] Domínio do backend configurado no Easypanel
- [ ] SSL/TLS ativado para o domínio do backend
- [ ] Backend rodando e acessível
- [ ] Token JWT válido no localStorage
- [ ] Console do navegador mostrando tentativas de conexão
- [ ] Logs do backend mostrando conexões WebSocket
- [ ] Polling transport funcionando (fallback)

## 🚀 Próximos Passos

1. **Verificar Configuração no Easypanel**:
   - Verifique se `NEXT_PUBLIC_WS_URL` está configurado corretamente
   - Verifique se o domínio do backend está configurado
   - Verifique se o SSL/TLS está ativado

2. **Verificar Logs**:
   - Verifique os logs do backend no Easypanel
   - Verifique o console do navegador
   - Verifique se há erros de conexão

3. **Testar Conexão**:
   - Teste a conexão HTTP do backend
   - Teste a conexão WebSocket do backend
   - Verifique se o polling está funcionando

4. **Verificar Token**:
   - Verifique se o token JWT está sendo enviado corretamente
   - Verifique se o token é válido
   - Verifique se o token não expirou

## 📚 Referências

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Easypanel Documentation](https://easypanel.io/docs)
- [Traefik WebSocket Support](https://doc.traefik.io/traefik/routing/providers/kubernetes-ingress/#websocket)

