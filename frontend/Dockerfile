# ============================
# BASE (dependências principais)
# ============================
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar pacotes
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --omit=dev && npm cache clean --force


# ============================
# BUILDER (dependências completas + build)
# ============================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Build com Turbopack
RUN npm run build


# ============================
# RUNNER (produção)
# ============================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não root
RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

# Copiar build standalone gerado pelo Next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Rodar como usuário seguro
USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
