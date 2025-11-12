#!/bin/bash

# Script de health check para B2X CRM
# Verifica se todos os serviços estão rodando corretamente

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# URL base (ajuste conforme necessário)
BASE_URL=${BASE_URL:-http://localhost}

echo "🔍 Verificando saúde dos serviços B2X CRM..."
echo ""

# Verificar backend
echo "Verificando backend..."
if curl -f -s "${BASE_URL}/api/health" > /dev/null 2>&1; then
    print_success "Backend está rodando"
else
    print_error "Backend não está respondendo"
fi

# Verificar frontend
echo "Verificando frontend..."
if curl -f -s "${BASE_URL}" > /dev/null 2>&1; then
    print_success "Frontend está rodando"
else
    print_error "Frontend não está respondendo"
fi

# Verificar PostgreSQL
echo "Verificando PostgreSQL..."
if docker ps | grep -q "b2x-crm-postgres"; then
    print_success "PostgreSQL está rodando"
else
    print_error "PostgreSQL não está rodando"
fi

# Verificar Redis
echo "Verificando Redis..."
if docker ps | grep -q "b2x-crm-redis"; then
    print_success "Redis está rodando"
else
    print_error "Redis não está rodando"
fi

# Verificar Nginx
echo "Verificando Nginx..."
if docker ps | grep -q "b2x-crm-nginx"; then
    print_success "Nginx está rodando"
else
    print_error "Nginx não está rodando"
fi

echo ""
echo "✅ Verificação concluída!"

