#!/bin/bash

# Script para aplicar migrations em produção
# Uso: ./scripts/migrate-prod.sh

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 B2X CRM - Production Migration Tool"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar se está em produção
if [ "$NODE_ENV" != "production" ]; then
  echo "⚠️  WARNING: NODE_ENV is not set to 'production'"
  echo "   Current value: ${NODE_ENV:-not set}"
  echo ""
  read -p "Continue anyway? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted by user"
    exit 1
  fi
fi

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  echo ""
  echo "Please set DATABASE_URL environment variable:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:5432/db'"
  exit 1
fi

echo "✅ Environment variables validated"
echo ""

# Mostrar status atual
echo "📊 Current migration status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npx prisma migrate status
echo ""

# Perguntar se deseja continuar
read -p "Apply pending migrations? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Migration cancelled by user"
  exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Applying migrations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Aplicar migrations
if npx prisma migrate deploy; then
  echo ""
  echo "✅ Migrations applied successfully!"
  
  # Gerar Prisma Client
  echo ""
  echo "🔧 Generating Prisma Client..."
  npx prisma generate
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 Final migration status:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  npx prisma migrate status
  
  echo ""
  echo "✅ All done! Your database is up to date."
  echo ""
  echo "Next steps:"
  echo "  1. Restart your application"
  echo "  2. Monitor logs for any errors"
  echo "  3. Test critical functionality"
  echo ""
else
  echo ""
  echo "❌ Migration failed!"
  echo ""
  echo "Troubleshooting steps:"
  echo "  1. Check the error message above"
  echo "  2. Verify DATABASE_URL is correct"
  echo "  3. Check if database is accessible"
  echo "  4. Review migration files in prisma/migrations/"
  echo "  5. Run: npx prisma migrate status"
  echo ""
  exit 1
fi

