# Correção do Workflow de Transcrição de Áudio

## Problema

O erro `404 - Route PATCH:/api/errors/not-started not found` ocorre porque o node "Update CRM" está tentando acessar `$json.body.messageId`, mas no contexto desse node, `$json` é o resultado do node anterior (OpenAI Transcribe), que retorna apenas `{ text: "..." }`.

## Solução

No node "Update CRM", use a referência ao node "Webhook Trigger" para obter o `messageId`:

### URL Correta:
```
={{ $env.CRM_API_URL }}/webhooks/n8n/messages/{{ $('Webhook Trigger').first().json.body.messageId }}/transcription
```

### Explicação:
- `$('Webhook Trigger')` - Referencia o node "Webhook Trigger"
- `.first()` - Pega o primeiro item do array
- `.json.body.messageId` - Acessa o messageId do body original

### Body (permanece igual):
```json
{
  "transcriptionText": "{{ $json.text }}"
}
```

Aqui `$json.text` está correto porque vem do node OpenAI Transcribe.

## Verificação no n8n

1. Abra o workflow de transcrição
2. Selecione o node "Update CRM"
3. No campo URL, verifique se está usando:
   ```
   {{ $env.CRM_API_URL }}/webhooks/n8n/messages/{{ $('Webhook Trigger').first().json.body.messageId }}/transcription
   ```
4. Se estiver usando `{{ $json.body.messageId }}`, altere para a versão correta acima

## Teste

Após a correção, teste enviando um áudio via WhatsApp e verifique:
1. O workflow é executado no n8n
2. A URL gerada está correta (verifique nos logs de execução)
3. O endpoint do CRM recebe a requisição (verifique logs do backend)

