# Baseline Migration

Esta é a migration inicial que contém toda a estrutura do banco de dados.

## Estado Atual

Esta migration representa o estado completo do schema após todas as 27 migrations anteriores serem aplicadas.

## Aplicar em Produção

**IMPORTANTE**: Se você já tem um banco de dados em produção com todas as migrations aplicadas, marque esta migration como aplicada:

```bash
npx prisma migrate resolve --applied 000_init_baseline
```

Isso evitará que o Prisma tente recriar todas as tabelas que já existem.

## Para Novos Ambientes

Em novos ambientes (desenvolvimento, staging), você pode aplicar normalmente:

```bash
npx prisma migrate deploy
```

## Migrations Arquivadas

As migrations anteriores (27 no total) foram arquivadas em:
`prisma/_archived_migrations/`

Elas foram mantidas para histórico, mas não serão mais usadas pelo Prisma.
