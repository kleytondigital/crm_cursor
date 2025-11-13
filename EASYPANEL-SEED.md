# 🌱 Executar Seed no Easypanel - B2X CRM

## ⚠️ IMPORTANTE: Ordem de Execução

**As migrações DEVEM ser executadas ANTES do seed!**

## 📋 Passo a Passo

### 1. Verificar se as Migrações Foram Executadas

**No terminal do serviço `backend` no Easypanel:**

```bash
# Verificar status das migrações
npx prisma migrate status
```

**Se aparecer "Database schema is up to date"**, as migrações foram executadas com sucesso.

**Se aparecer "X migration(s) have not yet been applied"**, execute as migrações primeiro.

### 2. Executar as Migrações (Se Necessário)

```bash
# Executar todas as migrações pendentes
npx prisma migrate deploy
```

**Aguarde as migrações completarem**. Isso criará todas as tabelas necessárias no banco de dados.

**Verifique se não há erros** nos logs. Se houver erros, corrija antes de prosseguir.

### 3. Executar o Seed

**Agora você pode executar o seed:**

```bash
# Opção 1: Usar o comando do Prisma
npx prisma db seed

# Opção 2: Executar diretamente
node prisma/seed.js

# Opção 3: Usar o script npm
npm run prisma:seed
```

### 4. Verificar se o Seed Foi Executado

**O seed criará:**
- Empresa "Sistema" (para Super Admins)
- Empresa "Empresa Exemplo"
- Super Admin: `superadmin@exemplo.com` / `superadmin123`
- Admin: `admin@exemplo.com` / `123456`
- Usuário: `user@exemplo.com` / `123456`

**Verifique os logs** para confirmar que o seed foi executado com sucesso.

## 🐛 Troubleshooting

### Erro "table does not exist"

**Causa**: As migrações não foram executadas ainda.

**Solução**:
1. Execute as migrações primeiro: `npx prisma migrate deploy`
2. Aguarde as migrações completarem
3. Execute o seed novamente: `npx prisma db seed`

### Erro "ts-node: not found"

**Causa**: O `ts-node` não está disponível no container de produção.

**Solução**: Use `node prisma/seed.js` ao invés de `npm run prisma:seed` (que usa ts-node).

### Erro de conexão com o banco de dados

**Causa**: A variável `DATABASE_URL` não está configurada corretamente.

**Solução**:
1. Verifique se a variável `DATABASE_URL` está configurada no serviço `backend`
2. Verifique se o serviço PostgreSQL está rodando
3. Verifique se o nome do banco de dados está correto

### Erro de permissão no banco de dados

**Causa**: O usuário do banco não tem permissões para criar tabelas ou inserir dados.

**Solução**:
1. Verifique as permissões do usuário do banco de dados
2. Verifique os logs do PostgreSQL para erros de permissão
3. Certifique-se de que o usuário tem permissões de `CREATE`, `INSERT`, `UPDATE`, `DELETE`

## 📚 Comandos Úteis

### Verificar Status das Migrações

```bash
npx prisma migrate status
```

### Executar Migrações

```bash
npx prisma migrate deploy
```

### Executar Seed

```bash
npx prisma db seed
# ou
node prisma/seed.js
```

### Verificar Tabelas Criadas

```bash
# Conectar ao banco de dados
npx prisma studio
```

### Ver Logs do Seed

```bash
# Os logs do seed aparecem no terminal
# Procure por mensagens como:
# "Seed executado com sucesso!"
# "Credenciais criadas:"
```

## 🔄 Automatizar com Start Command

**No Easypanel, você pode configurar o Start Command do backend para executar as migrações automaticamente:**

```bash
sh -c "npx prisma migrate deploy && node dist/main.js"
```

**⚠️ NOTA**: O seed NÃO deve ser executado automaticamente no Start Command, pois ele deve ser executado apenas uma vez (ou quando necessário).

## 📝 Verificação Final

Após executar o seed, verifique:

1. ✅ As migrações foram executadas com sucesso
2. ✅ O seed foi executado com sucesso
3. ✅ Os usuários foram criados (verifique os logs)
4. ✅ Você consegue fazer login com as credenciais criadas

## 🆘 Suporte

Se você ainda tiver problemas:

1. Verifique os logs do serviço `backend` no Easypanel
2. Verifique os logs do serviço `postgres` no Easypanel
3. Verifique as variáveis de ambiente
4. Verifique a conexão com o banco de dados

