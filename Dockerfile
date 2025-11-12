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

# Criar diretório para uploads com permissões corretas (antes de mudar usuário)
RUN mkdir -p /app/uploads

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

# Comando para iniciar a aplicação
CMD ["node", "dist/main.js"]
