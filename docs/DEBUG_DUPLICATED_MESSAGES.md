# 🐛 Debug: Mensagens Duplicadas

## 🎯 Problema Atual

Mensagens enviadas aparecem duplicadas:
- Uma com **relógio** (⏱️) = mensagem otimista "sending"
- Outra com **double check** (✅✅) = mas SEM `messageId` do WhatsApp

## 🔍 Análise do Payload

```json
{
  "id": "48e8cfa5-93d9-43f1-8a72-1382f1d4a512",
  "messageId": null,  // ← PROBLEMA! Deveria ter ID do WhatsApp
  "tempId": "b9893e02-aa97-4438-aef4-4555dda127ff",  // ✅ Presente
  "contentText": "teste de mesage duplicada",
  "timestamp": null,  // ← PROBLEMA! Deveria ter timestamp
  "senderType": "USER",
  "direction": "OUTGOING"
}
```

### ⚠️ Problemas Identificados

1. **`messageId: null`** - Significa que a mensagem NÃO foi para o WhatsApp ainda
2. **`timestamp: null`** - Sem timestamp do WhatsApp
3. **`tempId` presente** - Isso está correto ✅

### 🤔 O Que Isso Significa?

Este payload é a **resposta imediata** do endpoint `/messages/send`, não a confirmação do WhatsApp!

A mensagem foi:
1. ✅ Criada no banco pelo backend
2. ❌ NÃO foi enviada para o n8n (ou n8n não respondeu)
3. ❌ NÃO tem confirmação do WhatsApp
4. ❌ WebSocket emitiu a mensagem do banco (sem messageId)

---

## 🔬 Diagnóstico

### 1. Verificar Logs do Backend

```bash
docker logs <container-id> --tail 100 | grep -E "POST para webhook|N8N|Mensagem encaminhada"
```

#### ✅ Logs que DEVEM aparecer:

```
[MessagesService] Enviando POST para webhook: https://seu-n8n.com/webhook/send-message
[MessagesService] Payload: {"session":"default","phone":"556296724968","type":"text","text":"teste de mesage duplicada","tempId":"b9893e02-..."}
[MessagesService] Webhook respondeu com status: 200
[MessagesService] Mensagem encaminhada ao N8N para envio. session=default phone=556296724968
```

#### ❌ Logs que indicam PROBLEMA:

```
# Problema 1: Variável não configurada
[MessagesService] N8N_WEBHOOK_URL_MESSAGES_SEND não configurado.

# Problema 2: Webhook não responde
[N8nApiService] Erro ao enviar POST para webhook: connect ECONNREFUSED
[N8nApiService] Conexão recusada. Verifique se o n8n está rodando.

# Problema 3: Timeout
[N8nApiService] Timeout. Webhook demorou mais de 30s.
```

---

### 2. Verificar Webhook do n8n

**URL esperada (do seu backend):**
```
Variável: N8N_WEBHOOK_URL_MESSAGES_SEND
Valor: https://seu-n8n.com/webhook/send-message
```

**Testar manualmente:**
```bash
curl -X POST https://seu-n8n.com/webhook/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "session": "default",
    "phone": "556296724968",
    "type": "text",
    "text": "Teste manual",
    "tempId": "test-manual-123"
  }'
```

**Resposta esperada do n8n:**
```json
{
  "success": true,
  "tempId": "test-manual-123"
}
```

---

### 3. Verificar Workflow no n8n

**Checklist:**
- [ ] Workflow está **ativo** (Production mode)
- [ ] Webhook trigger path: `/send-message`
- [ ] Webhook aceita **POST**
- [ ] Workflow processa e envia para WAHA
- [ ] Workflow envia callback para CRM com `tempId`

**Endpoint de callback esperado:**
```
POST https://seu-crm.com/webhooks/waha
```

**Payload do callback:**
```json
{
  "event": "message.sent",
  "session": "default",
  "payload": {
    "id": "true_556296724968@c.us_3EB0XXXXX",  // ← messageId do WhatsApp
    "timestamp": 1700000000,
    "from": "...",
    "to": "556296724968@c.us",
    "fromMe": true,
    "body": "teste de mesage duplicada",
    "tempId": "b9893e02-aa97-4438-aef4-4555dda127ff"  // ← CRUCIAL!
  }
}
```

---

## 🔧 Passo a Passo para Resolver

### Passo 1: Verificar Variável de Ambiente

```bash
# No Easypanel ou via SSH
docker exec -it <container-id> sh
env | grep N8N_WEBHOOK_URL_MESSAGES_SEND

# Deve mostrar algo como:
# N8N_WEBHOOK_URL_MESSAGES_SEND=https://seu-n8n.com/webhook/send-message
```

**Se não aparecer:**
1. Adicionar no Easypanel: **Settings > Environment Variables**
2. Name: `N8N_WEBHOOK_URL_MESSAGES_SEND`
3. Value: URL do seu webhook do n8n
4. Save e Rebuild

---

### Passo 2: Verificar se n8n Responde

```bash
# Testar do servidor do CRM
curl -X POST $N8N_WEBHOOK_URL_MESSAGES_SEND \
  -H "Content-Type: application/json" \
  -d '{
    "session": "default",
    "phone": "556296724968",
    "type": "text",
    "text": "Teste",
    "tempId": "debug-'$(date +%s)'"
  }'
```

**Sucesso:** Retorna `{ "success": true, "tempId": "..." }`  
**Erro 404:** URL está errada ou workflow não existe  
**Erro timeout:** n8n está lento ou offline  
**ECONNREFUSED:** n8n não está acessível

---

### Passo 3: Ativar Logs Detalhados (Temporariamente)

**No Easypanel:**
1. **Environment Variables**
2. Adicionar: `LOG_LEVEL=debug`
3. Rebuild

**Verificar logs:**
```bash
docker logs <container-id> -f | grep -i "webhook\|n8n"
```

---

### Passo 4: Verificar Callback do n8n

O workflow do n8n DEVE enviar callback para:
```
POST https://seu-crm.com/webhooks/waha
```

**Verificar logs do webhook:**
```bash
docker logs <container-id> | grep "Mensagem com tempId recebida"

# Deve mostrar:
# [WahaWebhookController] Mensagem com tempId recebida: b9893e02-...
```

**Se não aparecer:** O callback do n8n não está chegando!

---

## 🎯 Fluxo Correto (Como DEVE Funcionar)

```
1. Frontend
   └─ Cria mensagem otimista com tempId ⏱️
   └─ POST /messages/send { tempId: "abc-123" }

2. Backend
   └─ Salva no banco (sem messageId ainda)
   └─ POST para n8n webhook { tempId: "abc-123" }
   └─ NÃO emite WebSocket (comentário linha 177)
   └─ Retorna mensagem para frontend

3. n8n Webhook
   └─ Recebe payload com tempId
   └─ Envia para WAHA
   └─ WAHA retorna { id: "true_..." }
   └─ Envia callback para CRM com tempId

4. Backend (Webhook WAHA)
   └─ Recebe callback com tempId e messageId
   └─ Atualiza mensagem no banco
   └─ Emite via WebSocket

5. Frontend
   └─ Recebe via WebSocket
   └─ Encontra otimista pelo tempId
   └─ SUBSTITUI otimista pela confirmada ✅✅
   └─ UMA única mensagem!
```

---

## 🐛 Fluxo Atual (Com Problema)

```
1. Frontend
   └─ Cria mensagem otimista ⏱️
   └─ POST /messages/send

2. Backend
   └─ Salva no banco
   └─ ❌ Webhook do n8n NÃO é chamado (ou falha)
   └─ Retorna mensagem

3. ??? (n8n não responde)

4. ??? (Sem callback do WAHA)

5. Resultado
   └─ Mensagem otimista fica com ⏱️ (tempId: abc-123)
   └─ Outra mensagem sem messageId aparece (id: 48e8...)
   └─ DUPLICAÇÃO!
```

---

## ✅ Checklist de Verificação

### Backend (CRM)
- [ ] Variável `N8N_WEBHOOK_URL_MESSAGES_SEND` configurada
- [ ] Logs mostram "Enviando POST para webhook"
- [ ] Logs mostram "Webhook respondeu com status: 200"
- [ ] Não há erro "N8N_WEBHOOK_URL_MESSAGES_SEND não configurado"

### n8n
- [ ] Workflow está ativo (Production mode)
- [ ] Webhook trigger configurado
- [ ] Path: `/send-message`
- [ ] WAHA está configurado no workflow
- [ ] Callback para CRM está configurado
- [ ] Inclui `tempId` na resposta

### Teste Manual
- [ ] `curl` para webhook do n8n funciona
- [ ] n8n envia para WAHA
- [ ] WAHA retorna sucesso
- [ ] n8n envia callback para CRM
- [ ] CRM emite via WebSocket com tempId

---

## 📊 Comandos de Debug

```bash
# 1. Ver variáveis de ambiente
docker exec -it <container-id> env | grep N8N

# 2. Ver logs completos
docker logs <container-id> --tail 200

# 3. Ver apenas webhooks
docker logs <container-id> | grep -i "webhook\|n8n"

# 4. Acompanhar em tempo real
docker logs <container-id> -f

# 5. Testar webhook manualmente
curl -X POST $N8N_WEBHOOK_URL_MESSAGES_SEND \
  -H "Content-Type: application/json" \
  -d '{"session":"default","phone":"556296724968","type":"text","text":"debug","tempId":"manual-test"}'

# 6. Ver se callback chegou
docker logs <container-id> | grep "tempId recebida"
```

---

## 🆘 Solução Rápida

Se você precisa resolver AGORA:

1. **Verificar variável:**
   ```bash
   docker exec <container-id> printenv N8N_WEBHOOK_URL_MESSAGES_SEND
   ```
   - Se vazio: Adicionar no Easypanel e rebuild

2. **Testar webhook:**
   ```bash
   curl -X POST <URL-DO-WEBHOOK> -d '{"session":"default","phone":"556296724968","type":"text","text":"teste","tempId":"123"}'
   ```
   - Se erro 404: Verificar workflow no n8n
   - Se timeout: n8n está lento/offline

3. **Ver logs:**
   ```bash
   docker logs <container-id> | grep "POST para webhook"
   ```
   - Se não aparece: Variável não está configurada
   - Se aparece erro: Problema na comunicação com n8n

---

## 📚 Referências

- [Troubleshooting Webhook](./TROUBLESHOOTING_N8N_WEBHOOK.md)
- [Variáveis de Ambiente](./ENVIRONMENT_VARIABLES.md)
- [Formato do Webhook](./WEBHOOK_RESPONSE_FORMAT.md)

---

**Próximo passo:** Verifique os logs do backend e nos mostre o que aparece quando você envia uma mensagem!

