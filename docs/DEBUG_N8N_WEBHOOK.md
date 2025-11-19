# Debug do Webhook N8N - Transcrição de Áudio

## Problema Atual

O endpoint `/webhooks/n8n/messages/{messageId}/transcription` está retornando erro 404 com a mensagem:
```
Route PATCH:/api/errors/not-started not found
```

## Verificações Necessárias

### 1. Verificar se o servidor foi reiniciado

Após as alterações no código, é necessário reiniciar o servidor backend:

```bash
# Se estiver usando Docker
docker-compose restart backend

# Ou se estiver rodando localmente
npm run start:dev
```

### 2. Verificar logs do backend

Procure por logs que começam com:
- `[ApiKeyGuard]` - Verifica se a API Key está sendo lida
- `[JwtAuthGuard]` - Verifica se o guard JWT está pulando a rota
- `[N8N Webhook]` - Verifica se a requisição está chegando ao controller

### 3. Testar endpoint de teste

Primeiro, teste o endpoint de teste (sem API Key):
```bash
curl https://backendcrm.aoseudispor.com.br/webhooks/n8n/test
```

Deve retornar: `{ "message": "N8N Webhooks Controller está funcionando" }`

### 4. Testar endpoint de transcrição manualmente

```bash
curl -X PATCH https://backendcrm.aoseudispor.com.br/webhooks/n8n/messages/21d879b7-c9c1-45c5-95f8-c4853808c2c0/transcription \
  -H "X-API-Key: crm_5c3c76dbdc8b46564c93d3784583fda4ae6a9e71623fef8c47a064604476f1ee" \
  -H "Content-Type: application/json" \
  -d '{"transcriptionText":"teste"}'
```

### 5. Verificar variáveis de ambiente no n8n

No n8n, confirme que:
- `CRM_API_URL=https://backendcrm.aoseudispor.com.br` (sem barra no final)
- `CRM_API_KEY` está correto

### 6. Verificar se a API Key existe no banco

A API Key precisa estar cadastrada no banco de dados. Verifique se:
- A chave está ativa (`isActive = true`)
- A chave não expirou (`expiresAt` é null ou futuro)
- O hash da chave está correto no banco

## Logs Esperados

Quando funcionar corretamente, você deve ver nos logs:

```
[JwtAuthGuard] Rota pública com API Key, pulando autenticação JWT
[ApiKeyGuard] Verificando API Key: { path: '/webhooks/n8n/messages/...', ... }
[ApiKeyGuard] API Key válida: { keyId: '...', tenantId: '...' }
[N8N Webhook] Recebendo atualização de transcrição: { messageId: '...', ... }
```

## Possíveis Causas

1. **Servidor não reiniciado**: As mudanças no código não foram aplicadas
2. **API Key incorreta**: A chave não está no banco ou está inativa/expirada
3. **Header não enviado**: O n8n não está enviando o header `X-API-Key` corretamente
4. **Rota não registrada**: O módulo não foi importado corretamente (improvável)

## Próximos Passos

1. Reinicie o servidor backend
2. Verifique os logs ao fazer uma requisição
3. Teste o endpoint manualmente com curl
4. Verifique a configuração do n8n

