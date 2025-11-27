# Setup do Baseline Prisma

Este documento explica como foi criado o baseline do Prisma e como trabalhar com ele.

## O que é um Baseline?

Um baseline é uma migration única que contém **toda a estrutura inicial** do banco de dados. Em vez de ter dezenas de migrations pequenas, temos uma migration grande e completa que representa o estado atual do schema.

### Vantagens

- ✅ **Simplicidade**: Uma única migration para novos ambientes
- ✅ **Performance**: Aplicação mais rápida em novos bancos
- ✅ **Clareza**: Fica claro qual é o estado inicial completo
- ✅ **Organização**: Migrations antigas arquivadas, mas preservadas

### Desvantagens

- ⚠️ **Tamanho**: A migration inicial é grande
- ⚠️ **Histórico**: Perde-se o histórico detalhado de mudanças (mas está arquivado)

## Estrutura

```
prisma/
├── schema.prisma                    # Schema atual consolidado
├── migrations/
│   ├── 000_init_baseline/          # Migration baseline (única)
│   │   ├── migration.sql           # SQL completo do banco
│   │   └── README.md               # Documentação da baseline
│   └── migration_lock.toml         # Lock file do Prisma
└── _archived_migrations/           # Migrations antigas (histórico)
    ├── 20251108231010_inicial/
    ├── 20251108232043_mensagens/
    └── ... (todas as antigas)
```

## Como Foi Criado

O baseline foi gerado usando:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script
```

Este comando gera um SQL que representa a diferença entre um banco vazio e o schema atual.

## Aplicando o Baseline

### Em Novos Ambientes (Desenvolvimento, Staging)

Simplesmente execute:

```bash
npx prisma migrate deploy
```

O Prisma vai aplicar a migration baseline e criar todo o banco.

### Em Produção (Banco Já Existe)

**IMPORTANTE**: Se você já tem um banco de dados em produção com todas as migrations aplicadas, você deve marcar a baseline como já aplicada:

```bash
npx prisma migrate resolve --applied 000_init_baseline
```

Isso evita que o Prisma tente recriar todas as tabelas que já existem.

### Verificar Status

Para verificar o status das migrations:

```bash
npx prisma migrate status
```

Deve mostrar apenas `000_init_baseline` como aplicada (em produção) ou pendente (em novos ambientes).

## Trabalhando com Novas Migrations

A partir do baseline, novas alterações no schema gerarão migrations pequenas e limpas:

```bash
# 1. Fazer alterações no schema.prisma
# 2. Gerar migration
npx prisma migrate dev --name minha_alteracao

# 3. A migration será pequena, apenas com as mudanças
```

## Migrations Arquivadas

As migrations anteriores foram movidas para `prisma/_archived_migrations/` para preservar o histórico.

Elas **não são mais usadas** pelo Prisma, mas estão disponíveis para referência se necessário.

## Scripts Disponíveis

### Criar Baseline

```bash
node scripts/create-baseline.js
```

Este script:
- Analisa todas as migrations existentes
- Gera o SQL do baseline
- Arquivar migrations antigas
- Cria documentação

### Verificar Baseline

```bash
node scripts/verify-baseline.js
```

Verifica se:
- O baseline existe e está correto
- O SQL é válido
- O schema está sincronizado

## CI/CD

### Para Deploy Automático

Em seu pipeline CI/CD, adicione:

```yaml
# Exemplo para GitHub Actions
- name: Apply Prisma Migrations
  run: |
    npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}

# Se o banco já existe em produção, primeiro marcar como aplicada:
# npx prisma migrate resolve --applied 000_init_baseline
```

### Para Desenvolvimento Local

```bash
# Reset do banco (apenas desenvolvimento!)
npx prisma migrate reset

# Aplicar migrations
npx prisma migrate deploy

# Executar seed
npm run prisma:seed
```

## Rollback

Se precisar voltar atrás:

1. **Desfazer baseline**: Remova `prisma/migrations/000_init_baseline/`
2. **Restaurar migrations**: Mova de `prisma/_archived_migrations/` para `prisma/migrations/`
3. **Resolver estado**: Execute `npx prisma migrate resolve --rolled-back <nome_da_migration>`

## Troubleshooting

### Erro: "Migration already applied"

Se você receber este erro ao tentar aplicar o baseline:

```bash
npx prisma migrate resolve --applied 000_init_baseline
```

### Erro: "Baseline não encontrado"

Verifique se o diretório `prisma/migrations/000_init_baseline/` existe. Se não, recrie usando:

```bash
node scripts/create-baseline.js
```

### Schema desatualizado

Se o schema.prisma não reflete o banco:

```bash
# Gerar schema a partir do banco
npx prisma db pull

# Ou sincronizar
npx prisma db push
```

## Próximos Passos

1. ✅ Baseline criado
2. ✅ Migrations antigas arquivadas
3. ✅ Scripts de verificação criados
4. ⏭️ Aplicar baseline em produção (marcar como aplicada)
5. ⏭️ A partir de agora, novas migrations serão pequenas e limpas

## Referências

- [Prisma Migrations Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Baseline Strategy](https://www.prisma.io/docs/guides/migrate/production-troubleshooting#baseline-your-production-environment)

