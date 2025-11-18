# Dockerfile para Backend NestJS
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências do sistema necessárias para Prisma e bcrypt
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copiar arquivos de dependências primeiro (para cache do Docker)
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma/

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci

# Gerar Prisma Client (não precisa de conexão com banco, só do schema)
RUN npx prisma generate

# Copiar código fonte
COPY src ./src

# Build da aplicação NestJS
RUN npm run build

# Compilar seed para JavaScript (para executar em produção sem ts-node)
# Se o seed.js já existir (commitado), usar ele; caso contrário, compilar do TypeScript
RUN if [ -f prisma/seed.js ]; then \
      echo "Usando seed.js existente"; \
    else \
      echo "Compilando seed.ts para JavaScript..."; \
      npx tsc prisma/seed.ts \
        --outDir prisma \
        --module commonjs \
        --target es2020 \
        --lib es2020 \
        --esModuleInterop \
        --resolveJsonModule \
        --skipLibCheck \
        --moduleResolution node \
        --allowSyntheticDefaultImports || \
      echo "Aviso: Não foi possível compilar seed.ts"; \
    fi

# Stage de produção
FROM node:20-alpine AS production

WORKDIR /app

# Instalar dependências do sistema mínimas
RUN apk add --no-cache libc6-compat openssl

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar apenas dependências de produção
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar Prisma Client gerado do builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copiar build da aplicação
COPY --from=builder /app/dist ./dist

# Copiar seed compilado do builder (garantir que o seed.js esteja disponível)
# Se o seed.js já foi copiado com prisma ./prisma/, esta linha garante que o compilado do builder seja usado
COPY --from=builder /app/prisma/seed.js ./prisma/seed.js

# Copiar script de entrypoint
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh

# Criar diretórios necessários e ajustar permissões (antes de mudar usuário)
RUN mkdir -p /app/uploads && \
    chmod +x /app/docker-entrypoint.sh && \
    chown -R nestjs:nodejs /app/node_modules/.prisma /app/uploads 2>/dev/null || true

# Mudar para usuário não-root
USER nestjs

# Expor porta
EXPOSE 3000

# Variáveis de ambiente padrão (serão sobrescritas pelo Easypanel)
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar a aplicação (usando entrypoint que aplica migrations)
CMD ["/app/docker-entrypoint.sh"]
