# 🔄 Recriar Banco de Dados e Super Admin

Este guia ajuda você a recriar o banco de dados e o usuário Super Admin após perder os dados.

## ⚠️ IMPORTANTE

Se você perdeu os dados do banco, você precisa:
1. ✅ Verificar/ajustar a conexão do banco de dados
2. ✅ Executar as migrações do Prisma
3. ✅ Executar o seed para criar os dados iniciais

## 📋 Passo a Passo

### 1. Verificar Configuração do Banco de Dados

**Verifique a variável `DATABASE_URL` no seu arquivo `.env`:**

```env
# Exemplo para MySQL local (XAMPP)
DATABASE_URL="mysql://root:@localhost:3306/crm?schema=public"

# Exemplo para PostgreSQL local
DATABASE_URL="postgresql://postgres:senha@localhost:5432/crm?schema=public"

# Exemplo para Docker
DATABASE_URL="postgresql://postgres:senha@dietazap_crm-postgres:5432/crm?schema=public"
```

**IMPORTANTE:** 
- Se você está rodando **localmente** (não Docker), use `localhost` ou `127.0.0.1`
- Se você está rodando no **Docker**, use o hostname do container

### 2. Executar as Migrações

**Execute todas as migrações do Prisma para criar as tabelas:**

```bash
# Opção 1: Desenvolvimento (cria migração se necessário)
npx prisma migrate dev

# Opção 2: Produção (aplica migrações existentes)
npx prisma migrate deploy
```

**Verifique se as migrações foram aplicadas:**
```bash
npx prisma migrate status
```

**Deve aparecer:** `Database schema is up to date`

### 3. Executar o Seed

**Execute o seed para criar os dados iniciais:**

```bash
# Opção 1: Usar o script npm
npm run prisma:seed

# Opção 2: Executar diretamente
node prisma/seed.js

# Opção 3: Usar o comando do Prisma
npx prisma db seed
```

### 4. Verificar Credenciais Criadas

**O seed criará automaticamente:**

✅ **Empresa "Sistema"** (para Super Admins)
✅ **Empresa "Empresa Exemplo"**
✅ **Super Admin:**
   - Email: `superadmin@exemplo.com`
   - Senha: `superadmin123`
   - Role: `SUPER_ADMIN`

✅ **Admin:**
   - Email: `admin@exemplo.com`
   - Senha: `123456`
   - Role: `ADMIN`

✅ **Usuário:**
   - Email: `user@exemplo.com`
   - Senha: `123456`
   - Role: `USER`

✅ **Estágios padrão do Pipeline:**
   - Novo
   - Em Atendimento
   - Aguardando
   - Concluído

## 🔐 Login

Após executar o seed:

1. Acesse a página de login: `http://localhost:3001/login`
2. Use as credenciais do Super Admin:
   - Email: `superadmin@exemplo.com`
   - Senha: `superadmin123`
3. Você será redirecionado para `/saas` (painel Super Admin)

## 🐛 Troubleshooting

### Erro: "Can't reach database server"

**Causa:** A `DATABASE_URL` está incorreta ou o banco não está rodando.

**Solução:**
1. Verifique se o MySQL/PostgreSQL está rodando
2. Verifique se a `DATABASE_URL` está correta no `.env`
3. Teste a conexão:
   ```bash
   # Para MySQL
   mysql -u root -p -h localhost
   
   # Para PostgreSQL
   psql -U postgres -h localhost -d crm
   ```

### Erro: "Table does not exist"

**Causa:** As migrações não foram executadas.

**Solução:**
1. Execute as migrações: `npx prisma migrate deploy`
2. Verifique se foram aplicadas: `npx prisma migrate status`
3. Execute o seed novamente

### Erro: "P1001: Can't reach database server at 'dietazap_crm-postgres:5432'"

**Causa:** Está tentando conectar ao hostname do Docker, mas você está rodando localmente.

**Solução:**
1. Abra o arquivo `.env`
2. Altere a `DATABASE_URL` para usar `localhost`:
   ```env
   DATABASE_URL="postgresql://postgres:senha@localhost:5432/crm?schema=public"
   ```
3. Execute o seed novamente

### Erro: "P1003: Database `crm` does not exist"

**Causa:** O banco de dados não existe.

**Solução:**

**Para MySQL:**
```sql
CREATE DATABASE crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Para PostgreSQL:**
```sql
CREATE DATABASE crm;
```

Depois execute as migrações e o seed novamente.

### Erro: "P2002: Unique constraint failed"

**Causa:** O seed já foi executado anteriormente e os dados já existem.

**Solução:**
O seed usa `upsert`, então ele atualizará os dados existentes. Se você quer **recriar** tudo:

1. Limpe os dados manualmente (cuidado!)
2. Ou delete o banco e recrie:
   ```sql
   DROP DATABASE crm;
   CREATE DATABASE crm;
   ```
3. Execute as migrações e o seed novamente

## 🚀 Comandos Rápidos

**Recriar tudo do zero (CUIDADO - apaga tudo!):**

```bash
# 1. Resetar banco e aplicar migrações
npx prisma migrate reset

# Isso vai:
# - Apagar todos os dados
# - Aplicar todas as migrações
# - Executar o seed automaticamente
```

**Apenas aplicar migrações e seed (se o banco está vazio):**

```bash
# 1. Aplicar migrações
npx prisma migrate deploy

# 2. Executar seed
npm run prisma:seed
```

## 📝 Resumo

1. ✅ Configure a `DATABASE_URL` no `.env`
2. ✅ Execute `npx prisma migrate deploy`
3. ✅ Execute `npm run prisma:seed`
4. ✅ Faça login com `superadmin@exemplo.com` / `superadmin123`

---

**Pronto!** Agora você tem o banco recriado com o Super Admin e pode criar empresas novamente.

