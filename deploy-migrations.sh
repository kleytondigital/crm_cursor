#!/bin/bash

# Script para executar migrations no servidor de produção

echo "🚀 Executando migrations no banco de produção..."

# Executar migrations
npx prisma migrate deploy

# Gerar Prisma Client
npx prisma generate

echo "✅ Migrations executadas com sucesso!"
echo "📝 Não esqueça de reiniciar o backend após as migrations"

