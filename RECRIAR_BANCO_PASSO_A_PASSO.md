# 🔄 Recriar Banco e Super Admin - Passo a Passo

## 📋 Situação Atual

Sua `DATABASE_URL` está configurada para Docker:
```
postgres://postgres:57a3dac704cbaae99d0f@dietazap_crm-postgres:5432/b2x_crm?sslmode=disable
```

## ✅ Opções de Solução

### Opção 1: Usar Docker (Recomendado se já estava usando)

**1. Verificar se o Docker está rodando:**
```bash
docker ps
```

**2. Se o container não estiver rodando, iniciar:**
```bash
docker-compose up -d
```

**3. Executar as migrações:**
```bash
npx prisma migrate deploy
```

**4. Executar o seed:**
```bash
npm run prisma:seed
```

### Opção 2: Usar Banco Local

**1. Editar o arquivo `.env` e mudar a `DATABASE_URL`:**

**Para PostgreSQL local:**
```env
DATABASE_URL="postgresql://postgres:sua_senha@localhost:5432/b2x_crm?schema=public"
```

**Para MySQL local (XAMPP):**
```env
DATABASE_URL="mysql://root:@localhost:3306/b2x_crm?schema=public"
```

**2. Garantir que o banco existe:**

**PostgreSQL:**
```bash
psql -U postgres
CREATE DATABASE b2x_crm;
\q
```

**MySQL:**
```bash
mysql -u root -p
CREATE DATABASE b2x_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

**3. Executar as migrações:**
```bash
npx prisma migrate deploy
```

**4. Executar o seed:**
```bash
npm run prisma:seed
```

## 🚀 Comando Único (Mais Fácil)

Se você quer **apagar tudo e recriar do zero**:

```bash
# ⚠️ CUIDADO: Apaga TODOS os dados e recria tudo
npx prisma migrate reset

# Isso automaticamente:
# 1. Apaga o banco
# 2. Recria o banco
# 3. Aplica todas as migrações
# 4. Executa o seed
```

**Depois de executar, você terá:**

✅ Empresa "Sistema" criada
✅ Empresa "Empresa Exemplo" criada
✅ Super Admin: `superadmin@exemplo.com` / `superadmin123`
✅ Admin: `admin@exemplo.com` / `123456`
✅ Usuário: `user@exemplo.com` / `123456`

## 🔐 Login

1. Acesse: `http://localhost:3001/login`
2. Email: `superadmin@exemplo.com`
3. Senha: `superadmin123`
4. Você será redirecionado para `/saas` (painel Super Admin)

## ⚠️ IMPORTANTE

O comando `npx prisma migrate reset` **APAGA TODOS OS DADOS** e recria tudo do zero.

Se você tem dados importantes, faça backup primeiro!

---

**Escolha a opção que melhor se adequa à sua situação!**

