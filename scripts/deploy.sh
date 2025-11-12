#!/bin/bash

# Script de deploy para B2X CRM
# Este script ajuda a preparar o ambiente para deploy

set -e

echo "🚀 Iniciando deploy do B2X CRM..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens
print_message() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

print_message "Docker encontrado"

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    print_warning "Docker Compose não está instalado. Usando 'docker compose' (v2)..."
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

print_message "Docker Compose encontrado"

# Verificar se .env existe
if [ ! -f .env ]; then
    print_warning "Arquivo .env não encontrado. Criando a partir de env.example..."
    if [ -f env.example ]; then
        cp env.example .env
        print_message "Arquivo .env criado. Por favor, configure as variáveis de ambiente."
    else
        print_error "Arquivo env.example não encontrado."
        exit 1
    fi
fi

# Build das imagens Docker
echo ""
echo "📦 Construindo imagens Docker..."

# Backend
echo "Construindo backend..."
docker build -t b2x-crm-backend:latest -f Dockerfile .

# Frontend
echo "Construindo frontend..."
cd frontend
docker build -t b2x-crm-frontend:latest -f Dockerfile \
    --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost/api} \
    --build-arg NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL:-http://localhost} \
    .
cd ..

print_message "Imagens Docker construídas com sucesso"

# Verificar se as imagens foram criadas
if docker images | grep -q "b2x-crm-backend"; then
    print_message "Imagem backend criada"
else
    print_error "Falha ao criar imagem backend"
    exit 1
fi

if docker images | grep -q "b2x-crm-frontend"; then
    print_message "Imagem frontend criada"
else
    print_error "Falha ao criar imagem frontend"
    exit 1
fi

echo ""
echo "✅ Deploy preparado com sucesso!"
echo ""
echo "Próximos passos:"
echo "1. Configure as variáveis de ambiente no arquivo .env"
echo "2. Execute: docker-compose up -d"
echo "3. Execute as migrações: docker-compose exec backend npx prisma migrate deploy"
echo "4. (Opcional) Execute o seed: docker-compose exec backend npm run prisma:seed"
echo ""
echo "Para mais informações, consulte DEPLOY.md"

