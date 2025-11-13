# 🔧 Correção Rápida: Migrações Não Encontradas no Easypanel

## ❌ Problema

```
No migration found in prisma/migrations
```

## ✅ Solução: Adicionar Migrações ao Git

### 1. Verificar se as Migrações Estão no Git

**No terminal local:**

```bash
# Verificar quantos arquivos de migração estão no Git
git ls-files prisma/migrations/ | wc -l

# Se aparecer apenas 1 (migration_lock.toml), as migrações não estão no Git
```

### 2. Corrigir .gitignore

**O `.gitignore` foi atualizado para NÃO ignorar as migrações.**

Verifique se o `.gitignore` tem:

```gitignore
# Prisma
# NÃO ignorar migrações - elas são necessárias para o deploy
# prisma/migrations/**/migration.sql
```

**Se ainda tiver `prisma/migrations/**/migration.sql` ativo, remova ou comente essa linha.**

### 3. Adicionar Migrações ao Git

**No terminal local:**

```bash
# Adicionar todas as migrações (agora que não estão mais sendo ignoradas)
git add prisma/migrations/

# Verificar o que será commitado
git status prisma/migrations/

# Commit
git commit -m "Add Prisma migrations to repository"

# Push
git push
```

### 4. Rebuild da Imagem Docker no Easypanel

**No Easypanel:**

1. Vá para o serviço `backend`
2. Clique em **"Rebuild"** ou **"Redeploy"**
3. Aguarde o build completar
4. As migrações agora estarão no container

### 5. Verificar se as Migrações Estão no Container

**No terminal do serviço `backend` no Easypanel:**

```bash
# Verificar se as migrações estão no container
ls -la prisma/migrations/

# Você deve ver todos os diretórios de migração
```

### 6. Executar Migrações

**No terminal do serviço `backend` no Easypanel:**

```bash
# Executar migrações
npx prisma migrate deploy

# Agora deve funcionar e criar todas as tabelas
```

### 7. Executar Seed (Opcional)

**Após as migrações:**

```bash
# Executar seed
npx prisma db seed
# ou
node prisma/seed.js
```

## 🐛 Troubleshooting

### Ainda aparece "No migration found"

**Causa**: As migrações podem não ter sido copiadas para o container.

**Solução**:
1. Verifique se as migrações estão no repositório Git: `git ls-files prisma/migrations/`
2. Verifique se fez push das alterações: `git push`
3. Verifique se fez rebuild da imagem Docker no Easypanel
4. Verifique se as migrações estão no container: `ls -la prisma/migrations/`

### Erro ao adicionar migrações ao Git

**Causa**: O `.gitignore` ainda pode estar ignorando as migrações.

**Solução**:
1. Verifique o `.gitignore`: `cat .gitignore | grep migrations`
2. Remova ou comente a linha que ignora as migrações
3. Adicione as migrações novamente: `git add -f prisma/migrations/`

## 📋 Checklist

Antes de fazer deploy no Easypanel:

- [ ] `.gitignore` não está ignorando `prisma/migrations/**/migration.sql`
- [ ] Migrações estão commitadas no Git: `git ls-files prisma/migrations/`
- [ ] Migrações foram enviadas para o repositório: `git push`
- [ ] Rebuild da imagem Docker foi feito no Easypanel
- [ ] Migrações estão no container: `ls -la prisma/migrations/` (no Easypanel)
- [ ] Migrações foram executadas: `npx prisma migrate deploy` (no Easypanel)

## 📚 Referências

- [EASYPANEL-MIGRATIONS.md](./EASYPANEL-MIGRATIONS.md) - Guia completo sobre migrações
- [EASYPANEL.md](./EASYPANEL.md) - Documentação completa do Easypanel

