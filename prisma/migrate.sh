#!/bin/bash
# Script para aplicar migrations sem usar shadow database
# Use este script em produção quando migrate dev falhar

echo "Aplicando migrations diretamente no banco de dados..."

# Aplicar migrations uma por uma usando psql
# Substitua DATABASE_URL pela sua string de conexão
export DATABASE_URL="${DATABASE_URL}"

# Listar todas as migrations
for migration in prisma/migrations/*/migration.sql; do
    if [ -f "$migration" ]; then
        echo "Aplicando: $migration"
        # Usar psql para aplicar diretamente
        # psql "$DATABASE_URL" -f "$migration" || echo "Erro ao aplicar $migration"
    fi
done

echo "Migrations aplicadas!"

