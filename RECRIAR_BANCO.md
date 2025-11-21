# 🔄 Recriar Banco de Dados e Super Admin - Guia Rápido

## ⚠️ Problema Detectado

O erro mostra que está tentando conectar ao hostname do Docker: `dietazap_crm-postgres:5432`

Se você está rodando **localmente** (não Docker), precisa ajustar a `DATABASE_URL`.

## ✅ Solução Rápida

### 1. Verificar/Configurar DATABASE_URL

Abra o arquivo `.env` na raiz do projeto e verifique a `DATABASE_URL`:

**Para MySQL local (XAMPP):**
```env
DATABASE_URL="mysql://root:@localhost:3306/crm?schema=public"
```

**Para PostgreSQL local:**
```env
DATABASE_URL="postgresql://postgres:sua_senha@localhost:5432/crm?schema=public"
```

**Para Docker (se estiver usando):**
```env
DATABASE_URL="postgresql://postgres:sua_senha@dietazap_crm-postgres:5432/crm?schema=public"
```

### 2. Garantir que o Banco Existe

**Para MySQL:**
```bash
mysql -u root -p
CREATE DATABASE IF NOT EXISTS crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

**Para PostgreSQL:**
```bash
psql -U postgres
CREATE DATABASE crm;
\q
```

### 3. Executar Migrações

```bash
# Aplicar todas as migrações existentes
npx prisma migrate deploy
```

### 4. Executar Seed

```bash
# Criar Super Admin e dados iniciais
npm run prisma:seed
```

## 🔐 Credenciais Criadas

Após executar o seed:

**Super Admin:**
- Email: `superadmin@exemplo.com`
- Senha: `superadmin123`
- Role: `SUPER_ADMIN`

**Admin:**
- Email: `admin@exemplo.com`
- Senha: `123456`
- Role: `ADMIN`

**Usuário:**
- Email: `user@exemplo.com`
- Senha: `123456`
- Role: `USER`

## 🚀 Comando Único (Reset Completo)

Se você quer **apagar tudo e recriar do zero**:

```bash
# ⚠️ CUIDADO: Isso apaga TODOS os dados!
npx prisma migrate reset

# Isso vai:
# 1. Apagar todos os dados
# 2. Aplicar todas as migrações
# 3. Executar o seed automaticamente
```

## 📝 Checklist

- [ ] Verificar/ajustar `DATABASE_URL` no `.env`
- [ ] Garantir que o banco existe
- [ ] Executar `npx prisma migrate deploy`
- [ ] Executar `npm run prisma:seed`
- [ ] Testar login com `superadmin@exemplo.com` / `superadmin123`

---

**Pronto!** Agora você pode acessar `/saas` e criar empresas.

