# 🔍 Troubleshooting - Webhook Gestor Meta Ads

## 🎯 Problema: Erro 500 ao Listar Contas / Webhook Não Recebe Chamadas

Se você está recebendo um erro `500 (Internal Server Error)` ao listar contas de anúncio e o webhook do n8n não aparece nas execuções, siga este guia de diagnóstico.

---

## ✅ Checklist Rápido

```bash
# 1. Verificar variável de ambiente
echo $N8N_WEBHOOK_GESTOR_META

# 2. Verificar logs do backend (procure por [MetaAdsGestor])
docker logs <container-id> | grep "MetaAdsGestor"

# 3. Testar webhook manualmente
curl -X POST https://seu-n8n.com/webhook/meta-ads-gestor \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list_contas",
    "tenantId": "uuid-exemplo",
    "connectionId": "uuid-exemplo"
  }'
```

---

## 🔧 Diagnóstico Passo a Passo

### 1. Verificar Configuração da Variável de Ambiente

**No `.env` do backend:**

```bash
N8N_WEBHOOK_GESTOR_META=https://seu-n8n.com/webhook/meta-ads-gestor
```

**Verificar se está carregado:**

Verifique os logs do backend ao iniciar. Deve aparecer:

```
[MetaAdsGestor] Inicializado. Webhook URL: https://...
```

**Se aparecer:**

```
[MetaAdsGestor] N8N_WEBHOOK_GESTOR_META não configurado no .env
```

**Solução:** Adicione a variável `N8N_WEBHOOK_GESTOR_META` no `.env` ou nas variáveis de ambiente do container.

---

### 2. Analisar Logs do Backend

**Buscar logs específicos:**

```bash
# Ver logs do MetaAdsGestor
docker logs <container-id> | grep "MetaAdsGestor"

# Ver logs de erros recentes
docker logs <container-id> --tail 100 | grep -i error
```

**Logs que indicam SUCESSO:**

```
[MetaAdsGestor] Iniciando chamada ao webhook gestor. Action: list_contas, URL: https://...
[MetaAdsGestor] Payload da requisição: {"action":"list_contas","tenantId":"...","connectionId":"..."}
[MetaAdsGestor] Resposta recebida. Status: 200, Data: {"success":true,"data":[...]}
[MetaAdsGestor] Webhook executado com sucesso. Action: list_contas
```

**Logs que indicam PROBLEMA:**

#### A) Variável não configurada

```
[MetaAdsGestor] Tentativa de usar webhook URL sem configuração
ERROR: N8N_WEBHOOK_GESTOR_META não configurado. Configure a variável de ambiente no .env
```

**Solução:** Adicionar `N8N_WEBHOOK_GESTOR_META` no `.env` e reiniciar o backend.

---

#### B) Erro de conexão (ECONNREFUSED, ENOTFOUND)

```
[MetaAdsGestor] Erro de conexão ao webhook. URL: https://..., Código: ECONNREFUSED
```

**Causas possíveis:**
- n8n não está rodando
- URL do webhook está incorreta
- Problema de rede/firewall
- DNS não resolve

**Soluções:**
1. Verificar se o n8n está rodando: `curl https://seu-n8n.com/healthz` (ou similar)
2. Verificar se a URL do webhook está correta (copiar exatamente do n8n)
3. Verificar conectividade de rede do container do backend

---

#### C) Timeout (ETIMEDOUT)

```
[MetaAdsGestor] Timeout ao chamar webhook. URL: https://..., Timeout: 30s
```

**Causas:**
- Workflow do n8n está demorando muito para responder (>30s)
- n8n sobrecarregado
- Problema de rede lenta

**Soluções:**
1. Verificar workflow do n8n e otimizar
2. Aumentar timeout no código (se necessário)
3. Verificar performance do n8n

---

#### D) Erro HTTP (400, 404, 500)

```
[MetaAdsGestor] Erro HTTP ao chamar webhook. Status: 404, URL: https://...
```

**Status 404:** Webhook não encontrado no n8n
- Verificar se a URL do webhook está correta
- Verificar se o workflow está ativo no n8n
- Verificar se o método HTTP está correto (deve ser POST)

**Status 400:** Payload inválido
- Verificar formato do JSON enviado
- Verificar se todos os campos obrigatórios estão presentes

**Status 500:** Erro no workflow do n8n
- Verificar logs do n8n
- Verificar se há erros no workflow

---

#### E) Erro antes de chamar webhook

Se o erro ocorre ANTES de ver os logs `[MetaAdsGestor] Iniciando chamada`, o problema está em outra parte do código:

```
[AdAccountsService] Erro ao listar contas via webhook gestor. ConnectionId: ..., Erro: ...
```

Verifique:
- Se a conexão existe no banco
- Se o token de acesso está presente
- Se há outros erros na validação

---

### 3. Testar Webhook Manualmente

**Teste 1: Verificar se webhook está acessível**

```bash
curl -X POST https://seu-n8n.com/webhook/meta-ads-gestor \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list_contas",
    "tenantId": "test-uuid",
    "connectionId": "test-uuid"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "data": [...]
}
```

**Se receber 404:**
- Verificar URL do webhook no n8n
- Verificar se workflow está ativo

**Se receber 500:**
- Verificar logs do n8n
- Verificar se há erros no workflow

---

### 4. Verificar Workflow no n8n

**Verificações no n8n:**

1. **Webhook está ativo?**
   - O webhook node deve estar "Active" (verde)
   - Verificar se não está em modo de teste

2. **Método HTTP está correto?**
   - Deve ser `POST`

3. **Path está correto?**
   - Deve corresponder à URL configurada no `.env`
   - Exemplo: Se URL é `https://n8n.com/webhook/meta-ads-gestor`, o path deve ser `/meta-ads-gestor`

4. **Workflow processa a requisição?**
   - Verificar se há um node após o webhook que processa a `action`
   - Verificar se retorna resposta no formato esperado

---

### 5. Verificar Formato da Requisição

**Requisição que o CRM envia:**

```json
{
  "action": "list_contas",
  "tenantId": "550e8400-e29b-41d4-a716-446655440000",
  "connectionId": "f44db33c-e129-4782-8b33-d5de17d39444"
}
```

**Verificar no n8n:**

No primeiro node após o webhook, você deve receber:
- `{{ $json.action }}` = `"list_contas"`
- `{{ $json.tenantId }}` = UUID do tenant
- `{{ $json.connectionId }}` = UUID da conexão

---

### 6. Verificar Resposta do n8n

**Formato esperado pelo CRM:**

```json
{
  "success": true,
  "data": [
    {
      "id": "act_123456789",
      "account_id": "123456789",
      "name": "Minha Conta",
      "currency": "BRL",
      "account_status": 1
    }
  ]
}
```

**Erro comum:**

```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

O CRM trata `success: false` como erro e lança exceção.

---

## 🐛 Problemas Comuns e Soluções

### Problema: "N8N_WEBHOOK_GESTOR_META não configurado"

**Causa:** Variável de ambiente não está definida.

**Solução:**
1. Adicionar no `.env`:
   ```bash
   N8N_WEBHOOK_GESTOR_META=https://seu-n8n.com/webhook/meta-ads-gestor
   ```
2. Reiniciar o backend
3. Verificar logs de inicialização

---

### Problema: "Erro de conexão ao webhook"

**Causa:** Não consegue conectar ao n8n.

**Soluções:**
1. Verificar se n8n está rodando
2. Verificar URL (copiar exatamente do n8n)
3. Verificar se não há firewall bloqueando
4. Testar conectividade: `curl https://seu-n8n.com/webhook/meta-ads-gestor`

---

### Problema: "Webhook retornou success=false"

**Causa:** O workflow do n8n retornou erro.

**Soluções:**
1. Verificar logs do n8n
2. Verificar se o workflow consegue processar a `action`
3. Verificar se há token de acesso válido
4. Verificar se a Meta API está respondendo

---

### Problema: Webhook não aparece nas execuções do n8n

**Causas possíveis:**
1. Requisição não está chegando no n8n (erro de rede)
2. Webhook não está ativo no n8n
3. URL está errada
4. Método HTTP está errado

**Diagnóstico:**
```bash
# Ver logs do backend
docker logs <container-id> | grep "MetaAdsGestor"

# Se aparecer "Erro de conexão", a requisição não está chegando
# Se aparecer "Iniciando chamada", a requisição está sendo enviada
```

---

## 📊 Logs Úteis

### Habilitar Logs Detalhados

Os logs já estão habilitados por padrão. Busque por:

```bash
# Logs de inicialização
docker logs <container-id> | grep "MetaAdsGestor.*Inicializado"

# Logs de chamadas
docker logs <container-id> | grep "MetaAdsGestor.*Iniciando chamada"

# Logs de erro
docker logs <container-id> | grep "MetaAdsGestor.*Erro"
```

---

## ✅ Teste Completo

### Script de Teste

```bash
#!/bin/bash

echo "🔍 Testando Webhook Gestor Meta Ads"
echo ""

# 1. Verificar variável
echo "1️⃣ Verificando variável de ambiente..."
if [ -z "$N8N_WEBHOOK_GESTOR_META" ]; then
  echo "❌ N8N_WEBHOOK_GESTOR_META não configurada"
  exit 1
else
  echo "✅ N8N_WEBHOOK_GESTOR_META: $N8N_WEBHOOK_GESTOR_META"
fi

# 2. Testar conectividade
echo ""
echo "2️⃣ Testando conectividade..."
curl -X POST "$N8N_WEBHOOK_GESTOR_META" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list_contas",
    "tenantId": "test",
    "connectionId": "test"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -v

echo ""
echo "✅ Teste concluído"
```

---

## 📝 Checklist Final

- [ ] Variável `N8N_WEBHOOK_GESTOR_META` está configurada no `.env`
- [ ] Backend foi reiniciado após configurar a variável
- [ ] Logs mostram `[MetaAdsGestor] Inicializado. Webhook URL: ...`
- [ ] Webhook está ativo no n8n
- [ ] URL do webhook corresponde à configurada no `.env`
- [ ] Método HTTP do webhook é `POST`
- [ ] Workflow processa a `action` corretamente
- [ ] Workflow retorna resposta no formato `{success: true, data: [...]}`
- [ ] Teste manual com `curl` funciona

---

## 🔗 Referências

- Documentação do webhook: `docs/META_ADS_GESTOR_WEBHOOK.md`
- Documentação de troubleshooting geral: `docs/TROUBLESHOOTING_N8N_WEBHOOK.md`

