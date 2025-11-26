# Troubleshooting de Migrations

## Problema: Migration falha com "relation does not exist"

### Erro comum:
```
Error: P3018
A migration failed to apply. New migrations cannot be applied before the error is recovered from.
Database error: ERROR: relation "leads" does not exist
```

### Causas possíveis:

1. **Banco de dados novo sem migrations base aplicadas**
   - A migration `20250125000000_add_custom_lead_status_and_bot_indicator` tenta criar foreign keys em tabelas que ainda não existem
   - Isso acontece quando o banco é novo e as migrations anteriores não foram aplicadas

2. **Migration marcada como falha no Prisma**
   - Quando uma migration falha, o Prisma marca ela como "failed" na tabela `_prisma_migrations`
   - Novas migrations não podem ser aplicadas até que a migration falha seja resolvida

### Soluções:

#### Opção 1: Aplicar todas as migrations do zero (Recomendado para banco novo)

```bash
# No container ou ambiente local
npx prisma migrate deploy
```

Se isso falhar, você pode precisar aplicar as migrations na ordem correta ou resetar o banco:

```bash
# CUIDADO: Isso apaga todos os dados!
npx prisma migrate reset
npx prisma migrate deploy
```

#### Opção 2: Resolver migration marcada como falha

Se a migration já foi marcada como falha, você precisa resolvê-la:

```bash
# Marcar como aplicada (se você aplicou manualmente ou corrigiu o problema)
npx prisma migrate resolve --applied 20250125000000_add_custom_lead_status_and_bot_indicator

# OU marcar como revertida (se você quer pular essa migration)
npx prisma migrate resolve --rolled-back 20250125000000_add_custom_lead_status_and_bot_indicator
```

#### Opção 3: Usar variável de ambiente no deploy

No EasyPanel ou Docker, você pode configurar:

```env
RUN_MIGRATIONS=true
RESOLVE_FAILED_MIGRATIONS=true
```

Isso tentará resolver automaticamente migrations marcadas como falhas antes de aplicar novas migrations.

#### Opção 4: Aplicar migrations manualmente

Se você tem acesso ao banco de dados, pode aplicar a migration SQL manualmente:

```sql
-- Verificar se as tabelas existem
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Se as tabelas base não existem, aplicar migrations anteriores primeiro
```

### Verificar status das migrations

```bash
# Ver quais migrations foram aplicadas
npx prisma migrate status

# Ver histórico de migrations
npx prisma migrate list
```

### Prevenção

A migration `20250125000000_add_custom_lead_status_and_bot_indicator` foi corrigida para:
- Verificar se as tabelas existem antes de criar foreign keys
- Verificar se as constraints já existem antes de criá-las
- Pular operações se as tabelas necessárias não existirem

Isso torna a migration mais robusta e permite que ela seja aplicada mesmo em bancos novos, desde que as migrations anteriores tenham sido aplicadas primeiro.

### Ordem recomendada de aplicação

1. Aplicar todas as migrations base (criação de tabelas principais)
2. Aplicar migrations de alteração de schema
3. Aplicar migrations de dados

Se você está em um ambiente de produção, sempre faça backup antes de aplicar migrations!

