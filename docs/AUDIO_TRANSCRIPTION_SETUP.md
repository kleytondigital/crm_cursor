# Configuração de Transcrição de Áudio - Guia Rápido

## Configurações Necessárias no n8n

### Variáveis de Ambiente no n8n

Configure as seguintes variáveis de ambiente no seu n8n:

```env
# OpenAI API Key (obrigatório)
OPENAI_API_KEY=sk-...

# URL do Backend do CRM (IMPORTANTE: deve ser o backend, não o frontend)
CRM_API_URL=https://backendcrm.aoseudispor.com.br

# API Key do tenant (criada no painel Super Admin)
CRM_API_KEY=crm_5c3c76dbdc8b46564c93d3784583fda4ae6a9e71623fef8c47a064604476f1ee
```

**⚠️ IMPORTANTE**:
- `CRM_API_URL` deve ser `https://backendcrm.aoseudispor.com.br` (backend)
- **NÃO** use `https://crm.aoseudispor.com.br` (frontend)
- O erro 404 com HTML do Next.js acontece quando usa a URL do frontend

### Como Configurar no n8n

1. Acesse o n8n: `https://controle-de-envio-n8n-editor.y0q0vs.easypanel.host`
2. Vá em **Settings** → **Environment Variables**
3. Adicione as 3 variáveis acima
4. Salve e reinicie o n8n se necessário

## Workflow n8n

1. Importe o workflow: `docs/n8n-workflows/audio-transcription-workflow.json`
2. Configure a credencial OpenAI no node "OpenAI Transcribe"
3. Ative o workflow

## Verificação

### 1. Verificar se o webhook está recebendo requisições

No n8n, vá em **Executions** e verifique se há execuções quando um áudio é recebido.

### 2. Verificar logs do backend

```bash
# Procurar por logs de transcrição
docker logs <container-backend> | grep -i "AUDIO TRANSCRIPTION"
```

Você deve ver logs como:
```
[AUDIO TRANSCRIPTION] Mensagem de áudio detectada. messageId=...
[AUDIO TRANSCRIPTION] Áudio enviado para transcrição com sucesso...
```

### 3. Testar endpoint manualmente

```bash
# Substitua {messageId} por um ID real de mensagem de áudio
curl -X PATCH https://backendcrm.aoseudispor.com.br/webhooks/n8n/messages/{messageId}/transcription \
  -H "X-API-Key: crm_5c3c76dbdc8b46564c93d3784583fda4ae6a9e71623fef8c47a064604476f1ee" \
  -H "Content-Type: application/json" \
  -d '{"transcriptionText":"teste de transcrição"}'
```

## Problemas Comuns

### Erro 404 com HTML do Next.js

**Causa**: `CRM_API_URL` está apontando para o frontend.

**Solução**: Use `https://backendcrm.aoseudispor.com.br` (backend), não `https://crm.aoseudispor.com.br` (frontend).

### Áudio não dispara transcrição

1. Verifique os logs do backend procurando por `[AUDIO TRANSCRIPTION]`
2. Confirme que `N8N_WEBHOOK_URL_AUDIO_TRANSCRIPTION` está configurado no `.env` do backend
3. Verifique se a mensagem é do tipo `AUDIO` e `fromMe === false`

### Transcrição não aparece no frontend

1. Verifique os logs do n8n (Executions) para erros
2. Confirme que a API Key está correta
3. Verifique se o `messageId` usado é o ID interno (UUID), não o messageId do WhatsApp

## URLs Importantes

- **Backend**: `https://backendcrm.aoseudispor.com.br`
- **Frontend**: `https://crm.aoseudispor.com.br`
- **n8n Editor**: `https://controle-de-envio-n8n-editor.y0q0vs.easypanel.host`
- **n8n Webhook**: `https://controle-de-envio-n8n-webhook.y0q0vs.easypanel.host`

## Endpoint de Transcrição

```
PATCH https://backendcrm.aoseudispor.com.br/webhooks/n8n/messages/{messageId}/transcription
X-API-Key: crm_5c3c76dbdc8b46564c93d3784583fda4ae6a9e71623fef8c47a064604476f1ee
Content-Type: application/json

{
  "transcriptionText": "texto transcrito"
}
```

