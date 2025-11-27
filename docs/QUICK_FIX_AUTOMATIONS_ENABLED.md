# Correção Rápida: automationsEnabled

## Problema Atual

```
The column `companies.automationsEnabled` does not exist in the current database.
```

## Solução Rápida (Execute no Container do Backend)

```bash
# 1. Conectar ao container do backend
# (via EasyPanel ou Docker)

# 2. Aplicar a migration específica
npx prisma migrate deploy

# 3. Se der erro de migration marcada como falha, resolver:
npx prisma migrate resolve --applied 20250125000003_add_automations_enabled_to_company

# 4. Tentar novamente
npx prisma migrate deploy
```

## Alternativa: SQL Direto

Se a migration não funcionar, execute SQL direto:

```sql
-- Verificar se já existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'companies' 
  AND column_name = 'automationsEnabled'
);

-- Adicionar a coluna
ALTER TABLE "companies" 
ADD COLUMN IF NOT EXISTS "automationsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Criar índice
CREATE INDEX IF NOT EXISTS "companies_automationsEnabled_idx" 
ON "companies"("automationsEnabled");
```

Depois marque como aplicada:

```bash
npx prisma migrate resolve --applied 20250125000003_add_automations_enabled_to_company
```

## Após Aplicar

1. Reinicie o backend
2. O login deve funcionar

