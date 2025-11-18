# 🚀 Guia Rápido: Aplicar Migrations no Easypanel

## ⚡ Método Automático (Recomendado)

O projeto está configurado para **aplicar migrations automaticamente** ao iniciar o container! 

O script `docker-entrypoint.sh` é executado antes da aplicação iniciar e:
1. ✅ Verifica configuração do banco
2. 📦 Aplica migrations pendentes
3. 🔧 Gera Prisma Client
4. 📊 Exibe status das migrations
5. 🎯 Inicia a aplicação

**Resultado:** Você só precisa fazer push e o Easypanel cuida do resto! 🎉

---

## 🔧 Método Manual (Quando Necessário)

Se precisar aplicar migrations manualmente (troubleshooting, verificação, etc.):

### Opção 1: Via Terminal do Easypanel (Mais Fácil)

1. **Acesse o Easypanel**
2. **Navegue até seu serviço** (backend)
3. **Clique em "Terminal" ou "Console"**
4. **Execute:**

```bash
# Aplicar migrations
npm run prisma:migrate:deploy

# OU diretamente
npx prisma migrate deploy
```

### Opção 2: Via SSH no Container

```bash
# Conectar no container
docker exec -it <container-id> sh

# Aplicar migrations
cd /app
npm run prisma:migrate:deploy

# Verificar status
npx prisma migrate status
```

### Opção 3: Via Script NPM

```bash
npm run prisma:migrate:deploy
```

---

## 📋 Checklist de Deploy

### Antes de Fazer Push

- [ ] ✅ Testar migration localmente
  ```bash
  npx prisma migrate dev --name nome_da_migration
  ```

- [ ] ✅ Commitar arquivos de migration
  ```bash
  git add prisma/migrations/
  git commit -m "feat: add migration para adicionar campo X"
  ```

- [ ] ✅ Push para repositório
  ```bash
  git push origin main
  ```

### O Easypanel Fará Automaticamente

1. 🔄 Detectar push no repositório
2. 🏗️ Fazer build da aplicação
3. 📦 **Aplicar migrations** (via docker-entrypoint.sh)
4. 🚀 Iniciar aplicação

### Monitorar Deploy

1. **Abra os logs** no painel do Easypanel
2. **Procure por:**
   ```
   🚀 Starting B2X CRM Backend...
   ✅ DATABASE_URL is configured
   📦 Applying database migrations...
   ✅ Migrations applied successfully
   🎯 Starting application...
   ```

3. **Se aparecer erro:**
   ```
   ❌ Failed to apply migrations
   ```
   Veja a seção de Troubleshooting abaixo.

---

## 🆘 Troubleshooting

### Problema: "Migration failed to apply"

**Solução:**
```bash
# 1. Conectar no terminal do container
# 2. Ver status detalhado
npx prisma migrate status

# 3. Ver histórico de migrations
npx prisma migrate history

# 4. Se necessário, resolver manualmente
npx prisma migrate resolve --applied "20251118123101_add_temp_id_to_messages"
```

### Problema: "DATABASE_URL is not set"

**Solução:**
1. Vá em **Settings > Environment Variables** no Easypanel
2. Verifique se `DATABASE_URL` está configurada
3. Formato correto: `postgresql://user:pass@host:5432/db?schema=public`
4. **Rebuild** o container

### Problema: "Prisma Client is not generated"

**Solução:**
```bash
# Regenerar Prisma Client
npx prisma generate

# Reiniciar aplicação
# (ou fazer rebuild no Easypanel)
```

### Problema: "Table already exists"

**Causa:** Migration já foi aplicada mas não foi registrada

**Solução:**
```bash
# Marcar migration como aplicada (sem executar)
npx prisma migrate resolve --applied "nome_da_migration"
```

---

## 📊 Comandos Úteis

### Verificar Status

```bash
# Ver migrations pendentes
npx prisma migrate status

# Ver histórico completo
npx prisma migrate history

# Validar schema
npx prisma validate
```

### Aplicar Migrations

```bash
# Aplicar todas pendentes
npm run prisma:migrate:deploy

# OU
npx prisma migrate deploy
```

### Resolver Problemas

```bash
# Marcar migration como aplicada
npx prisma migrate resolve --applied "migration_name"

# Marcar migration como revertida
npx prisma migrate resolve --rolled-back "migration_name"

# Gerar Prisma Client novamente
npx prisma generate
```

### Ver Logs

```bash
# No Easypanel, acesse a aba "Logs"
# Ou via terminal:
docker logs <container-id> -f
```

---

## 🎯 Fluxo Completo de Deploy

```bash
# 1. DESENVOLVIMENTO (Local)
npx prisma migrate dev --name add_field_tempId

# 2. COMMIT
git add prisma/migrations/
git commit -m "feat: add tempId field to messages"

# 3. PUSH
git push origin main

# 4. EASYPANEL (Automático)
# - Detecta push
# - Faz build
# - Aplica migrations (via docker-entrypoint.sh)
# - Inicia aplicação

# 5. VERIFICAÇÃO
# - Abrir logs no Easypanel
# - Verificar: ✅ Migrations applied successfully
# - Testar aplicação
```

---

## 🔒 Segurança e Boas Práticas

### ✅ Faça

- ✅ Testar migrations em desenvolvimento primeiro
- ✅ Fazer backup do banco antes de migrations críticas
- ✅ Usar nomes descritivos nas migrations
- ✅ Commitar arquivos de migration
- ✅ Monitorar logs após deploy

### ❌ Não Faça

- ❌ Executar `migrate dev` em produção
- ❌ Editar migrations já aplicadas
- ❌ Fazer migrations sem backup
- ❌ Ignorar erros de migration
- ❌ Deletar arquivos de migration

---

## 📚 Arquivos Importantes

```
projeto/
├── prisma/
│   ├── schema.prisma           # Schema do banco
│   ├── migrations/             # Histórico de migrations
│   │   └── 20251118123101_add_temp_id_to_messages/
│   │       └── migration.sql
│   └── seed.js                 # Dados iniciais
├── scripts/
│   └── docker-entrypoint.sh    # 🔥 Aplica migrations automaticamente
├── Dockerfile                  # Build do container
└── package.json                # Scripts NPM
```

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** no Easypanel
2. **Execute** `npx prisma migrate status`
3. **Consulte** este guia
4. **Veja** o arquivo `DEPLOYMENT.md` para mais detalhes

---

**Última Migration:** `20251118123101_add_temp_id_to_messages`  
**Status:** Pronta para deploy ✅  
**Ação Necessária:** Apenas fazer push! 🚀

