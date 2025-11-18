# 📚 Documentação do CRM

## 🚀 Início Rápido

### ⭐ Comece Aqui
- **[START_HERE.md](START_HERE.md)** - Guia de início rápido (5 min)

### 🧪 Testes Rápidos
- **[TESTE_AUDIO_RAPIDO.md](TESTE_AUDIO_RAPIDO.md)** - Testar gravação de áudio (3 min)
- **[README_FIX_DUPLICACAO.md](README_FIX_DUPLICACAO.md)** - Fix de duplicação de mensagens

### 📋 Resumos
- **[RESUMO_FINAL_SESSAO.md](RESUMO_FINAL_SESSAO.md)** - Resumo completo da sessão

---

## 🎙️ Gravação de Áudio

### Implementação v3 (Atual - FUNCIONA!)
- **[AUDIO_FIX_V3_FINAL.md](AUDIO_FIX_V3_FINAL.md)** - ⭐ 🔧 Guia técnico completo v3 FINAL
  - Timeslice de 1000ms (solução final)
  - Logs detalhados com emojis
  - Verificações robustas
  - Diagnóstico de problemas
  - Comandos de debug

- **[TESTE_AUDIO_RAPIDO.md](TESTE_AUDIO_RAPIDO.md)** - ⚡ Teste rápido (2 min)
  - Checklist passo a passo
  - Problemas comuns e soluções
  - Comandos de debug no console

### Implementação v2 (Referência - Blob vazio)
- **[AUDIO_FIX_V2.md](AUDIO_FIX_V2.md)** - Tentativa sem timeslice (não funcionou)

### Implementação v1 (Referência)
- **[AUDIO_RECORDING_IMPROVEMENTS.md](AUDIO_RECORDING_IMPROVEMENTS.md)** - Melhorias implementadas
- **[RESUMO_FIX_AUDIO.md](RESUMO_FIX_AUDIO.md)** - Resumo executivo
- **[VISUAL_AUDIO_RECORDING.md](VISUAL_AUDIO_RECORDING.md)** - Guia visual completo
- **[QUICK_REFERENCE_AUDIO.md](QUICK_REFERENCE_AUDIO.md)** - Referência rápida

### Características v3 (FINAL):
- ✅ Timer visual com contador em tempo real
- ✅ Bolinha vermelha pulsante
- ✅ Botão vermelho pulsante para parar
- ✅ Logs detalhados com emojis
- ✅ Verificação de stream e tracks
- ✅ Mensagens de erro específicas
- ✅ **Timeslice de 1000ms (solução que funciona!)**
- ✅ Blob com dados de áudio
- ✅ Player reproduz corretamente
- ✅ WAHA envia sem problemas

---

## 🔄 Duplicação de Mensagens

### Solução Implementada
- **[README_FIX_DUPLICACAO.md](README_FIX_DUPLICACAO.md)** - ⭐ Guia rápido
  - Solução step-by-step
  - Node n8n pronto
  - Teste simples

- **[SOLUCAO_DUPLICACAO_MENSAGENS.md](SOLUCAO_DUPLICACAO_MENSAGENS.md)** - Solução detalhada
  - Implementação completa
  - Troubleshooting
  - Checklist de verificação

### Debug e Troubleshooting
- **[DEBUG_DUPLICATED_MESSAGES.md](DEBUG_DUPLICATED_MESSAGES.md)** - Debug detalhado
- **[TROUBLESHOOTING_N8N_WEBHOOK.md](TROUBLESHOOTING_N8N_WEBHOOK.md)** - Troubleshooting n8n

### Formato e Especificações
- **[WEBHOOK_RESPONSE_FORMAT.md](WEBHOOK_RESPONSE_FORMAT.md)** - Formato esperado do webhook

### Características:
- ✅ tempId (UUID) para correlação
- ✅ Status visual (⏱️, ✅, ❌)
- ✅ Sem duplicação de mensagens
- ✅ Indicador de loading
- ✅ Banner de erro

---

## 🔧 N8N Integration

### Workflows
- **[n8n-workflows/node-send-to-crm-webhook.json](n8n-workflows/node-send-to-crm-webhook.json)** - Node n8n pronto para importar
- **[n8n-workflows/send-message-webhook-example.json](n8n-workflows/send-message-webhook-example.json)** - Exemplo completo de workflow

### Guias
- **[n8n-workflows/FIX_WORKFLOW_MESSAGES.md](n8n-workflows/FIX_WORKFLOW_MESSAGES.md)** - Guia técnico do workflow
- **[n8n-workflows/VISUAL_FIX_GUIDE.md](n8n-workflows/VISUAL_FIX_GUIDE.md)** - Guia visual do workflow

### Manager Webhook
- **[N8N_WEBHOOK_MANAGER.md](N8N_WEBHOOK_MANAGER.md)** - Documentação do webhook gestor
- **[N8N_ENV_VARS.md](N8N_ENV_VARS.md)** - Variáveis de ambiente n8n

### Templates
- **[n8n-workflows/templates/sdr-template.md](n8n-workflows/templates/sdr-template.md)** - Template SDR de exemplo

---

## 🐛 Troubleshooting

### Áudio
Problemas comuns:
1. "Permissão negada" → Permitir microfone no navegador
2. "Nenhum microfone" → Conectar/testar microfone
3. "Microfone em uso" → Fechar Zoom/Teams/Discord
4. "ondataavailable não dispara" → Gravar por mais tempo, verificar volume
5. "Blob vazio" → Atualizar navegador, limpar cache

**Ver:** [AUDIO_FIX_V2.md](AUDIO_FIX_V2.md) - Seção "Diagnóstico de Problemas"

### Mensagens
Problemas comuns:
1. Mensagens duplicam → Verificar node n8n configurado
2. tempId não retorna → Verificar workflow n8n
3. Status não atualiza → Verificar WebSocket conectado

**Ver:** [DEBUG_DUPLICATED_MESSAGES.md](DEBUG_DUPLICATED_MESSAGES.md)

---

## ⚙️ Configuração

### Environment Variables
- **[ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)** - Todas variáveis de ambiente

### Migrations
- **[EASYPANEL_MIGRATIONS.md](EASYPANEL_MIGRATIONS.md)** - Migrações no Easypanel
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Guia de deployment

### Docker
- **[DOCKER_PERMISSIONS_FIX.md](DOCKER_PERMISSIONS_FIX.md)** - Fix de permissões Docker

---

## 📊 Arquitetura

### Fluxo de Mensagens

```
Frontend → Backend → n8n → WAHA
   ↑          ↑       ↓       ↓
   └──────────┴───────┴───────┘
   (WebSocket + tempId)
```

### Fluxo de Áudio

```
Mic → MediaRecorder → Blob → File → Upload → Backend → n8n → WAHA
 ↓         ↓            ↓
Timer  ondataavailable  Validação
```

### Integração n8n

```
CRM → Manager Webhook → n8n API
          ↓
    create/update/delete
    activate/deactivate
          ↓
    Response com workflowId
```

---

## 🧪 Testing

### Checklists
- **[TESTE_AUDIO_RAPIDO.md](TESTE_AUDIO_RAPIDO.md)** - Checklist de áudio (3 min)
- **[README_FIX_DUPLICACAO.md](README_FIX_DUPLICACAO.md)** - Checklist de mensagens

### Debug Commands

#### Verificar Microfones
```javascript
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    console.log('🎤 Microfones:', devices.filter(d => d.kind === 'audioinput'))
  })
```

#### Testar Captura
```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(s => { console.log('✅ OK'); s.getTracks().forEach(t => t.stop()) })
  .catch(e => console.log('❌ Erro:', e.name))
```

#### Verificar Formatos
```javascript
['audio/ogg; codecs=opus', 'audio/webm', 'audio/mpeg'].forEach(f => {
  console.log(MediaRecorder.isTypeSupported(f) ? `✅ ${f}` : `❌ ${f}`)
})
```

---

## 📋 Índice Completo

### Início
- [START_HERE.md](START_HERE.md) ⭐
- [RESUMO_FINAL_SESSAO.md](RESUMO_FINAL_SESSAO.md)

### Áudio
- [AUDIO_FIX_V2.md](AUDIO_FIX_V2.md) 🔧
- [TESTE_AUDIO_RAPIDO.md](TESTE_AUDIO_RAPIDO.md) ⚡
- [AUDIO_RECORDING_IMPROVEMENTS.md](AUDIO_RECORDING_IMPROVEMENTS.md)
- [RESUMO_FIX_AUDIO.md](RESUMO_FIX_AUDIO.md)
- [VISUAL_AUDIO_RECORDING.md](VISUAL_AUDIO_RECORDING.md)
- [QUICK_REFERENCE_AUDIO.md](QUICK_REFERENCE_AUDIO.md)

### Mensagens
- [README_FIX_DUPLICACAO.md](README_FIX_DUPLICACAO.md) ⭐
- [SOLUCAO_DUPLICACAO_MENSAGENS.md](SOLUCAO_DUPLICACAO_MENSAGENS.md)
- [DEBUG_DUPLICATED_MESSAGES.md](DEBUG_DUPLICATED_MESSAGES.md)
- [WEBHOOK_RESPONSE_FORMAT.md](WEBHOOK_RESPONSE_FORMAT.md)
- [TROUBLESHOOTING_N8N_WEBHOOK.md](TROUBLESHOOTING_N8N_WEBHOOK.md)

### N8N
- [N8N_WEBHOOK_MANAGER.md](N8N_WEBHOOK_MANAGER.md)
- [N8N_ENV_VARS.md](N8N_ENV_VARS.md)
- [n8n-workflows/node-send-to-crm-webhook.json](n8n-workflows/node-send-to-crm-webhook.json)
- [n8n-workflows/FIX_WORKFLOW_MESSAGES.md](n8n-workflows/FIX_WORKFLOW_MESSAGES.md)
- [n8n-workflows/VISUAL_FIX_GUIDE.md](n8n-workflows/VISUAL_FIX_GUIDE.md)
- [n8n-workflows/send-message-webhook-example.json](n8n-workflows/send-message-webhook-example.json)

### Configuração
- [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)
- [EASYPANEL_MIGRATIONS.md](EASYPANEL_MIGRATIONS.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [DOCKER_PERMISSIONS_FIX.md](DOCKER_PERMISSIONS_FIX.md)

---

## 🎯 Próximos Passos

1. **[START_HERE.md](START_HERE.md)** - Leia primeiro (2 min)
2. **[TESTE_AUDIO_RAPIDO.md](TESTE_AUDIO_RAPIDO.md)** - Teste áudio (3 min)
3. **[README_FIX_DUPLICACAO.md](README_FIX_DUPLICACAO.md)** - Verificar mensagens (2 min)

**Total:** ~7 minutos para testar tudo! ⚡

---

## 📞 Suporte

**Problemas?**
1. Veja troubleshooting no documento específico
2. Execute comandos de debug
3. Envie logs completos do console

**Informações necessárias:**
- Navegador e versão
- Sistema operacional
- Logs do console (com emojis)
- Screenshots (se aplicável)

---

## ✅ Status

- ✅ Gravação de áudio v2 - **COMPLETO**
- ✅ Fix duplicação mensagens - **COMPLETO**
- ✅ Timer visual - **COMPLETO**
- ✅ Status de mensagem - **COMPLETO**
- ✅ Integração n8n - **COMPLETO**
- ✅ Documentação - **COMPLETO**

**Sistema 100% funcional!** 🎉

---

**Última atualização:** 2025-11-18  
**Versão:** 2.0

