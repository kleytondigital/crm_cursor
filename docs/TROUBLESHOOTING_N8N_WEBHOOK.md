# 🔍 Troubleshooting - Webhook do n8n Não Chamado

## 🎯 Problema

O webhook do n8n não está sendo chamado quando você envia mensagens do CRM.

---

## ✅ Checklist Rápido

```bash
# 1. Verificar variável de ambiente
echo $N8N_WEBHOOK_URL_MESSAGES_SEND

# 2. Verificar logs do backend
docker logs <container-id> | grep "N8N"

# 3. Testar webhook manualmente
curl -X POST https://seu-n8n.com/webhook/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "session": "default",
    "phone": "5511999999999",
    "type": "text",
    "text": "Teste",
    "tempId": "test-123"
  }'

# 4. Verificar se n8n está rodando
curl https://seu-n8n.com/webhook/send-message
```

---

## 🔧 Diagnóstico Passo a Passo

### 1. Verificar Configuração da Variável de Ambiente

**No Easypanel:**

1. Vá em **Settings > Environment Variables**
2. Procure por uma destas variáveis:
   - `N8N_WEBHOOK_URL_MESSAGES_SEND`
   - `N8N_MESSAGES_WEBHOOK_URL` (fallback)

**Formato correto:**
```bash
N8N_WEBHOOK_URL_MESSAGES_SEND=https://seu-n8n.com/webhook/send-message
```

**Verificar no container:**
```bash
# Conectar no container
docker exec -it <container-id> sh

# Verificar variável
env | grep N8N

# Deve mostrar algo como:
# N8N_WEBHOOK_URL_MESSAGES_SEND=https://...
```

---

### 2. Analisar Logs do Backend

**Logs que indicam SUCESSO:**
```
[MessagesService] Enviando POST para webhook: https://seu-n8n.com/webhook/send-message
[MessagesService] Payload: {"session":"default","phone":"5511..."...}
[MessagesService] Webhook respondeu com status: 200
[MessagesService] Mensagem encaminhada ao N8N para envio. session=default phone=5511...
```

**Logs que indicam PROBLEMA:**

#### A) Variável não configurada
```
[MessagesService] N8N_WEBHOOK_URL_MESSAGES_SEND não configurado.
```

**Solução:** Adicionar a variável de ambiente no Easypanel.

#### B) Conexão recusada
```
[MessagesService] Erro ao enviar POST para webhook: connect ECONNREFUSED
[MessagesService] Conexão recusada para https://... Verifique se o n8n está rodando.
```

**Solução:** 
- Verificar se n8n está rodando
- Verificar URL (https vs http)
- Verificar firewall/DNS

#### C) Timeout
```
[MessagesService] Erro ao enviar POST para webhook: timeout of 30000ms exceeded
[MessagesService] Timeout ao chamar https://... Webhook demorou mais de 30000ms.
```

**Solução:**
- Verificar performance do n8n
- Otimizar workflow (remover steps desnecessários)
- Aumentar timeout (se necessário)

#### D) Erro 404
```
[MessagesService] Erro ao enviar POST para webhook: Request failed with status code 404
```

**Solução:**
- Verificar URL do webhook (pode estar errada)
- Verificar se workflow está ativo no n8n
- Verificar path do webhook no n8n

---

### 3. Verificar Workflow no n8n

**Checklist do Workflow:**

- [ ] Workflow está **ativo** (não em draft)
- [ ] Webhook trigger está configurado
- [ ] Webhook path está correto: `/send-message`
- [ ] Webhook aceita método **POST**
- [ ] Webhook retorna resposta (use "Respond to Webhook" node)

**Configuração do Webhook Trigger:**

```
Webhook URL: https://seu-n8n.com/webhook/send-message
HTTP Method: POST
Authentication: None (ou conforme sua configuração)
```

**Testar diretamente no n8n:**

1. Abra o workflow no n8n
2. Clique em "Execute Workflow"
3. No Webhook Trigger, clique em "Listen for Test Event"
4. Do Postman/curl, envie:
   ```bash
   curl -X POST https://seu-n8n.com/webhook/send-message \
     -H "Content-Type: application/json" \
     -d '{
       "session": "default",
       "phone": "5511999999999",
       "type": "text",
       "text": "Teste manual",
       "tempId": "manual-123"
     }'
   ```
5. Verificar se o evento chegou no n8n

---

### 4. Testar Manualmente com curl

**Teste 1: Verificar se webhook responde**
```bash
curl -X GET https://seu-n8n.com/webhook/send-message
```

**Esperado:** 
- 200 OK (se workflow aceita GET)
- OU 404/405 (mas URL existe)

**Teste 2: Enviar payload completo**
```bash
curl -X POST https://seu-n8n.com/webhook/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "session": "default",
    "phone": "5511999999999",
    "type": "text",
    "text": "Teste curl",
    "tempId": "curl-test-123"
  }'
```

**Esperado:** 
```json
{
  "success": true,
  "tempId": "curl-test-123"
}
```

---

### 5. Verificar Rede e DNS

**Teste de conectividade:**
```bash
# Do container do CRM, testar alcançar n8n
docker exec -it <crm-container-id> sh
ping seu-n8n.com
curl https://seu-n8n.com/healthcheck

# Se usar Docker Compose/mesma rede
curl http://n8n:5678/webhook/send-message
```

**Problemas comuns:**
- n8n em rede interna mas URL usa domínio externo
- Firewall bloqueando
- DNS não resolvendo

---

## 🔑 Variáveis de Ambiente

### Variáveis Necessárias

```bash
# Webhook para enviar mensagens (OBRIGATÓRIA)
N8N_WEBHOOK_URL_MESSAGES_SEND=https://seu-n8n.com/webhook/send-message

# OU (fallback)
N8N_MESSAGES_WEBHOOK_URL=https://seu-n8n.com/webhook/send-message

# Webhook para receber confirmações (opcional, mas recomendado)
CRM_WEBHOOK_URL=https://seu-crm.com/webhooks/waha
```

### Como Adicionar no Easypanel

1. **Serviço Backend** > **Settings**
2. **Environment Variables**
3. **Add Variable**
4. **Name:** `N8N_WEBHOOK_URL_MESSAGES_SEND`
5. **Value:** `https://seu-n8n.com/webhook/send-message`
6. **Save**
7. **Rebuild** o container

---

## 🐛 Problemas Específicos

### Problema: "N8N_WEBHOOK_URL_MESSAGES_SEND não configurado"

**Causa:** Variável de ambiente não está definida.

**Solução:**
```bash
# Adicionar no Easypanel
N8N_WEBHOOK_URL_MESSAGES_SEND=https://seu-n8n.com/webhook/send-message

# Rebuild container
```

---

### Problema: "Erro ao enviar POST para webhook"

**Causa:** Várias possibilidades.

**Diagnóstico:**
```bash
# 1. Ver logs completos
docker logs <container-id> --tail 100 | grep -A 5 "Erro ao enviar POST"

# 2. Verificar código de erro
# ECONNREFUSED = n8n não está rodando / URL errada
# ETIMEDOUT = Timeout (n8n muito lento)
# ENOTFOUND = DNS não resolve
```

**Soluções:**
- ECONNREFUSED: Verificar se n8n está up
- ETIMEDOUT: Otimizar workflow n8n
- ENOTFOUND: Corrigir URL/DNS

---

### Problema: Webhook chamado mas não envia para WhatsApp

**Causa:** Problema no workflow do n8n.

**Diagnóstico:**
1. Verificar logs do n8n
2. Verificar se WAHA está configurado
3. Verificar se sessão está conectada

**No workflow do n8n, verificar:**
- URL do WAHA está correta
- API key do WAHA (se necessário)
- Sessão existe e está conectada

---

### Problema: tempId não está sendo retornado

**Causa:** Workflow do n8n não está incluindo tempId na resposta.

**Solução:**
No n8n, no node "Build Response", garantir:
```javascript
const tempId = $node["Extract Data"].json.tempId;

return {
  event: 'message.sent',
  payload: {
    // ... outros campos
    tempId: tempId // ← CRUCIAL!
  }
};
```

---

## 📊 Logs Úteis

### Habilitar Logs Detalhados

```bash
# Em desenvolvimento
LOG_LEVEL=debug npm run start:dev

# Em produção (temporariamente)
# Adicionar variável de ambiente:
LOG_LEVEL=debug
```

### Filtrar Logs Relevantes

```bash
# Ver apenas logs de n8n
docker logs <container-id> | grep "N8N\|n8n\|webhook"

# Ver logs de envio de mensagens
docker logs <container-id> | grep "Mensagem encaminhada\|POST para webhook"

# Ver erros
docker logs <container-id> | grep "ERROR\|Erro"
```

---

## ✅ Teste End-to-End

### Script de Teste Completo

```bash
#!/bin/bash

echo "🔍 Testando integração CRM → n8n → WAHA"
echo ""

# 1. Verificar variáveis
echo "1️⃣ Verificando variáveis de ambiente..."
N8N_URL=$(docker exec <crm-container> printenv N8N_WEBHOOK_URL_MESSAGES_SEND)
if [ -z "$N8N_URL" ]; then
  echo "❌ N8N_WEBHOOK_URL_MESSAGES_SEND não configurada!"
  exit 1
fi
echo "✅ URL do n8n: $N8N_URL"
echo ""

# 2. Testar conectividade
echo "2️⃣ Testando conectividade com n8n..."
if curl -f -s -o /dev/null "$N8N_URL"; then
  echo "✅ n8n acessível"
else
  echo "❌ n8n não responde"
  exit 1
fi
echo ""

# 3. Enviar mensagem de teste
echo "3️⃣ Enviando mensagem de teste..."
RESPONSE=$(curl -X POST "$N8N_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "session": "default",
    "phone": "5511999999999",
    "type": "text",
    "text": "Teste automático",
    "tempId": "test-'$(date +%s)'"
  }' \
  -w "\n%{http_code}" -s)

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Webhook respondeu com 200 OK"
  echo "Response: $BODY"
else
  echo "❌ Webhook retornou $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi

echo ""
echo "✅ Teste completo! Tudo funcionando."
```

---

## 📚 Referências

- [Documentação do Webhook](./WEBHOOK_RESPONSE_FORMAT.md)
- [Exemplo de Workflow n8n](./n8n-workflows/send-message-webhook-example.json)
- [Guia de Deploy](./DEPLOYMENT.md)

---

## 🆘 Ainda com Problemas?

### Informações para Debug

Ao reportar o problema, inclua:

```bash
# 1. Versão do Node
node --version

# 2. Logs do backend (últimas 50 linhas)
docker logs <container-id> --tail 50

# 3. Variáveis de ambiente (sem valores sensíveis)
docker exec <container-id> printenv | grep N8N

# 4. Teste manual do webhook
curl -X POST <seu-webhook-url> \
  -H "Content-Type: application/json" \
  -d '{"session":"default","phone":"5511999999999","type":"text","text":"teste","tempId":"debug-123"}'

# 5. Status do n8n
curl <seu-n8n-url>/healthz
```

---

**Última atualização:** 2025-01-18  
**Status:** ✅ Método `postToUrl` implementado

