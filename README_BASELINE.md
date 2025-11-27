# 🎯 Baseline Prisma - Documentação Completa

## ✅ Status do Baseline

O baseline foi **criado com sucesso**! 

- ✅ **Migration baseline**: `prisma/migrations/000_init_baseline/`
- ✅ **SQL gerado**: Contém toda a estrutura do banco de dados
- ✅ **Migrations arquivadas**: 27 migrations antigas movidas para `prisma/_archived_migrations/`

## 📋 O Que Foi Feito

1. ✅ **Schema consolidado**: O `schema.prisma` já estava atualizado
2. ✅ **Baseline SQL gerado**: Criado usando `prisma migrate diff`
3. ✅ **Migrations arquivadas**: 27 migrations antigas preservadas em `_archived_migrations/`
4. ✅ **Documentação criada**: README na baseline e documentação completa

## 🚀 Próximos Passos

### 1. Para Ambiente de Produção (Banco Já Existe)

Se você já tem um banco em produção com todas as migrations aplicadas:

```bash
# Marcar a baseline como já aplicada
npx prisma migrate resolve --applied 000_init_baseline
```

Isso evita que o Prisma tente recriar todas as tabelas que já existem.

### 2. Para Novos Ambientes (Dev, Staging)

Simplesmente execute:

```bash
# Aplicar todas as migrations (baseline + futuras)
npx prisma migrate deploy

# Executar seed (opcional)
npm run prisma:seed
```

### 3. Verificar Status

```bash
# Ver status das migrations
npx prisma migrate status

# Deve mostrar apenas:
# ✅ 000_init_baseline (Applied)
```

## 📁 Estrutura Criada

```
prisma/
├── schema.prisma                    # Schema atual
├── migrations/
│   ├── 000_init_baseline/          # ← NOVA baseline
│   │   ├── migration.sql           # SQL completo do banco
│   │   └── README.md               # Documentação
│   └── migration_lock.toml
└── _archived_migrations/            # ← Migrations antigas
    ├── 20251108231010_inicial/
    ├── 20251108232043_mensagens/
    └── ... (25 outras)
```

## 🔧 Scripts Disponíveis

### Criar Baseline (já executado)

```bash
node scripts/create-baseline.js
```

### Verificar Baseline

```bash
node scripts/verify-baseline.js
```

## 📚 Documentação Completa

Para mais detalhes, consulte:

- **`docs/BASELINE_SETUP.md`**: Guia completo de setup e uso
- **`prisma/migrations/000_init_baseline/README.md`**: Documentação da baseline

## ⚠️ Importante

### Em Produção

**ANTES** de fazer deploy, execute:

```bash
npx prisma migrate resolve --applied 000_init_baseline
```

Isso marca a baseline como já aplicada e evita que o Prisma tente recriar o banco.

### Novas Migrations

A partir de agora, novas alterações no schema gerarão migrations **pequenas e limpas**:

```bash
# 1. Editar schema.prisma
# 2. Gerar migration
npx prisma migrate dev --name minha_alteracao

# A migration será pequena, apenas com as mudanças
```

## 🔍 Verificações

### Verificar se Baseline Está Correto

```bash
node scripts/verify-baseline.js
```

### Ver Tamanho do SQL Gerado

```bash
# Windows
Get-Item "prisma\migrations\000_init_baseline\migration.sql" | Select-Object Length

# Linux/Mac
ls -lh prisma/migrations/000_init_baseline/migration.sql
```

## 📝 Migrations Arquivadas

As 27 migrations anteriores foram movidas para `prisma/_archived_migrations/`:

- ✅ Histórico preservado
- ✅ Não são mais usadas pelo Prisma
- ✅ Disponíveis para referência se necessário

Lista completa em: `prisma/_archived_migrations/README.md`

## 🎉 Benefícios

Com o baseline criado:

1. ✅ **Simplicidade**: Uma única migration para novos ambientes
2. ✅ **Performance**: Aplicação mais rápida
3. ✅ **Organização**: Migrations antigas arquivadas
4. ✅ **Clareza**: Estado inicial do banco bem definido
5. ✅ **Manutenção**: Novas migrations serão pequenas e focadas

## 🆘 Troubleshooting

### Erro: "Baseline already exists"

Se precisar recriar:

```bash
# 1. Deletar baseline existente
rm -rf prisma/migrations/000_init_baseline

# 2. Recriar
node scripts/create-baseline.js
```

### Erro: "Migration already applied"

Em produção, marque como aplicada:

```bash
npx prisma migrate resolve --applied 000_init_baseline
```

### Verificar se SQL foi gerado corretamente

```bash
# Ver primeiras linhas
head -n 50 prisma/migrations/000_init_baseline/migration.sql

# Verificar se tem CREATE TABLE
grep -c "CREATE TABLE" prisma/migrations/000_init_baseline/migration.sql
```

## 📞 Suporte

Para mais informações, consulte:

- `docs/BASELINE_SETUP.md` - Guia completo
- `docs/MIGRATION_TROUBLESHOOTING.md` - Solução de problemas
- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

**✅ Baseline criado com sucesso!** O projeto está pronto para um fluxo de migrations limpo e organizado.

