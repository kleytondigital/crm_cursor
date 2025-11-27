# Aplicar Migration: automationsEnabled

## Problema

O erro `The column 'companies.automationsEnabled' does not exist` ocorre porque:

1. O Prisma Client foi gerado com o schema que inclui `automationsEnabled`
2. A migration `20250125000003_add_automations_enabled_to_company` ainda não foi aplicada no banco

## Solução

### Opção 1: Aplicar a Migration Específica (Recomendado)

No container do backend, execute:

```bash
# 1. Verificar se a migration já foi aplicada
npx prisma migrate status

# 2. Se a migration estiver pendente, aplicar todas as migrations
npx prisma migrate deploy

# 3. Se houver erro, resolver manualmente
npx prisma migrate resolve --applied 20250125000003_add_automations_enabled_to_company
```

### Opção 2: Aplicar SQL Direto (Se a migration falhar)

Conecte-se ao banco e execute:

```sql
-- Verificar se a coluna já existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'automationsEnabled';

-- Se não existir, adicionar
ALTER TABLE "companies" 
ADD COLUMN IF NOT EXISTS "automationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Criar índice
CREATE INDEX IF NOT EXISTS "companies_automationsEnabled_idx" 
ON "companies"("automationsEnabled");
```

Depois, marque a migration como aplicada:

```bash
npx prisma migrate resolve --applied 20250125000003_add_automations_enabled_to_company
```

### Opção 3: Regenerar Prisma Client (Temporário)

Se você não pode aplicar a migration agora, pode regenerar o Prisma Client sem o campo:

1. Comentar temporariamente o campo no `schema.prisma`:
```prisma
model Company {
  // ... outros campos ...
  // automationsEnabled Boolean @default(false) // Temporariamente comentado
}
```

2. Regenerar o Prisma Client:
```bash
npx prisma generate
```

3. **IMPORTANTE**: Descomentar o campo e aplicar a migration depois.

## Verificação

Após aplicar a migration, verifique:

```sql
-- Verificar se a coluna existe
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name = 'automationsEnabled';

-- Deve retornar:
-- automationsEnabled | boolean | false
```

## Após Aplicar

1. Reinicie o backend
2. Tente fazer login novamente
3. O erro deve desaparecer

