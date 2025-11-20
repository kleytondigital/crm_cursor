# Transcrição de Áudios com OpenAI Whisper via n8n

## Visão Geral

Este documento descreve como configurar e usar a transcrição automática de mensagens de áudio recebidas via WhatsApp usando OpenAI Whisper API processado de forma assíncrona no n8n.

## Arquitetura

```
WhatsApp → WAHA Webhook → CRM (salva áudio) → n8n (transcreve) → CRM (atualiza transcrição) → Frontend (exibe)
```

## Fluxo do Sistema

1. **Recebimento do Áudio**: Quando uma mensagem de áudio é recebida via WhatsApp, o CRM salva o áudio no MinIO e cria a mensagem no banco de dados.

2. **Envio para n8n**: O CRM detecta automaticamente mensagens de áudio recebidas (`contentType === 'AUDIO'` e `fromMe === false`) e envia um webhook para o n8n com:
   - `messageId`: ID da mensagem no CRM
   - `audioUrl`: URL pública do áudio no MinIO
   - `tenantId`: ID do tenant

3. **Transcrição no n8n**: O workflow n8n:
   - Recebe o webhook com os dados do áudio
   - Baixa o áudio da URL fornecida
   - Envia para OpenAI Whisper API para transcrição
   - Recebe o texto transcrito

4. **Atualização no CRM**: O n8n envia a transcrição de volta para o CRM via:
   ```
   POST /webhooks/n8n/messages/{messageId}/transcription
   X-API-Key: {apiKey}
   Body: { transcriptionText: "texto transcrito" }
   ```

5. **Exibição no Frontend**: O frontend exibe a transcrição abaixo do player de áudio quando disponível.

## Configuração

### 1. Variáveis de Ambiente no CRM

Adicione ao arquivo `.env` do CRM:

```env
N8N_WEBHOOK_URL_AUDIO_TRANSCRIPTION=https://seu-n8n.com/webhook/audio-transcription
```

**Alternativa**: Você pode usar `N8N_AUDIO_TRANSCRIPTION_WEBHOOK_URL` se preferir.

### 2. Variáveis de Ambiente no n8n

No seu n8n, configure as seguintes variáveis de ambiente:

```env
OPENAI_API_KEY=sk-... # Sua chave da API OpenAI
CRM_API_URL=https://backcrm.aoseudispor.com.br
CRM_API_KEY=crm_... # API Key do tenant (obtida via /api-keys no CRM)
```

**Nota**: Você precisa criar uma API Key no CRM para o tenant que irá usar a transcrição. Veja [SUPER_ADMIN_API_KEYS.md](./SUPER_ADMIN_API_KEYS.md) para mais detalhes.

### 3. Workflow n8n

Importe o workflow JSON fornecido em `docs/n8n-workflows/audio-transcription-workflow.json` no seu n8n.

O workflow contém os seguintes nodes:

1. **Webhook Trigger**: Recebe o webhook do CRM com dados do áudio
2. **HTTP Request (Baixar Áudio)**: Baixa o arquivo de áudio da URL fornecida
3. **OpenAI (Transcrever)**: Envia o áudio para Whisper API e recebe a transcrição
4. **HTTP Request (Atualizar CRM)**: Envia a transcrição de volta para o CRM

## Configuração do Workflow n8n

### Node 1: Webhook Trigger

- **Método**: POST
- **Path**: `/audio-transcription`
- **Response Mode**: Respond When Last Node Finishes

### Node 2: HTTP Request (Baixar Áudio)

- **Method**: GET
- **URL**: `{{ $json.body.audioUrl }}`
- **Response Format**: File
- **Authentication**: None (URL já inclui autenticação do MinIO se necessário)

### Node 3: OpenAI (Transcrever)

- **Resource**: Transcribe
- **File**: `{{ $json }}` (arquivo baixado do node anterior)
- **Language**: pt (Português - opcional, pode deixar vazio para detecção automática)
- **API Key**: `{{ $env.OPENAI_API_KEY }}`

**Configuração da API Key**:
1. Acesse Settings → Credentials no n8n
2. Crie uma credencial OpenAI
3. Adicione sua API Key da OpenAI
4. Use essa credencial no node

### Node 4: HTTP Request (Atualizar CRM)

- **Method**: POST
- **URL**: `{{ $env.CRM_API_URL }}/webhooks/n8n/messages/{{ $('Webhook Trigger').first().json.body.messageId }}/transcription`
- **Send Headers**: Sim
- **Headers**:
  - `X-API-Key`: `{{ $env.CRM_API_KEY }}`
  - `Content-Type`: `application/json`
- **Send Body**: Sim
- **Body Type**: JSON
- **Body**:
```json
{
  "transcriptionText": "{{ $json.text }}"
}
```

**IMPORTANTE**:
- `CRM_API_URL` deve apontar para o **backend** (ex: `https://backcrm.aoseudispor.com.br`), **NÃO** para o frontend
- O `messageId` vem do payload do webhook (`$json.body.messageId`) e é o **ID interno** (UUID) do banco de dados
- Certifique-se de que a URL do backend está correta e acessível do n8n

## API Endpoints

### Atualizar Transcrição da Mensagem

```http
POST /webhooks/n8n/messages/{messageId}/transcription
X-API-Key: crm_...
Content-Type: application/json

{
  "transcriptionText": "Texto transcrito do áudio"
}
```

**Parâmetros**:
- `messageId` (path): ID da mensagem no CRM (UUID)

**Body**:
- `transcriptionText` (string): Texto transcrito do áudio

**Resposta de Sucesso** (200):
```json
{
  "id": "uuid",
  "transcriptionText": "Texto transcrito do áudio",
  ...
}
```

**Erros**:
- `404 Not Found`: Mensagem não encontrada
- `401 Unauthorized`: API Key inválida ou ausente

## Exemplo de Payload Enviado pelo CRM para n8n

```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "audioUrl": "https://minio.example.com/chats/2025-01/audio-uuid.ogg",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Exemplo de Resposta do n8n para o CRM

```json
{
  "transcriptionText": "Olá, gostaria de saber mais sobre o produto que vocês oferecem."
}
```

## Frontend

### Exibição da Transcrição

Quando uma mensagem de áudio possui transcrição, ela é exibida abaixo do player de áudio em um card estilizado:

- **Mensagens do usuário**: Fundo azul translúcido (`bg-blue-500/20`)
- **Mensagens do lead**: Fundo cinza (`bg-gray-100 dark:bg-gray-800/50`)

### Indicador "Transcrevendo..."

Para mensagens de áudio recebidas sem transcrição ainda, o frontend exibe um indicador "Transcrevendo..." com um ícone de relógio animado.

## Troubleshooting

### Erro 404 ao atualizar transcrição

**Sintomas**: O n8n retorna erro 404 com HTML do Next.js ao tentar atualizar a transcrição.

**Causas possíveis**:
1. `CRM_API_URL` está apontando para o frontend ao invés do backend
2. URL do backend está incorreta ou inacessível do n8n
3. Rota não existe no backend

**Soluções**:
1. Verifique que `CRM_API_URL` no n8n aponta para o **backend** (ex: `https://backcrm.aoseudispor.com.br`), **NÃO** para o frontend
2. Teste manualmente o endpoint:
   ```bash
   curl -X POST https://backcrm.aoseudispor.com.br/webhooks/n8n/messages/{messageId}/transcription \
     -H "X-API-Key: {sua-api-key}" \
     -H "Content-Type: application/json" \
     -d '{"transcriptionText":"teste"}'
   ```
3. Verifique os logs do backend para ver se a requisição está chegando
4. Confirme que o `messageId` no payload do n8n é o **ID interno** (UUID), não o `messageId` do WhatsApp

**Nota**: Se o erro retornar HTML do Next.js (página 404), significa que a requisição está indo para o frontend ao invés do backend.

### Áudio não é enviado para transcrição

1. Verifique se `N8N_WEBHOOK_URL_AUDIO_TRANSCRIPTION` está configurado no `.env` do CRM
2. Verifique os logs do CRM para erros ao enviar webhook:
   ```
   docker logs <container-id> | grep -i "transcrição\|audio\|n8n"
   ```
3. Confirme que a mensagem é do tipo `AUDIO` e `fromMe === false`

### Transcrição não aparece no frontend

1. Verifique se o n8n está processando o workflow corretamente
2. Verifique os logs do n8n (Executions) para erros
3. Confirme que a API Key do CRM está correta
4. Verifique se o endpoint `/webhooks/n8n/messages/{messageId}/transcription` está acessível
5. Verifique se o `messageId` está correto no payload do n8n

### Erro 404 ao atualizar transcrição (HTML do Next.js)

**Sintoma**: n8n retorna erro 404 com HTML do Next.js (página "404: This page could not be found").

**Causa**: `CRM_API_URL` está apontando para o **frontend** ao invés do **backend**.

**Solução**:
1. Verifique que `CRM_API_URL` no n8n aponta para o **backend**:
   - ✅ Correto: `https://backcrm.aoseudispor.com.br`
   - ❌ Errado: `https://crm.aoseudispor.com.br` (frontend)
2. Teste manualmente o endpoint:
   ```bash
   curl -X POST https://backcrm.aoseudispor.com.br/webhooks/n8n/messages/{messageId}/transcription \
     -H "X-API-Key: {sua-api-key}" \
     -H "Content-Type: application/json" \
     -d '{"transcriptionText":"teste"}'
   ```
3. Verifique os logs do backend para confirmar que a requisição está chegando

### Erro 404 ao atualizar transcrição (Mensagem não encontrada)

1. Confirme que o `messageId` está correto e existe no banco de dados
2. Verifique que o `messageId` é o **ID interno** (UUID), não o `messageId` do WhatsApp
3. Verifique se a API Key tem permissão para atualizar mensagens
4. Confirme que o `tenantId` da API Key corresponde ao tenant da mensagem

### Erro ao transcrever no OpenAI

1. Verifique se `OPENAI_API_KEY` está configurada corretamente no n8n
2. Confirme que há créditos disponíveis na conta OpenAI
3. Verifique o tamanho do arquivo de áudio (Whisper tem limite de 25MB)
4. Verifique os logs do n8n para detalhes do erro da OpenAI

### Workflow n8n não é acionado

1. Verifique se o webhook está ativo no n8n
2. Confirme que a URL do webhook está correta no `.env` do CRM
3. Teste manualmente o webhook do n8n:
   ```bash
   curl -X POST https://seu-n8n.com/webhook/audio-transcription \
     -H "Content-Type: application/json" \
     -d '{
       "messageId": "test-uuid",
       "audioUrl": "https://example.com/audio.mp3",
       "tenantId": "test-tenant-id"
     }'
   ```

## Considerações Importantes

1. **Processamento Assíncrono**: A transcrição é processada de forma assíncrona e não bloqueia o recebimento da mensagem.

2. **Custos**: O uso da OpenAI Whisper API gera custos. Consulte a [página de preços da OpenAI](https://openai.com/pricing) para mais informações.

3. **Limite de Tamanho**: O Whisper API tem limite de 25MB por arquivo. Arquivos maiores precisam ser divididos ou comprimidos antes da transcrição.

4. **Latência**: A transcrição pode levar alguns segundos dependendo do tamanho do áudio. O frontend exibe "Transcrevendo..." durante o processamento.

5. **Idioma**: O workflow está configurado para português (`pt`), mas pode ser alterado no node OpenAI do n8n. Deixar vazio permite detecção automática de idioma.

6. **API Key por Tenant**: Cada tenant deve ter sua própria API Key configurada no n8n para garantir isolamento e segurança.

## Exemplo Completo

### 1. Mensagem de áudio recebida

O WhatsApp envia uma mensagem de áudio para o CRM via WAHA webhook.

### 2. CRM salva e envia para n8n

```
POST https://seu-n8n.com/webhook/audio-transcription
{
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "audioUrl": "https://minio.example.com/chats/2025-01/audio-uuid.ogg",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 3. n8n processa

- Baixa o áudio
- Transcreve via Whisper
- Obtém: "Olá, gostaria de saber mais sobre o produto."

### 4. n8n atualiza CRM

```
POST https://backcrm.aoseudispor.com.br/webhooks/n8n/messages/550e8400-e29b-41d4-a716-446655440000/transcription
X-API-Key: crm_abc123...
{
  "transcriptionText": "Olá, gostaria de saber mais sobre o produto."
}
```

### 5. Frontend exibe

A mensagem de áudio agora mostra o player e abaixo a transcrição: "Olá, gostaria de saber mais sobre o produto."

## Referências

- [OpenAI Whisper API Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [n8n Documentation](https://docs.n8n.io/)
- [N8N_WEBHOOK_MANAGER.md](./N8N_WEBHOOK_MANAGER.md) - Configuração de API Keys no CRM

