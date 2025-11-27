# Comandos Úteis para Baseline

## Comandos NPM

### Criar Baseline

```bash
npm run baseline:create
```

Cria o baseline completo:
- Gera SQL consolidado
- Arquivar migrations antigas
- Cria documentação

### Verificar Baseline

```bash
npm run baseline:verify
```

Verifica se:
- Baseline existe e está correto
- SQL é válido
- Schema está sincronizado

### Marcar Baseline como Aplicada (Produção)

```bash
npm run baseline:resolve
```

Equivale a:
```bash
npx prisma migrate resolve --applied 000_init_baseline
```

## Comandos Prisma Diretos

### Aplicar Migrations

```bash
# Aplicar todas as migrations (baseline + novas)
npx prisma migrate deploy

# Ver status das migrations
npx prisma migrate status
```

### Desenvolvimento

```bash
# Criar nova migration a partir de mudanças no schema
npx prisma migrate dev --name nome_da_migration

# Reset do banco (APENAS DESENVOLVIMENTO!)
npx prisma migrate reset

# Aplicar e executar seed
npx prisma migrate reset && npm run prisma:seed
```

## Scripts Node

### Criar Baseline

```bash
node scripts/create-baseline.js
```

### Verificar Baseline

```bash
node scripts/verify-baseline.js
```

## Exemplos de Uso

### Setup Inicial em Novo Ambiente

```bash
# 1. Aplicar baseline
npx prisma migrate deploy

# 2. Executar seed
npm run prisma:seed

# 3. Gerar Prisma Client
npx prisma generate
```

### Em Produção (Banco Já Existe)

```bash
# 1. Marcar baseline como aplicada
npm run baseline:resolve

# 2. Verificar status
npx prisma migrate status

# 3. Aplicar novas migrations (se houver)
npx prisma migrate deploy
```

### Criar Nova Migration

```bash
# 1. Editar prisma/schema.prisma
# 2. Gerar migration
npx prisma migrate dev --name adicionar_nova_feature

# 3. Verificar migration gerada
ls -la prisma/migrations/
```

### Verificar Tudo

```bash
# Verificar baseline
npm run baseline:verify

# Verificar schema
npx prisma validate

# Ver status das migrations
npx prisma migrate status
```

## CI/CD

### GitHub Actions

```yaml
- name: Setup Database
  run: |
    npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

- name: Run Seed
  run: npm run prisma:seed
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Docker

```dockerfile
# No Dockerfile
RUN npx prisma migrate deploy
RUN npm run prisma:seed
```

### EasyPanel / Produção

1. Marcar baseline como aplicada:
   ```bash
   npm run baseline:resolve
   ```

2. Aplicar novas migrations:
   ```bash
   npx prisma migrate deploy
   ```

