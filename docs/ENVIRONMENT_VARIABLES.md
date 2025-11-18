# 🔐 Variáveis de Ambiente - Guia Completo

## 📋 Índice

- [Variáveis Obrigatórias](#variáveis-obrigatórias)
- [Variáveis de N8N](#variáveis-de-n8n)
- [Variáveis Opcionais](#variáveis-opcionais)
- [Configuração no Easypanel](#configuração-no-easypanel)
- [Exemplo Completo](#exemplo-completo)

---

## ⚠️ Variáveis Obrigatórias

### Database
```bash
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
```
**Descrição:** String de conexão com PostgreSQL  
**Onde obter:** Painel do banco de dados (Easypanel/Neon/Supabase)

### JWT
```bash
JWT_SECRET="sua-chave-secreta-super-segura-aqui"
JWT_EXPIRES_IN="7d"
```
**Descrição:** Chave para assinar tokens JWT  
**Como gerar:** `openssl rand -base64 32`

### API
```bash
PORT=3000
NODE_ENV="production"
```
**Descrição:** Porta da API e ambiente

---

## 🤖 Variáveis de N8N

### Para Envio de Mensagens (CRÍTICA!)

```bash
N8N_WEBHOOK_URL_MESSAGES_SEND="https://seu-n8n.com/webhook/send-message"
```

**Descrição:** URL do webhook no n8n que recebe mensagens do CRM para enviar via WhatsApp

**⚠️ IMPORTANTE:** 
- Esta variável é **OBRIGATÓRIA** para envio de mensagens funcionar
- Se não estiver configurada, você verá no log: `N8N_WEBHOOK_URL_MESSAGES_SEND não configurado`
- O webhook deve estar ativo no n8n
- Deve aceitar POST com payload:
  ```json
  {
    "session": "default",
    "phone": "5511999999999",
    "type": "text",
    "text": "Mensagem",
    "tempId": "uuid"
  }
  ```

**Como configurar:**
1. Criar workflow no n8n com Webhook Trigger
2. Path: `/send-message`
3. Ativar workflow
4. Copiar URL do webhook
5. Adicionar no CRM como `N8N_WEBHOOK_URL_MESSAGES_SEND`

---

### Para Automações (Opcional)

```bash
N8N_MANAGER_WEBHOOK_URL="https://seu-n8n.com/webhook/manager-crm"
```

**Descrição:** URL do webhook gestor para criar/gerenciar workflows automaticamente

**Usado para:**
- Criar workflows dinamicamente
- Ativar/desativar workflows
- Configurar automações de SDR, follow-up, etc.

**Se não configurar:** Funcionalidades de automação não estarão disponíveis

---

### URL de Callback do CRM

```bash
CRM_WEBHOOK_URL="https://seu-crm.com"
```

**Descrição:** URL base do CRM para o n8n enviar confirmações de volta

**Usado para:**
- Receber confirmação de mensagens enviadas
- Webhook: `POST {CRM_WEBHOOK_URL}/webhooks/waha`

**Payload esperado:**
```json
{
  "event": "message.sent",
  "session": "default",
  "payload": {
    "id": "messageId",
    "tempId": "uuid",
    ...
  }
}
```

---

## 📱 Variáveis de WAHA (WhatsApp)

```bash
WAHA_URL="https://seu-waha.com"
WAHA_API_KEY="sua-api-key-aqui"
```

**Descrição:** Configuração do servidor WAHA

**⚠️ Nota:** Geralmente o n8n se comunica diretamente com WAHA, não o CRM

---

## 💾 Variáveis de Armazenamento

### MinIO / S3

```bash
MINIO_ENDPOINT="minio.seu-dominio.com"
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY="sua-access-key"
MINIO_SECRET_KEY="sua-secret-key"
MINIO_BUCKET_NAME="crm-uploads"
```

**Descrição:** Armazenamento de arquivos (imagens, áudios, documentos)

**Alternativas:**
- MinIO (self-hosted)
- AWS S3
- DigitalOcean Spaces
- Cloudflare R2

---

## 🔄 Variáveis de Redis

```bash
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
```

**Descrição:** Cache e filas de jobs (Bull Queue)

**Usado para:**
- Processamento assíncrono
- Agendamento de mensagens
- Cache de dados

---

## 📧 Variáveis de Email (Opcional)

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="seu-email@gmail.com"
SMTP_PASSWORD="sua-senha-de-app"
SMTP_FROM="noreply@seucrm.com"
```

**Descrição:** Envio de emails (notificações, convites, etc.)

---

## 🌐 Variáveis de Frontend

```bash
FRONTEND_URL="https://seu-frontend.com"
```

**Descrição:** URL do frontend (usado para CORS e links em emails)

---

## 🔧 Variáveis de Debug

```bash
LOG_LEVEL="info"  # ou "debug" para mais detalhes
```

**Níveis:**
- `error` - Apenas erros
- `warn` - Avisos e erros
- `info` - Informações gerais (padrão)
- `debug` - Detalhes completos (use para troubleshooting)

---

## 📱 Configuração no Easypanel

### Passo a Passo

1. **Acesse seu serviço** no Easypanel
2. Clique em **Settings**
3. Vá para **Environment Variables**
4. Clique em **Add Variable**
5. Adicione cada variável:
   - **Name:** `N8N_WEBHOOK_URL_MESSAGES_SEND`
   - **Value:** `https://seu-n8n.com/webhook/send-message`
6. Clique em **Save**
7. **Rebuild** o container para aplicar

### Screenshot Exemplo

```
┌─────────────────────────────────────┐
│ Environment Variables               │
├─────────────────────────────────────┤
│ Name                              ▼ │
│ N8N_WEBHOOK_URL_MESSAGES_SEND       │
│                                     │
│ Value                             ▼ │
│ https://seu-n8n.com/webhook/send... │
│                                     │
│ [Cancel]  [Save Variable]           │
└─────────────────────────────────────┘
```

---

## 📝 Exemplo Completo

```bash
# =========================================
# DATABASE
# =========================================
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"

# =========================================
# JWT
# =========================================
JWT_SECRET="k2x9mP4nQ7wR1tY5uI8oL3aS6dF9gH2j"
JWT_EXPIRES_IN="7d"

# =========================================
# API
# =========================================
PORT=3000
NODE_ENV="production"

# =========================================
# N8N - ENVIO DE MENSAGENS (CRÍTICO!)
# =========================================
N8N_WEBHOOK_URL_MESSAGES_SEND="https://n8n.meucrm.com/webhook/send-message"

# N8N - Automações (opcional)
N8N_MANAGER_WEBHOOK_URL="https://n8n.meucrm.com/webhook/manager-crm"

# CRM - Callback para n8n
CRM_WEBHOOK_URL="https://crm.meucrm.com"

# =========================================
# WAHA (WhatsApp)
# =========================================
WAHA_URL="https://waha.meucrm.com"
WAHA_API_KEY="waha_xyz123"

# =========================================
# STORAGE (MinIO/S3)
# =========================================
MINIO_ENDPOINT="storage.meucrm.com"
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin123"
MINIO_BUCKET_NAME="crm-uploads"

# =========================================
# REDIS
# =========================================
REDIS_HOST="redis.meucrm.com"
REDIS_PORT=6379
REDIS_PASSWORD="redis123"

# =========================================
# FRONTEND
# =========================================
FRONTEND_URL="https://app.meucrm.com"

# =========================================
# EMAIL (Opcional)
# =========================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="crm@meucrm.com"
SMTP_PASSWORD="senha-app-gmail"
SMTP_FROM="CRM <noreply@meucrm.com>"

# =========================================
# DEBUG
# =========================================
LOG_LEVEL="info"
DEFAULT_TIMEZONE="America/Sao_Paulo"
```

---

## ✅ Verificação

### Como verificar se variáveis estão corretas:

```bash
# 1. Acessar container
docker exec -it <container-id> sh

# 2. Ver todas as variáveis
env | sort

# 3. Ver apenas N8N
env | grep N8N

# 4. Testar webhook
curl -X POST $N8N_WEBHOOK_URL_MESSAGES_SEND \
  -H "Content-Type: application/json" \
  -d '{"session":"default","phone":"5511999999999","type":"text","text":"teste","tempId":"test-123"}'
```

### Logs que indicam sucesso:

```
[N8nApiService] N8nApiService inicializado. Webhook Gestor: https://...
[MessagesService] Enviando POST para webhook: https://...
[MessagesService] Webhook respondeu com status: 200
```

### Logs que indicam problema:

```
[MessagesService] N8N_WEBHOOK_URL_MESSAGES_SEND não configurado.
```

**Solução:** Adicionar a variável no Easypanel e rebuild.

---

## 🔒 Segurança

### ⚠️ NUNCA commitar:
- `.env` (arquivo local)
- Valores reais de secrets
- Credenciais de banco

### ✅ SEMPRE:
- Usar `.env.example` com valores fake
- Manter secrets no painel do Easypanel
- Rotacionar chaves periodicamente
- Usar HTTPS em produção

---

## 🆘 Problemas Comuns

### Erro: "N8N_WEBHOOK_URL_MESSAGES_SEND não configurado"

**Causa:** Variável não definida

**Solução:**
1. Adicionar no Easypanel
2. Rebuild container
3. Verificar logs

### Erro: "Conexão recusada"

**Causa:** URL incorreta ou n8n fora do ar

**Solução:**
1. Verificar se n8n está rodando
2. Testar URL manualmente: `curl <url>`
3. Verificar firewall/DNS

### Erro: "Timeout"

**Causa:** n8n demorando para responder

**Solução:**
1. Otimizar workflow no n8n
2. Verificar performance do servidor

---

## 📚 Referências

- [Troubleshooting Webhook](./TROUBLESHOOTING_N8N_WEBHOOK.md)
- [Formato de Webhook](./WEBHOOK_RESPONSE_FORMAT.md)
- [Guia de Deploy](./DEPLOYMENT.md)

---

**Última atualização:** 2025-01-18  
**Prioridade:** ⚠️ **CRÍTICA** - `N8N_WEBHOOK_URL_MESSAGES_SEND`

