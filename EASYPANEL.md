# 🚀 Deploy no Easypanel - B2X CRM

Guia passo a passo para fazer deploy do B2X CRM no **Easypanel**.

## 📋 Pré-requisitos

- Conta no [Easypanel](https://easypanel.io)
- Repositório Git (GitHub, GitLab, etc.)
- Domínio configurado (opcional, mas recomendado)

## 🔧 Configuração Passo a Passo

### 1. Criar Projeto no Easypanel

1. Acesse o Easypanel
2. Clique em **"New Project"**
3. Nome: `b2x-crm`
4. Selecione seu repositório Git
5. Configure a branch: `main` ou `master`

### 2. Configurar Banco de Dados PostgreSQL

1. No projeto, clique em **"Add Service"**
2. Selecione **"PostgreSQL"**
3. Configure:
   - **Name**: `postgres`
   - **Database**: `b2x_crm`
   - **User**: `postgres`
   - **Password**: (gerado automaticamente ou defina sua senha)
4. Anote as credenciais (serão necessárias para o backend)

### 3. Configurar Redis

1. No projeto, clique em **"Add Service"**
2. Selecione **"Redis"**
3. Configure:
   - **Name**: `redis`
   - **Port**: `6379`
4. Anote as credenciais (serão necessárias para o backend)

### 4. Configurar Backend (NestJS)

1. No projeto, clique em **"Add Service"**
2. Selecione **"Docker"**
3. Configure:

   **Geral**:
   - **Name**: `backend`
   - **Port**: `3000`

   **Build**:
   - **Dockerfile Path**: `Dockerfile`
   - **Context**: `.` (raiz do projeto)
   - **Build Command**: (deixe vazio, o Dockerfile já faz o build)

   **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://postgres:SENHA@postgres:5432/b2x_crm?schema=public
   REDIS_HOST=redis
   REDIS_PORT=6379
   JWT_SECRET=sua-jwt-secret-super-segura-aqui
   JWT_EXPIRES_IN=7d
   APP_URL=https://seu-dominio.com
   MEDIA_BASE_URL=https://seu-dominio.com
   WAHA_API_KEY=sua-waha-api-key
   N8N_WEBHOOK_URL_MESSAGES_SEND=https://seu-n8n/webhook/messages-send
   ```

   **Volumes**:
   - `./uploads:/app/uploads` (para armazenar arquivos de mídia)

   **Health Check**:
   - **Path**: `/health`
   - **Port**: `3000`
   - **Interval**: `30s`

   **Start Command**:
   ```bash
   sh -c "npx prisma migrate deploy && node dist/main.js"
   ```

   **Dependências**:
   - `postgres` (deve estar saudável)
   - `redis` (deve estar saudável)

### 5. Configurar Frontend (Next.js)

1. No projeto, clique em **"Add Service"**
2. Selecione **"Docker"**
3. Configure:

   **Geral**:
   - **Name**: `frontend`
   - **Port**: `3001`

   **Build**:
   - **Dockerfile Path**: `frontend/Dockerfile`
   - **Context**: `./frontend`
   - **Build Args**:
     ```env
     NEXT_PUBLIC_API_URL=https://seu-dominio.com/api
     NEXT_PUBLIC_WS_URL=https://seu-dominio.com
     ```

   **Variáveis de Ambiente**:
   ```env
   NODE_ENV=production
   PORT=3001
   ```

   **Health Check**:
   - **Path**: `/`
   - **Port**: `3001`
   - **Interval**: `30s`

   **Dependências**:
   - `backend` (deve estar saudável)

### 6. Configurar Nginx (Reverse Proxy)

1. No projeto, clique em **"Add Service"**
2. Selecione **"Docker"**
3. Configure:

   **Geral**:
   - **Name**: `nginx`
   - **Port**: `80`

   **Build**:
   - **Image**: `nginx:alpine`
   - **No build needed** (use imagem pré-construída)

   **Volumes**:
   - `./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro`

   **Dependências**:
   - `backend` (deve estar saudável)
   - `frontend` (deve estar saudável)

### 7. Configurar Domínio e SSL

1. No serviço `nginx`, vá em **"Domain"**
2. Adicione seu domínio: `seu-dominio.com`
3. Ative **SSL/TLS** (Let's Encrypt)
4. O Easypanel irá gerar o certificado SSL automaticamente

### 8. Configurar Variáveis de Ambiente

**Importante**: Atualize as seguintes variáveis no backend:

- `DATABASE_URL`: Use o nome do serviço PostgreSQL (`postgres`) como host
- `REDIS_HOST`: Use o nome do serviço Redis (`redis`) como host
- `APP_URL`: Use seu domínio com HTTPS
- `MEDIA_BASE_URL`: Use seu domínio com HTTPS
- `JWT_SECRET`: Gere uma chave secreta segura (use `openssl rand -base64 32`)

### 9. Primeira Execução

1. **Faça o deploy**:
   - O Easypanel irá construir as imagens Docker automaticamente
   - Aguarde o build completar

2. **Execute as migrações**:
   - No serviço `backend`, abra o terminal
   - Execute: `npx prisma migrate deploy`
   - Ou adicione ao comando de inicialização (já incluído no exemplo acima)

3. **Execute o seed (opcional)**:
   - No serviço `backend`, abra o terminal
   - Execute: `npm run prisma:seed`
   - Isso criará o usuário super admin

4. **Verifique os logs**:
   - Verifique os logs de cada serviço
   - Certifique-se de que não há erros

### 10. Testar a Aplicação

1. Acesse seu domínio: `https://seu-dominio.com`
2. Verifique o health check: `https://seu-dominio.com/health`
3. Teste o login com as credenciais do seed

## 🔄 Atualizações

1. **Push das alterações** para o repositório Git
2. **O Easypanel fará o build automático** (se auto-deploy estiver ativo)
3. **As migrações serão executadas automaticamente** (se configurado no comando de inicialização)

## 🐛 Troubleshooting

### Backend não inicia

1. Verifique os logs: `docker logs b2x-crm-backend`
2. Verifique as variáveis de ambiente
3. Verifique a conexão com o banco de dados
4. Verifique se as migrações foram executadas

### Frontend não carrega

1. Verifique os logs: `docker logs b2x-crm-frontend`
2. Verifique se `NEXT_PUBLIC_API_URL` está correto
3. Verifique se o backend está rodando

### WebSocket não funciona

1. Verifique a configuração do Nginx para WebSocket
2. Verifique se `NEXT_PUBLIC_WS_URL` está correto
3. Verifique os logs do Nginx

### Migrações não executam

1. Execute manualmente no terminal do backend:
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

Em caso de problemas:
1. Verifique os logs de cada serviço
2. Verifique as variáveis de ambiente
3. Verifique a configuração do Nginx
4. Verifique as conexões com banco de dados e Redis

