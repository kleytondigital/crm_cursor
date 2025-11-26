#!/bin/sh
set -e

echo "🚀 Starting B2X CRM Backend..."

# Verificar se DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  exit 1
fi

echo "✅ DATABASE_URL is configured"

# Controlar migrations via variável de ambiente
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "📦 RUN_MIGRATIONS=true — Applying database migrations..."
  
  if npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully"
  else
    echo "❌ Failed to apply migrations — container will still start"
  fi
else
  echo "⏭ RUN_MIGRATIONS=false — Skipping migrations"
fi

# Verificar Prisma Client
if [ ! -d "/app/node_modules/.prisma/client" ]; then
  echo "⚠️ Prisma Client not found, generating..."
  npx prisma generate || echo "⚠️ Could not generate Prisma Client"
else
  echo "✅ Prisma Client is available"
fi

echo "🎯 Starting application..."
exec node dist/main.js
