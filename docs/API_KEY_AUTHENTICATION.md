# Autenticação via API Key - Webhooks Sociais

## 📋 Visão Geral

Todos os endpoints de webhook social (`/webhooks/social/*`) agora utilizam **autenticação via API Key global** em vez de assinatura HMAC.

---

## 🔑 Criando uma API Key Global

### Pré-requisitos

- Você precisa ser **Super Admin** no CRM
- Acesso ao painel de configurações

### Passo a Passo

1. **Acesse o CRM** como Super Admin
2. **Navegue até** a página de API Keys (geralmente em Configurações > API Keys)
3. **Clique em** "Criar Nova API Key"
4. **Preencha os campos:**
   - Nome: Ex: "N8N Social Webhooks" ou "n8n Instagram/Facebook"
   - Marque a opção **"Global"** ⚠️ (obrigatório para webhooks sociais)
5. **Copie a chave gerada** - ela só será exibida uma vez!
6. **Guarde em local seguro** (não compartilhe)

**Formato da API Key:** `crm_abc123def456...` (sempre começa com `crm_`)

---

## 🔧 Configuração no n8n

### 1. Variável de Ambiente

Configure a API Key como variável de ambiente no n8n:

```bash
CRM_API_KEY=crm_sua-chave-aqui
```

### 2. Usando nos Workflows

Em todos os nodes HTTP Request que chamam o CRM, adicione o header:

```javascript
headers: {
  'Content-Type': 'application/json',
  'X-API-Key': $env.CRM_API_KEY
}
```

---

## 📡 Endpoints Protegidos

Todos os seguintes endpoints requerem a API Key no header `X-API-Key`:

### 1. Receber Mensagens

```
POST /webhooks/social
```

**Headers obrigatórios:**
```
Content-Type: application/json
X-API-Key: crm_abc123...
```

### 2. Confirmar Mensagem Enviada

```
POST /webhooks/social/message.sent
```

**Headers obrigatórios:**
```
Content-Type: application/json
X-API-Key: crm_abc123...
```

### 3. Consultar Conexão (Lookup)

```
GET /webhooks/social/connection/lookup?provider=INSTAGRAM&pageId=123456789
```

**Headers obrigatórios:**
```
X-API-Key: crm_abc123...
```

---

## ✅ Exemplo Completo (n8n)

### Node HTTP Request para Lookup

```javascript
// URL
https://backcrm.aoseudispor.com.br/webhooks/social/connection/lookup?provider=INSTAGRAM&pageId={{$json.entry[0].messaging[0].recipient.id}}

// Method
GET

// Headers
{
  "X-API-Key": "{{$env.CRM_API_KEY}}"
}
```

### Node HTTP Request para Enviar Mensagem

```javascript
// URL
https://backcrm.aoseudispor.com.br/webhooks/social

// Method
POST

// Headers
{
  "Content-Type": "application/json",
  "X-API-Key": "{{$env.CRM_API_KEY}}"
}

// Body
{
  "tenantId": "{{$json.tenantId}}",
  "connectionId": "{{$json.connectionId}}",
  "provider": "INSTAGRAM",
  "message": {
    "id": "{{$json.message.id}}",
    "from": {
      "id": "{{$json.message.from.id}}",
      "name": "{{$json.message.from.name}}"
    },
    "text": "{{$json.message.text}}",
    "type": "{{$json.message.type}}",
    "timestamp": "{{$json.message.timestamp}}",
    "isFromMe": false
  }
}
```

---

## ❌ Erros Comuns

### 401 Unauthorized - "API Key não fornecida"

**Causa:** Header `X-API-Key` não está sendo enviado.

**Solução:**
- Verifique se o header está configurado no node HTTP Request
- Confirme que a variável de ambiente `CRM_API_KEY` está definida no n8n

### 401 Unauthorized - "API Key inválida ou expirada"

**Causa:** API Key está incorreta ou foi desativada/expirada.

**Solução:**
- Verifique se a API Key está correta
- Confirme que a API Key está ativa no CRM
- Verifique se a API Key não expirou (se tiver data de expiração)
- Gere uma nova API Key se necessário

### 403 Forbidden - "Apenas API Keys globais podem acessar este endpoint"

**Causa:** API Key não é global (foi criada para um tenant específico).

**Solução:**
- Delete a API Key atual
- Crie uma nova API Key como Super Admin
- **Marque a opção "Global"** ao criar

---

## 🔄 Migração de HMAC para API Key

Se você estava usando assinatura HMAC anteriormente:

### Antes (HMAC)
```javascript
const crypto = require('crypto');
const secret = $env.WEBHOOK_SOCIAL_SECRET;
const signature = crypto.createHmac('sha256', secret).update(JSON.stringify($json)).digest('hex');

headers: {
  "x-n8n-signature": signature
}
```

### Agora (API Key)
```javascript
headers: {
  "X-API-Key": $env.CRM_API_KEY
}
```

**Muito mais simples!** ✨

---

## 🔐 Boas Práticas

1. **Use uma API Key Global separada** para webhooks sociais
   - Facilita revogação se necessário
   - Permite rastreamento de uso

2. **Não compartilhe a API Key**
   - Mantenha em variáveis de ambiente
   - Nunca commite no código

3. **Rotacione regularmente**
   - Crie novas keys periodicamente
   - Revogue keys antigas

4. **Monitore o uso**
   - Verifique logs de acesso
   - Alerte sobre uso anormal

---

## 📚 Referências

- [Documentação Completa de API Keys](../docs/SUPER_ADMIN_API_KEYS.md)
- [Estrutura de Dados das Conexões](./SOCIAL_CONNECTIONS_DATA_STRUCTURE.md)
- [Guia Rápido do Webhook Instagram](./WEBHOOK_INSTAGRAM_QUICK_REFERENCE.md)

