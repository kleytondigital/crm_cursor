# Correção do Erro 404 na Transcrição de Áudio

## Problema

O endpoint `/webhooks/n8n/messages/{messageId}/transcription` retorna erro 404 com a mensagem:
```
Route PATCH:/api/errors/not-started not found
```

## Correções Aplicadas

### 1. JwtAuthGuard Ajustado
- Adicionado tratamento para evitar redirects do Passport
- Verificação de rotas públicas antes de tentar autenticar
- Método `handleRequest` sobrescrito para evitar erros

### 2. CORS Atualizado
- Adicionado `X-API-Key` e `x-api-key` aos headers permitidos

### 3. Logs Adicionados
- Logs no `ApiKeyGuard` para depuração
- Logs no `JwtAuthGuard` para verificar se está pulando autenticação
- Logs no controller para verificar se a requisição está chegando

## Passos para Resolver

### 1. **REINICIAR O SERVIDOR BACKEND**

**IMPORTANTE**: As mudanças só terão efeito após reiniciar o servidor!

```bash
# Se estiver usando Docker
docker-compose restart backend

# Ou se estiver rodando localmente
npm run start:dev
```

### 2. Verificar se o Servidor Está Rodando

Teste o endpoint de health:
```bash
curl https://backendcrm.aoseudispor.com.br/health
```

Deve retornar:
```json
{
  "status": "ok",
  "message": "B2X CRM API está funcionando",
  ...
}
```

### 3. Testar Endpoint de Teste

```bash
curl https://backendcrm.aoseudispor.com.br/webhooks/n8n/test
```

Deve retornar:
```json
{
  "message": "N8N Webhooks Controller está funcionando"
}
```

### 4. Verificar Logs do Backend

Após reiniciar, ao fazer uma requisição, você deve ver nos logs:

```
[JwtAuthGuard] Rota pública com API Key, pulando autenticação JWT
[ApiKeyGuard] Verificando API Key: { path: '/webhooks/n8n/messages/...', ... }
[ApiKeyGuard] API Key válida: { keyId: '...', tenantId: '...' }
[N8N Webhook] Recebendo atualização de transcrição: { messageId: '...', ... }
```

### 5. Testar Endpoint de Transcrição Manualmente

```bash
curl -X POST https://backendcrm.aoseudispor.com.br/webhooks/n8n/messages/21d879b7-c9c1-45c5-95f8-c4853808c2c0/transcription \
  -H "X-API-Key: crm_5c3c76dbdc8b46564c93d3784583fda4ae6a9e71623fef8c47a064604476f1ee" \
  -H "Content-Type: application/json" \
  -d '{"transcriptionText":"teste"}'
```

### 6. Verificar API Key no Banco

A API Key precisa estar:
- Cadastrada no banco de dados
- Ativa (`isActive = true`)
- Não expirada (`expiresAt` é null ou futuro)

## Se Ainda Não Funcionar

### Verificar Ordem dos Decorators

No controller, a ordem deve ser:
```typescript
@Controller('webhooks/n8n')
@Public()  // PRIMEIRO
@UseGuards(ApiKeyGuard)  // DEPOIS
export class N8nWebhooksController {
```

### Verificar se o Módulo Está Importado

No `app.module.ts`, verifique se `N8nWebhooksModule` está na lista de imports.

### Verificar Nginx/Proxy

Se estiver usando nginx ou outro proxy reverso, verifique se:
- A rota `/webhooks/n8n/*` está sendo proxyada corretamente
- Não há regras de rewrite que possam estar interferindo

### Verificar Variáveis de Ambiente no n8n

No n8n, confirme:
- `CRM_API_URL=https://backendcrm.aoseudispor.com.br` (sem barra no final)
- `CRM_API_KEY` está correto

## Checklist Final

- [ ] Servidor backend reiniciado
- [ ] Endpoint `/health` funciona
- [ ] Endpoint `/webhooks/n8n/test` funciona
- [ ] Logs mostram que a requisição está chegando
- [ ] API Key está cadastrada e ativa no banco
- [ ] Variáveis de ambiente no n8n estão corretas
- [ ] Workflow do n8n está usando a URL correta

