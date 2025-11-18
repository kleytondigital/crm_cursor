# 🚀 Guia de Deploy - Easypanel

Este documento detalha o processo de deploy da aplicação CRM no Easypanel e gerenciamento de migrations do banco de dados em produção.

## 📋 Índice

- [Migrations em Produção](#migrations-em-produção)
- [Deploy no Easypanel](#deploy-no-easypanel)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Processo de Build](#processo-de-build)
- [Troubleshooting](#troubleshooting)

---

## 🗄️ Migrations em Produção

### Diferença entre `migrate dev` e `migrate deploy`

- **`migrate dev`** (Desenvolvimento):
  - Cria novas migrations
  - Aplica migrations ao banco
  - Gera Prisma Client
  - Reseta banco se necessário
  - **⚠️ NUNCA use em produção!**

- **`migrate deploy`** (Produção):
  - Apenas aplica migrations pendentes
  - Não cria novas migrations
  - Seguro para produção
  - Transacional e reversível
  - **✅ Use sempre em produção!**

### Como Aplicar Migrations em Produção

#### Opção 1: Via Script NPM (Recomendado)

```bash
npm run prisma:migrate:deploy
```

#### Opção 2: Comando Direto

```bash
npx prisma migrate deploy
```

#### Opção 3: Via Docker/Easypanel

No Easypanel, você pode executar comandos no container:

1. Acesse o terminal do container no painel Easypanel
2. Execute:
   ```bash
   cd /app
   npx prisma migrate deploy
   ```

### Verificar Status das Migrations

```bash
# Ver migrations pendentes
npx prisma migrate status

# Ver histórico de migrations aplicadas
npx prisma migrate status --schema=./prisma/schema.prisma
```

---

## 🎯 Deploy no Easypanel

### 1. Preparação Local

Antes de fazer push para produção:

```bash
# 1. Criar migration em desenvolvimento
npx prisma migrate dev --name nome_da_migration

# 2. Testar localmente
npm run start:dev

# 3. Commitar migrations
git add prisma/migrations/
git commit -m "feat: add migration para [descrição]"
git push
```

### 2. Processo de Deploy

O Easypanel detectará o push e iniciará o build automaticamente.

**Build Steps no Easypanel:**

```bash
# 1. Install dependencies
npm ci

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Build application
npm run build

# 4. Apply migrations (IMPORTANTE!)
npm run prisma:migrate:deploy
```

### 3. Script de Build Automático

Adicione ao `package.json`:

```json
{
  "scripts": {
    "build:prod": "npm run prisma:generate && npm run build && npm run prisma:migrate:deploy"
  }
}
```

### 4. Configuração no Easypanel

**Build Command:**
```bash
npm ci && npm run prisma:generate && npm run build
```

**Start Command:**
```bash
npm run start:prod
```

**Pre-Start Command (Migrations):**
```bash
npm run prisma:migrate:deploy
```

---

## 🔐 Variáveis de Ambiente

### Variáveis Obrigatórias

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# JWT
JWT_SECRET="seu-secret-super-secreto"

# API
PORT=3000
NODE_ENV=production

# Frontend
NEXT_PUBLIC_API_URL="https://seu-backend.com"
NEXT_PUBLIC_WS_URL="https://seu-backend.com"

# N8N (se usar)
N8N_MANAGER_WEBHOOK_URL="https://seu-n8n.com/webhook/manager-crm"
```

### Verificar Variáveis

```bash
# No container
env | grep DATABASE_URL
env | grep JWT_SECRET
```

---

## 🏗️ Processo de Build

### Backend (NestJS)

```bash
# 1. Instalar dependências (produção)
npm ci --only=production

# 2. Gerar Prisma Client
npx prisma generate

# 3. Build TypeScript
npm run build

# 4. Aplicar migrations
npx prisma migrate deploy

# 5. Iniciar aplicação
npm run start:prod
```

### Frontend (Next.js)

```bash
# 1. Instalar dependências
npm ci

# 2. Build Next.js
npm run build

# 3. Iniciar aplicação
npm run start
```

---

## 🔧 Troubleshooting

### Problema: Migration não aplicada

**Sintomas:**
- Erro: `Table 'X' doesn't exist`
- Erro: `Column 'Y' not found`

**Solução:**
```bash
# 1. Verificar status
npx prisma migrate status

# 2. Aplicar migrations pendentes
npx prisma migrate deploy

# 3. Regenerar Prisma Client
npx prisma generate
```

### Problema: Migration falhando

**Sintomas:**
- Erro durante `migrate deploy`
- Dados incompatíveis

**Solução:**
```bash
# 1. Fazer backup do banco
pg_dump -h host -U user database > backup.sql

# 2. Resolver migration manualmente
npx prisma migrate resolve --applied "migration_name"

# 3. Ou reverter
npx prisma migrate resolve --rolled-back "migration_name"
```

### Problema: Prisma Client desatualizado

**Sintomas:**
- Erro: `Property 'tempId' does not exist`
- Tipos TypeScript incorretos

**Solução:**
```bash
# Regenerar Prisma Client
npx prisma generate

# Reiniciar aplicação
npm run start:prod
```

### Problema: Conexão com banco falhando

**Sintomas:**
- Erro: `Can't reach database server`
- Timeout na conexão

**Solução:**
```bash
# 1. Verificar DATABASE_URL
echo $DATABASE_URL

# 2. Testar conexão
npx prisma db push --preview-feature

# 3. Verificar firewall/security groups
# 4. Confirmar credenciais no painel do Easypanel
```

---

## 📝 Checklist de Deploy

### Antes do Deploy

- [ ] Testar migrations localmente
- [ ] Commitar todas as mudanças
- [ ] Verificar variáveis de ambiente
- [ ] Fazer backup do banco (se mudanças críticas)
- [ ] Testar build localmente: `npm run build`

### Durante o Deploy

- [ ] Monitorar logs do Easypanel
- [ ] Verificar se migrations foram aplicadas
- [ ] Verificar se aplicação iniciou corretamente
- [ ] Testar endpoints críticos

### Após o Deploy

- [ ] Verificar status das migrations: `npx prisma migrate status`
- [ ] Testar funcionalidades principais
- [ ] Monitorar logs por 15-30 minutos
- [ ] Verificar performance do banco

---

## 🆘 Comandos Úteis

```bash
# Ver migrations pendentes
npx prisma migrate status

# Aplicar migrations
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate

# Abrir Prisma Studio (cuidado em produção!)
npx prisma studio

# Ver estrutura do banco
npx prisma db pull

# Validar schema
npx prisma validate

# Formatar schema
npx prisma format
```

---

## 📚 Recursos

- [Documentação Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Easypanel Docs](https://easypanel.io/docs)
- [Deploy NestJS](https://docs.nestjs.com/techniques/database#migrations)

---

## 🔒 Segurança

### Boas Práticas

1. **Nunca** exponha `DATABASE_URL` em logs
2. **Sempre** faça backup antes de migrations grandes
3. **Teste** migrations em staging primeiro
4. **Use** transações para migrations complexas
5. **Monitore** performance após migrations

### Rollback de Emergência

Se algo der muito errado:

```bash
# 1. Parar aplicação
# 2. Restaurar backup do banco
psql -h host -U user database < backup.sql

# 3. Reverter último commit (se necessário)
git revert HEAD

# 4. Fazer novo deploy
git push

# 5. Aplicar migrations corretas
npx prisma migrate deploy
```

---

**Última atualização:** 2025-01-18  
**Versão do Prisma:** 5.22.0  
**Versão do Node:** 20.x

