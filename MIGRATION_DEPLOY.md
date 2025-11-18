# 🚀 Como Aplicar Migrations em Produção

## ⚡ TL;DR - Faça Agora!

Você tem uma migration pendente que precisa ser aplicada em produção:

```bash
# No Easypanel, acesse o terminal do seu container e execute:
npm run prisma:migrate:deploy
```

**OU** simplesmente faça push e o Easypanel aplicará automaticamente! 🎉

---

## 🎯 Método Automático (Recomendado)

O projeto **já está configurado** para aplicar migrations automaticamente ao iniciar!

### O que você precisa fazer:

```bash
# 1. Commit e push (se ainda não fez)
git add .
git commit -m "feat: add tempId to messages"
git push origin main

# 2. Aguarde o deploy no Easypanel

# 3. Monitore os logs e procure por:
# ✅ Migrations applied successfully
```

**Pronto!** O script `docker-entrypoint.sh` aplica as migrations automaticamente.

---

## 🔧 Método Manual (Se Necessário)

### Opção 1: Terminal do Easypanel

1. Acesse o **Easypanel**
2. Abra o **Terminal** do serviço backend
3. Execute:

```bash
npm run prisma:migrate:deploy
```

### Opção 2: Script Interativo

```bash
# Torna o script executável (primeira vez)
chmod +x scripts/migrate-prod.sh

# Executa o script
./scripts/migrate-prod.sh
```

### Opção 3: Comando Direto

```bash
npx prisma migrate deploy
```

---

## 📦 Migration Atual

**Nome:** `20251118123101_add_temp_id_to_messages`

**O que faz:**
- Adiciona campo `tempId` na tabela `messages`
- Permite correlação entre mensagens otimistas e confirmadas
- Resolve problema de duplicação de mensagens

**Arquivos:**
```
prisma/migrations/20251118123101_add_temp_id_to_messages/
└── migration.sql
```

---

## ✅ Verificação Pós-Deploy

Após aplicar a migration, verifique:

```bash
# 1. Ver status
npx prisma migrate status

# 2. Verificar logs da aplicação
# No Easypanel: Aba "Logs"
# Procurar por: "✅ Migrations applied successfully"

# 3. Testar funcionalidade
# - Enviar mensagem de texto
# - Enviar imagem/vídeo/áudio
# - Verificar se não há duplicação
# - Observar indicadores de loading/status
```

---

## 📚 Documentação Completa

- **Guia Rápido:** [`docs/EASYPANEL_MIGRATIONS.md`](docs/EASYPANEL_MIGRATIONS.md)
- **Guia Detalhado:** [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

---

## 🆘 Precisa de Ajuda?

### Erro: "Table messages has no column tempId"

**Causa:** Migration não foi aplicada

**Solução:**
```bash
npm run prisma:migrate:deploy
```

### Erro: "DATABASE_URL is not set"

**Causa:** Variável de ambiente não configurada

**Solução:**
1. Vá em **Easypanel > Settings > Environment Variables**
2. Verifique `DATABASE_URL`
3. Rebuild do container

### Erro: "Migration already applied"

**Causa:** Migration já foi aplicada anteriormente

**Solução:**
```bash
# Apenas verificar status
npx prisma migrate status

# Deve mostrar: "Database schema is up to date!"
```

---

## 🎯 Comandos Úteis

```bash
# Ver status
npm run prisma:migrate:deploy

# Ver histórico
npx prisma migrate status

# Regenerar Prisma Client
npx prisma generate

# Ver logs do container
docker logs <container-id> -f
```

---

## 🔥 Configuração Automática

O projeto inclui:

✅ Script `docker-entrypoint.sh` - Aplica migrations ao iniciar  
✅ Script `migrate-prod.sh` - Aplicação interativa de migrations  
✅ NPM Script `prisma:migrate:deploy` - Atalho para deploy  
✅ Dockerfile atualizado - Inclui scripts necessários  

**Resultado:** Migrations são aplicadas automaticamente no deploy! 🚀

---

**Última atualização:** 2025-01-18  
**Migration pendente:** `20251118123101_add_temp_id_to_messages`  
**Status:** ⏳ Aguardando aplicação em produção

