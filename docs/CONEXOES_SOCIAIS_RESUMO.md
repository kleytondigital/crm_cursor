# Resumo - Armazenamento e Consulta de Conexões Instagram/Facebook

## ✅ O Que Foi Implementado

### 1. Estrutura de Armazenamento

Os dados das conexões Instagram e Facebook são armazenados na tabela `connections` com os seguintes campos:

- **`id`**: UUID único da conexão
- **`tenantId`**: UUID da empresa (isolamento multi-tenant)
- **`name`**: Nome da conexão (ex: "Instagram - Minha Página")
- **`provider`**: `INSTAGRAM` ou `FACEBOOK`
- **`metadata`** (JSONB): Contém:
  - `pageId`: ID da página Facebook
  - `instagramBusinessId`: ID da conta Instagram Business
  - `accessToken`: Token de acesso da Meta Graph API
  - `tokenExpiresAt`: Data de expiração do token
  - `permissions`: Lista de permissões concedidas
  - `pageName`: Nome da página
  - `instagramUsername`: Username do Instagram
  - `pageCategory`: Categoria da página
- **`refreshToken`**: Token para renovação OAuth (campo separado)
- **`isActive`**: Se a conexão está ativa
- **`status`**: Status da conexão (`ACTIVE`, `STOPPED`, etc.)

### 2. Endpoint de Consulta (Lookup)

Criado endpoint público para o n8n consultar conexões:

**Endpoint:** `GET /webhooks/social/connection/lookup`

**Query Parameters:**
- `provider` (obrigatório): `INSTAGRAM` ou `FACEBOOK`
- `pageId` (opcional): ID da página
- `instagramBusinessId` (opcional): ID da conta Instagram Business

**Exemplo:**
```bash
GET /webhooks/social/connection/lookup?provider=INSTAGRAM&pageId=123456789&instagramBusinessId=17841405309211844
```

**Resposta:**
```json
{
  "found": true,
  "tenantId": "660e8400-e29b-41d4-a716-446655440001",
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "INSTAGRAM",
  "name": "Instagram - Minha Página",
  "pageId": "123456789",
  "instagramBusinessId": "17841405309211844"
}
```

### 3. Fluxo Completo

1. **Webhook da Meta → n8n**: Recebe mensagem com `recipient.id` (pageId ou instagramBusinessId)
2. **n8n → CRM (Lookup)**: Consulta conexão usando o endpoint de lookup
3. **n8n → CRM (Mensagem)**: Envia mensagem com `tenantId` e `connectionId` obtidos

### 4. Isolamento Multi-Tenant

- Todas as conexões são vinculadas a um `tenantId`
- O endpoint de lookup retorna apenas conexões ativas
- Tokens não são expostos no endpoint de lookup (segurança)

---

## 📚 Documentação Criada

1. **`docs/SOCIAL_CONNECTIONS_DATA_STRUCTURE.md`**: Documentação completa da estrutura de dados
2. **`docs/WEBHOOK_INSTAGRAM_QUICK_REFERENCE.md`**: Guia rápido atualizado com o endpoint de lookup
3. **`docs/CONEXOES_SOCIAIS_RESUMO.md`**: Este resumo

---

## 🔧 Arquivos Modificados/Criados

### Backend

- **`src/modules/webhooks/social-webhook.controller.ts`**: 
  - Adicionado endpoint `GET /webhooks/social/connection/lookup`
  
### Documentação

- **`docs/SOCIAL_CONNECTIONS_DATA_STRUCTURE.md`**: Criado
- **`docs/WEBHOOK_INSTAGRAM_QUICK_REFERENCE.md`**: Atualizado
- **`docs/CONEXOES_SOCIAIS_RESUMO.md`**: Criado

---

## 🎯 Próximos Passos

1. ✅ Estrutura de dados documentada
2. ✅ Endpoint de lookup implementado
3. ✅ Documentação completa criada
4. ⏳ Testar endpoint de lookup no ambiente de desenvolvimento
5. ⏳ Configurar n8n para usar o endpoint de lookup

---

## 📝 Notas Importantes

- O endpoint de lookup **não retorna tokens** por segurança
- O n8n deve armazenar tokens recebidos durante a configuração inicial da conexão
- O isolamento multi-tenant é garantido através do campo `tenantId`
- Todas as queries filtram por `isActive = true` e `status = 'ACTIVE'`

