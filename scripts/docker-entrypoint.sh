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
  
  # Tentar resolver migrations marcadas como falhas (se houver)
  if [ "$RESOLVE_FAILED_MIGRATIONS" = "true" ]; then
    echo "🔧 RESOLVE_FAILED_MIGRATIONS=true — Attempting to resolve failed migrations..."
    npx prisma migrate resolve --applied 20250125000000_add_custom_lead_status_and_bot_indicator 2>/dev/null || echo "⚠️ Could not resolve failed migrations (this is OK if no migrations are marked as failed)"
  fi
  
  if npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully"
  else
    echo "❌ Failed to apply migrations"
    echo "💡 Tip: If migrations failed due to missing tables, ensure all base migrations have been applied first"
    echo "💡 Tip: Set RESOLVE_FAILED_MIGRATIONS=true to attempt automatic resolution"
    echo "⚠️ Container will still start, but database may be in an inconsistent state"
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
