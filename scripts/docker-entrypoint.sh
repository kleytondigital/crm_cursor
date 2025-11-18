#!/bin/sh
set -e

echo "🚀 Starting B2X CRM Backend..."

# Verificar se DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  exit 1
fi

echo "✅ DATABASE_URL is configured"

# Aplicar migrations pendentes
echo "📦 Applying database migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations applied successfully"
else
  echo "❌ Failed to apply migrations"
  exit 1
fi

# Gerar Prisma Client (caso não tenha sido gerado)
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Verificar status das migrations
echo "📊 Migration status:"
npx prisma migrate status

# Iniciar aplicação
echo "🎯 Starting application..."
exec node dist/main.js

