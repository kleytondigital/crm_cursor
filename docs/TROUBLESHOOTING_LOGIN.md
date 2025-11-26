# Troubleshooting: Erro 500 no Login

## Problema

Erro `500 (Internal Server Error)` ao tentar fazer login em `https://backcrm.aoseudispor.com.br/auth/login`.

## Causas Comuns

### 1. Tabela `users` não existe

O erro mais comum é quando a migration inicial que cria a tabela `users` ainda não foi aplicada.

**Sintomas:**
- Erro 500 no login
- Logs do PostgreSQL mostram: `ERROR: relation "users" does not exist`
- Logs do backend mostram: `PrismaClientKnownRequestError: P2021` ou similar

**Solução:**

1. **Aplicar todas as migrations:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Verificar se as migrations foram aplicadas:**
   ```bash
   npx prisma migrate status
   ```

3. **Se houver migrations marcadas como falhas, resolvê-las:**
   ```bash
   npx prisma migrate resolve --applied <nome_da_migration>
   ```

4. **Executar o seed para criar usuários iniciais:**
   ```bash
   npm run prisma:seed
   ```

### 2. Tabela `companies` não existe

Se a tabela `companies` não existe, o login também falhará porque `users` tem uma foreign key para `companies`.

**Solução:** A mesma da anterior - aplicar as migrations.

### 3. Prisma Client desatualizado

O Prisma Client pode estar desatualizado em relação ao schema.

**Solução:**
```bash
npx prisma generate
```

### 4. Banco de dados não acessível

O backend pode não estar conseguindo conectar ao banco de dados.

**Verificar:**
- A variável `DATABASE_URL` está configurada corretamente?
- O banco de dados está rodando?
- As credenciais estão corretas?

## Ordem Correta de Setup

Para um novo ambiente, siga esta ordem:

```bash
# 1. Gerar Prisma Client
npx prisma generate

# 2. Aplicar migrations (cria as tabelas)
npx prisma migrate deploy

# 3. Executar seed (cria dados iniciais)
npm run prisma:seed
```

## Verificação Rápida

Para verificar se o banco está configurado corretamente:

```sql
-- Conectar ao banco
psql -U postgres -d crm

-- Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar se existem usuários
SELECT id, email, name, role FROM users;
```

## Logs do Backend

Se o erro persistir, verifique os logs do backend para mais detalhes:

```bash
# No container do backend
docker logs b2x-crm-backend

# Ou no EasyPanel, acesse os logs do serviço
```

## Mensagens de Erro Comuns

### "relation 'users' does not exist"
- **Causa**: Migration inicial não aplicada
- **Solução**: Execute `npx prisma migrate deploy`

### "Invalid credentials" (401)
- **Causa**: Email/senha incorretos OU usuário não existe
- **Solução**: Execute o seed ou verifique as credenciais

### "PrismaClientInitializationError"
- **Causa**: Banco de dados inacessível ou DATABASE_URL incorreta
- **Solução**: Verifique a configuração da DATABASE_URL

## Credenciais Padrão (após seed)

- **Super Admin**: `superadmin@exemplo.com` / `superadmin123`
- **Admin**: `admin@exemplo.com` / `123456`
- **Usuário**: `user@exemplo.com` / `123456`

