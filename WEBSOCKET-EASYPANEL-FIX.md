# 🔧 Correção de Problemas de WebSocket no Easypanel

## ⚠️ Problemas Identificados

1. **Erro: "Error: timeout"** no WebSocket
2. **Erro: "Invalid namespace"** no scheduler
3. **Mensagens não aparecem automaticamente** - só aparecem após recarregar a página

## 🔍 Análise dos Problemas

### Problema 1: Timeout no WebSocket

O erro de timeout pode ser causado por:
- URL incorreta do WebSocket (`NEXT_PUBLIC_WS_URL` não configurado corretamente)
- Proxy reverso do Easypanel não configurado para WebSocket
- Transport `websocket` não suportado (sem fallback para `polling`)

### Problema 2: Invalid Namespace

O erro "Invalid namespace" indica que:
- O namespace `/scheduler` não está sendo encontrado
- A URL do WebSocket está incorreta
- O proxy reverso não está roteando corretamente para o namespace

### Problema 3: Mensagens não aparecem automaticamente

As mensagens só aparecem após recarregar a página, indicando que:
- O WebSocket não está conectando corretamente
- Os eventos `message:new` não estão sendo recebidos
- O `ChatContext` pode ter problemas com dependências do `useEffect`

## ✅ Soluções Implementadas

### 1. Correção do `useSchedulerSocket`

**Problema**: O hook estava usando `NEXT_PUBLIC_API_URL` ao invés de `NEXT_PUBLIC_WS_URL`.

**Solução**: 
- Alterado para usar `NEXT_PUBLIC_WS_URL` com fallback para `NEXT_PUBLIC_API_URL`
- Adicionado fallback para `polling` transport
- Adicionado `extraHeaders` com `Authorization`
- Adicionado configurações de reconnection
- Adicionado timeout de 20 segundos
- Adicionado logs detalhados para debug

### 2. Configuração do Easypanel

**Importante**: O Easypanel precisa estar configurado corretamente para suportar WebSocket:

1. **Variáveis de Ambiente no Backend**:
   ```env
   PORT=3000
   NODE_ENV=production
   ```

2. **Variáveis de Ambiente no Frontend**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
   NEXT_PUBLIC_WS_URL=https://api.seu-dominio.com
   ```

   **⚠️ IMPORTANTE**: `NEXT_PUBLIC_WS_URL` deve ser o mesmo domínio do backend, não um domínio diferente!

3. **Configuração do Domínio no Easypanel**:
   - No serviço **backend**, configure o domínio: `api.seu-dominio.com`
   - No serviço **frontend**, configure o domínio: `crm.seu-dominio.com`
   - Ambos devem usar HTTPS (Let's Encrypt)

4. **Proxy Reverso do Easypanel**:
   - O Easypanel deve fazer proxy reverso automaticamente para WebSocket
   - Verifique se o proxy reverso está configurado para suportar WebSocket (upgrade de conexão)

### 3. Configuração do Socket.IO no Backend

O backend já está configurado corretamente:
- Namespaces: `/messages`, `/scheduler`, `/attendances`
- CORS: `origin: '*'`
- Autenticação JWT obrigatória

### 4. Verificação de Conexão

Após deploy, verifique:

1. **Logs do Backend**:
   ```
   [MessagesGateway] Cliente conectado: <socket-id> - Usuário: <email> - Tenant: <tenant-id>
   ```

2. **Console do Navegador**:
   ```
   [scheduler] ✅ WebSocket conectado com sucesso
   WebSocket conectado
   ```

3. **Teste de Conexão**:
   - Abra o DevTools do navegador
   - Vá para a aba "Network"
   - Filtre por "WS" (WebSocket)
   - Verifique se há conexões WebSocket ativas

## 🔧 Troubleshooting

### Erro: "Error: timeout"

**Causa**: O WebSocket não consegue conectar ao backend.

**Soluções**:
1. Verifique se `NEXT_PUBLIC_WS_URL` está configurado corretamente
2. Verifique se o backend está rodando e acessível
3. Verifique se o proxy reverso do Easypanel está configurado para WebSocket
4. Tente usar `polling` transport (já configurado como fallback)

### Erro: "Invalid namespace"

**Causa**: O namespace não está sendo encontrado no backend.

**Soluções**:
1. Verifique se a URL do WebSocket está correta: `https://api.seu-dominio.com/scheduler`
2. Verifique se o backend está rodando e os namespaces estão registrados
3. Verifique os logs do backend para ver se o namespace está sendo criado

### Mensagens não aparecem automaticamente

**Causa**: O WebSocket não está conectando ou os eventos não estão sendo recebidos.

**Soluções**:
1. Verifique se o WebSocket está conectado (console do navegador)
2. Verifique se os eventos `message:new` estão sendo emitidos (logs do backend)
3. Verifique se o `ChatContext` está escutando os eventos corretamente
4. Verifique se a conversa está selecionada quando a mensagem é recebida

### Proxy Reverso do Easypanel

**Importante**: O Easypanel usa Traefik como proxy reverso, que deve suportar WebSocket automaticamente. No entanto, verifique:

1. **Configuração do Domínio**:
   - Certifique-se de que o domínio do backend está configurado corretamente
   - Certifique-se de que o SSL/TLS está ativado

2. **Headers do WebSocket**:
   - O Easypanel deve fazer upgrade de conexão automaticamente para WebSocket
   - Verifique se os headers `Upgrade: websocket` e `Connection: Upgrade` estão sendo enviados

3. **Timeout**:
   - O Easypanel pode ter um timeout para conexões WebSocket
   - Verifique se o timeout está configurado corretamente (padrão: 60 segundos)

## 📝 Checklist de Configuração

- [ ] `NEXT_PUBLIC_WS_URL` configurado no frontend (mesmo domínio do backend)
- [ ] `NEXT_PUBLIC_API_URL` configurado no frontend
- [ ] Domínio do backend configurado no Easypanel
- [ ] Domínio do frontend configurado no Easypanel
- [ ] SSL/TLS ativado para ambos os domínios
- [ ] Backend rodando e acessível
- [ ] Logs do backend mostrando conexões WebSocket
- [ ] Console do navegador mostrando conexão WebSocket estabelecida
- [ ] Mensagens aparecendo automaticamente (sem recarregar a página)

## 🚀 Próximos Passos

1. **Fazer deploy das alterações**:
   ```bash
   git add .
   git commit -m "fix: corrigir problemas de WebSocket no Easypanel"
   git push origin main
   ```

2. **Verificar logs do Easypanel**:
   - Verifique os logs do backend para ver se há erros de conexão
   - Verifique os logs do frontend para ver se há erros de conexão

3. **Testar conexão WebSocket**:
   - Abra o DevTools do navegador
   - Vá para a aba "Network"
   - Filtre por "WS" (WebSocket)
   - Verifique se há conexões WebSocket ativas
   - Verifique se os eventos estão sendo recebidos

4. **Testar mensagens em tempo real**:
   - Envie uma mensagem via WhatsApp
   - Verifique se a mensagem aparece automaticamente no chat
   - Verifique se não é necessário recarregar a página

## 📚 Referências

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Easypanel Documentation](https://easypanel.io/docs)
- [Traefik WebSocket Support](https://doc.traefik.io/traefik/routing/providers/kubernetes-ingress/#websocket)

