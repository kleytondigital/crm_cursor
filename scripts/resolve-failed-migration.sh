#!/bin/sh
# Script para resolver migrations marcadas como falhas no Prisma
# Uso: ./scripts/resolve-failed-migration.sh <migration_name>

set -e

MIGRATION_NAME=${1:-"20250125000000_add_custom_lead_status_and_bot_indicator"}

echo "🔧 Resolving failed migration: $MIGRATION_NAME"

# Verificar se DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set!"
  exit 1
fi

echo "📋 Options:"
echo "  1. Mark as applied (if migration was actually applied manually)"
echo "  2. Mark as rolled back (if migration should be skipped)"
echo "  3. Cancel (do nothing)"

read -p "Choose option (1-3): " choice

case $choice in
  1)
    echo "✅ Marking migration as applied..."
    npx prisma migrate resolve --applied "$MIGRATION_NAME"
    echo "✅ Migration marked as applied. You can now run 'npx prisma migrate deploy'"
    ;;
  2)
    echo "⏭ Marking migration as rolled back..."
    npx prisma migrate resolve --rolled-back "$MIGRATION_NAME"
    echo "✅ Migration marked as rolled back. You can now run 'npx prisma migrate deploy'"
    ;;
  3)
    echo "❌ Cancelled. No changes made."
    exit 0
    ;;
  *)
    echo "❌ Invalid option"
    exit 1
    ;;
esac

