# 🔄 Executar Migrações no Easypanel - B2X CRM

## ⚠️ Problema: "No migration found in prisma/migrations"

Se você está vendo o erro `No migration found in prisma/migrations`, isso significa que as migrações não estão sendo copiadas para o container Docker durante o build.

## ✅ Solução: Verificar se as Migrações Estão no Repositório Git

### 1. Verificar se as Migrações Estão Commitadas

**No seu repositório local:**

```bash
# Verificar se as migrações estão no Git
git ls-files prisma/migrations/

# Se não aparecer nada, as migrações não estão commitadas
```

### 2. Adicionar Migrações ao Git (Se Não Estiverem)

```bash
# Adicionar todas as migrações
git add prisma/migrations/

# Commit
git commit -m "Add Prisma migrations"

# Push
git push
```

### 3. Verificar .gitignore

**Verifique se o `.gitignore` está excluindo as migrações:**

```bash
# Verificar se prisma/migrations está no .gitignore
cat .gitignore | grep -i migrations
```

**Se `prisma/migrations` estiver no `.gitignore`, remova ou ajuste:**

```gitignore
# ❌ NÃO fazer isso (exclui todas as migrações):
prisma/migrations

# ✅ Fazer isso (exclui apenas os arquivos SQL gerados, mas mantém a estrutura):
prisma/migrations/**/migration.sql
```

### 4. Verificar .dockerignore

**Verifique se o `.dockerignore` está excluindo as migrações:**

```bash
# Verificar se prisma/migrations está no .dockerignore
cat .dockerignore | grep -i migrations
```

**As migrações NÃO devem estar no `.dockerignore`!**

## 🔧 Solução Alternativa: Criar Migrações Diretamente no Container

Se as migrações não estiverem no repositório, você pode criá-las diretamente no container:

### 1. Gerar Migrações a Partir do Schema

**No terminal do serviço `backend` no Easypanel:**

```bash
# Gerar migrações a partir do schema atual
npx prisma migrate dev --name init

# Isso criará as migrações baseadas no schema.prisma
```

### 2. Executar Migrações

```bash
# Executar migrações
npx prisma migrate deploy
```

## 🐛 Troubleshooting

### Erro "No migration found in prisma/migrations"

**Causa**: As migrações não estão no container Docker.

**Soluções**:
1. **Verificar se as migrações estão no repositório Git** (veja seção acima)
2. **Verificar se o `.dockerignore` não está excluindo as migrações**
3. **Fazer push das migrações para o repositório Git**
4. **Rebuild da imagem Docker no Easypanel**

### Erro "table does not exist" após executar migrações

**Causa**: As migrações foram executadas, mas as tabelas não foram criadas.

**Soluções**:
1. **Verificar os logs das migrações**:
   ```bash
   npx prisma migrate deploy
   ```
2. **Verificar a conexão com o banco de dados**:
   ```bash
   # Verificar se a variável DATABASE_URL está correta
   echo $DATABASE_URL
   ```
3. **Verificar as permissões do usuário do banco**:
   - O usuário precisa ter permissões para criar tabelas
   - Verifique os logs do PostgreSQL

### Migrações não são copiadas para o container

**Causa**: O `.dockerignore` pode estar excluindo as migrações.

**Solução**: 
1. **Verificar o `.dockerignore`**:
   ```bash
   cat .dockerignore
   ```
2. **Garantir que `prisma/migrations` NÃO está no `.dockerignore`**
3. **Rebuild da imagem Docker no Easypanel**

## 📋 Checklist

Antes de fazer deploy no Easypanel:

- [ ] Migrações estão commitadas no repositório Git
- [ ] `prisma/migrations` não está no `.gitignore`
- [ ] `prisma/migrations` não está no `.dockerignore`
- [ ] Migrações foram testadas localmente
- [ ] Schema do Prisma está atualizado

## 🔄 Processo Completo

### 1. Preparar Migrações Localmente

```bash
# Criar migrações
npx prisma migrate dev --name nome_da_migracao

# Verificar se as migrações foram criadas
ls -la prisma/migrations/

# Commit das migrações
git add prisma/migrations/
git commit -m "Add migration: nome_da_migracao"
git push
```

### 2. Deploy no Easypanel

1. **O Easypanel fará o build automático** (se auto-deploy estiver ativo)
2. **As migrações serão copiadas para o container** (se estiverem no repositório)
3. **Execute as migrações manualmente** ou **configure no Start Command**

### 3. Executar Migrações

**No terminal do serviço `backend` no Easypanel:**

```bash
# Executar migrações
npx prisma migrate deploy

# Verificar status
npx prisma migrate status
```

### 4. Executar Seed (Opcional)

**Após as migrações:**

```bash
# Executar seed
npx prisma db seed
# ou
node prisma/seed.js
```

## 📚 Referências

- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Deploy](https://www.prisma.io/docs/concepts/components/prisma-migrate/production-deployment)
- [Dockerignore](https://docs.docker.com/engine/reference/builder/#dockerignore-file)

