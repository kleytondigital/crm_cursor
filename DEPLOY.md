# 🚀 Guia de Deploy - B2X CRM

Este guia descreve como fazer o deploy do B2X CRM em produção usando **Easypanel** com Docker e Nginx.

## 📋 Pré-requisitos

- Conta no [Easypanel](https://easypanel.io)
- Domínio configurado
- Banco de dados PostgreSQL (pode ser do Easypanel ou externo)
- Redis (para BullMQ - agendamento de mensagens)

## 🔧 Configuração no Easypanel

### 1. Criar Projeto

1. Acesse o Easypanel
2. Crie um novo projeto chamado `b2x-crm`
3. Selecione o repositório Git do projeto

### 2. Configurar Banco de Dados PostgreSQL

1. No Easypanel, adicione um serviço **PostgreSQL**
2. Anote as credenciais de conexão:
   - Host: `postgres` (se no mesmo projeto) ou IP externo
   - Port: `5432`
   - Database: `b2x_crm`
   - User: `postgres`
   - Password: (gerado pelo Easypanel)

### 3. Configurar Redis

1. No Easypanel, adicione um serviço **Redis**
2. Anote as credenciais:
   - Host: `redis` (se no mesmo projeto) ou IP externo
   - Port: `6379`

### 4. Configurar Backend (NestJS)

1. **Criar novo serviço** no Easypanel:
   - Tipo: **Docker**
   - Nome: `backend`
   - Porta: `3000`

2. **Configurar build**:
   - Dockerfile: `./Dockerfile`
   - Context: `.` (raiz do projeto)

3. **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://postgres:senha@postgres:5432/b2x_crm?schema=public
   REDIS_HOST=redis
   REDIS_PORT=6379
   JWT_SECRET=seu-jwt-secret-super-seguro-aqui
   JWT_EXPIRES_IN=7d
   APP_URL=https://seu-dominio.com
   MEDIA_BASE_URL=https://seu-dominio.com
   WAHA_API_KEY=sua-waha-api-key
   N8N_WEBHOOK_URL_MESSAGES_SEND=https://seu-n8n/webhook/messages-send
   ```

4. **Volumes**:
   - **Source**: `./uploads` (caminho no host)
   - **Target**: `/app/uploads` (caminho absoluto no container - **DEVE começar com /**)
   - **Importante**: O Target (Mount Path) deve ser um caminho absoluto começando com `/`
   - **No Easypanel**:
     - Source: `./uploads`
     - Mount Path: `/app/uploads` (obrigatoriamente absoluto)

5. **Comando de inicialização**:
   ```bash
   sh -c "npx prisma migrate deploy && node dist/main.js"
   ```

6. **Health Check**:
   - Path: `/health`
   - Port: `3000`
   - Interval: `30s`

### 5. Configurar Frontend (Next.js)

1. **Criar novo serviço** no Easypanel:
   - Tipo: **Docker**
   - Nome: `frontend`
   - Porta: `3001`

2. **Configurar build**:
   - **⚠️ IMPORTANTE**: O Dockerfile Path é relativo ao Context
   - **Context**: `./frontend` (caminho relativo à raiz do projeto)
   - **Dockerfile Path**: `Dockerfile` (relativo ao Context, não `frontend/Dockerfile`)
   - **✅ Configuração Correta**:
     - Context: `./frontend`
     - Dockerfile Path: `Dockerfile` (apenas o nome do arquivo)
   - **❌ Configuração Incorreta**:
     - Context: `./frontend`
     - Dockerfile Path: `frontend/Dockerfile` (NÃO funciona - duplica o path)

3. **Build Args**:
   ```env
   NEXT_PUBLIC_API_URL=https://seu-dominio.com/api
   NEXT_PUBLIC_WS_URL=https://seu-dominio.com
   ```

4. **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   PORT=3001
   ```

5. **Health Check**:
   - Path: `/api/health`
   - Port: `3001`
   - Interval: `30s`

### 6. Configurar Nginx (Reverse Proxy)

1. **Criar novo serviço** no Easypanel:
   - Tipo: **Docker**
   - Nome: `nginx`
   - Porta: `80` e `443`

2. **Configurar build**:
   - Dockerfile: (use imagem nginx:alpine)
   - Ou use o docker-compose.yml fornecido

3. **Volumes**:
   - `./nginx.conf:/etc/nginx/nginx.conf:ro`
   - `./nginx/ssl:/etc/nginx/ssl:ro` (para SSL)

4. **Portas**:
   - `80:80` (HTTP)
   - `443:443` (HTTPS) - se usar SSL

5. **Dependências**:
   - `backend`
   - `frontend`

### 7. Configurar Domínio e SSL

1. No Easypanel, configure o domínio:
   - Domínio: `seu-dominio.com`
   - Aponte para o serviço `nginx`

2. Configure SSL (Let's Encrypt):
   - No Easypanel, ative SSL/TLS
   - Use certificado Let's Encrypt automático

## 🔄 Deploy

### Primeira Execução

1. **Push do código para o repositório Git**

2. **No Easypanel, configure o build**:
   - Conecte o repositório Git
   - Configure branch: `main` ou `master`
   - Configure auto-deploy: `enabled`

3. **Execute o build**:
   - O Easypanel irá construir as imagens Docker automaticamente

4. **Execute as migrações do banco de dados**:
   - No serviço `backend`, execute:
     ```bash
     npx prisma migrate deploy
     ```
   - Ou adicione ao comando de inicialização do container

5. **Execute o seed (opcional)**:
   - Para criar usuário inicial:
     ```bash
     npm run prisma:seed
     ```

### Atualizações

1. **Push das alterações para o Git**
2. **O Easypanel fará o build automático** (se auto-deploy estiver ativo)
3. **As migrações serão executadas automaticamente** (se configurado no comando de inicialização)

## 📝 Variáveis de Ambiente Completas

### Backend

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=3000
APP_URL=https://seu-dominio.com
MEDIA_BASE_URL=https://seu-dominio.com

# Multi-tenant
TENANT_HEADER=x-tenant-id

# WAHA
WAHA_API_KEY=sua-waha-api-key

# N8N
N8N_WEBHOOK_URL_MESSAGES_SEND=https://seu-n8n/webhook/messages-send
```

### Frontend

```env
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_API_URL=https://seu-dominio.com/api
NEXT_PUBLIC_WS_URL=https://seu-dominio.com
```

## 🔍 Verificação

1. **Verifique os logs**:
   - Backend: `docker logs b2x-crm-backend`
   - Frontend: `docker logs b2x-crm-frontend`
   - Nginx: `docker logs b2x-crm-nginx`

2. **Verifique a saúde dos serviços**:
   - Backend: `https://seu-dominio.com/api/health`
   - Frontend: `https://seu-dominio.com`

3. **Teste o login**:
   - Acesse `https://seu-dominio.com/login`
   - Use as credenciais criadas no seed

## 🐛 Troubleshooting

### Backend não inicia

1. Verifique as variáveis de ambiente
2. Verifique a conexão com o banco de dados
3. Verifique os logs: `docker logs b2x-crm-backend`

### Frontend não carrega

1. Verifique se `NEXT_PUBLIC_API_URL` está correto
2. Verifique os logs: `docker logs b2x-crm-frontend`
3. Verifique se o backend está rodando

### WebSocket não funciona

1. Verifique a configuração do Nginx para WebSocket
2. Verifique se `NEXT_PUBLIC_WS_URL` está correto
3. Verifique os logs do Nginx: `docker logs b2x-crm-nginx`

### Migrações não executam

1. Execute manualmente:
   ```bash
   npx prisma migrate deploy
   ```
2. Verifique a conexão com o banco de dados
3. Verifique as permissões do usuário do banco

## 📚 Recursos Adicionais

- [Documentação do Easypanel](https://easypanel.io/docs)
- [Documentação do Docker](https://docs.docker.com/)
- [Documentação do Nginx](https://nginx.org/en/docs/)
- [Documentação do Prisma](https://www.prisma.io/docs)

## 🆘 Suporte

Em caso de problemas, verifique:
1. Logs dos containers
2. Variáveis de ambiente
3. Configuração do Nginx
4. Conexões com banco de dados e Redis

