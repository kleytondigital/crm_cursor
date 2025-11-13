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
   - **⚠️ IMPORTANTE**: No Easypanel, o **Target (Mount Path)** deve ser um **caminho absoluto** começando com `/`
   - **Source** (Host): `./uploads` ou caminho absoluto no host
   - **Target** (Container): `/app/uploads` (**DEVE começar com /** - caminho absoluto)
   - **❌ NÃO use**: `./app/uploads` ou `app/uploads` (caminhos relativos não funcionam)
   - **✅ Use**: `/app/uploads` (caminho absoluto)
   - **Configuração no Easypanel**:
     - Na seção **"Volumes"** ou **"Storage"** do serviço backend
     - Adicione um volume:
       - **Name**: `uploads` (opcional)
       - **Source**: `./uploads` (caminho relativo ao projeto)
       - **Mount Path**: `/app/uploads` (**OBRIGATORIAMENTE caminho absoluto**)
     - Ou use caminho absoluto:
       - **Source**: `/var/www/uploads` (caminho absoluto no host)
       - **Mount Path**: `/app/uploads` (caminho absoluto no container)

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
   - **⚠️ IMPORTANTE**: O Dockerfile Path é relativo ao Context
   - **Context**: `./frontend` (caminho relativo à raiz do projeto)
   - **Dockerfile Path**: `Dockerfile` (relativo ao Context, não `frontend/Dockerfile`)
   - **✅ Configuração Correta**:
     - Context: `./frontend`
     - Dockerfile Path: `Dockerfile` (apenas o nome do arquivo, relativo ao context)
   - **❌ Configuração Incorreta**:
     - Context: `./frontend`
     - Dockerfile Path: `frontend/Dockerfile` (NÃO funciona - duplica o path)
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

### 6. Configurar Domínio e SSL (⚠️ IMPORTANTE: Não precisa de Nginx separado!)

**⚠️ RECOMENDADO: Use o proxy reverso automático do Easypanel!**

O Easypanel já faz proxy reverso automaticamente através do domínio configurado. **Não é necessário criar um serviço Nginx separado!**

#### Opção 1: Usar Proxy Reverso Automático do Easypanel (Recomendado)

1. **Configurar domínio no Backend**:
   - No serviço `backend`, vá em **"Domain"**
   - Adicione seu domínio: `api.seu-dominio.com` ou `backcrm.seu-dominio.com`
   - Ative **SSL/TLS** (Let's Encrypt)
   - O Easypanel irá fazer proxy reverso automaticamente

2. **Configurar domínio no Frontend**:
   - No serviço `frontend`, vá em **"Domain"**
   - Adicione seu domínio: `crm.seu-dominio.com` ou `seu-dominio.com`
   - Ative **SSL/TLS** (Let's Encrypt)
   - O Easypanel irá fazer proxy reverso automaticamente

3. **Atualizar variáveis de ambiente do Frontend**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
   NEXT_PUBLIC_WS_URL=https://api.seu-dominio.com
   ```

#### Opção 2: Usar Nginx como Serviço Separado (Avançado - NÃO RECOMENDADO)

Se você realmente precisa de um Nginx separado:

1. **Criar ConfigMap no Easypanel**:
   - Vá em **"Configs"** ou **"Storage"**
   - Crie um novo ConfigMap: `nginx-config`
   - Key: `nginx.conf`
   - Value: Cole o conteúdo do arquivo `nginx/nginx.conf`

2. **Configurar Serviço Nginx**:
   - **Name**: `nginx`
   - **Image**: `nginx:alpine`
   - **Port**: `80`
   - **Volumes**:
     - **Source**: `nginx-config` (ConfigMap)
     - **Mount Path**: `/etc/nginx/conf.d/default.conf` ⚠️ **Caminho absoluto**
     - **Sub Path**: `nginx.conf`

3. **Configurar Domínio**:
   - No serviço `nginx`, vá em **"Domain"**
   - Adicione seu domínio
   - Ative **SSL/TLS**

**⚠️ NOTA**: Se você criar um serviço Nginx separado, precisará configurar os nomes dos serviços corretamente no `nginx.conf` (backend e frontend).

### 7. Configurar Variáveis de Ambiente

**Importante**: Atualize as seguintes variáveis:

#### Backend:
- `DATABASE_URL`: Use o nome do serviço PostgreSQL (`postgres`) como host
- `REDIS_HOST`: Use o nome do serviço Redis (`redis`) como host
- `APP_URL`: Use seu domínio do frontend com HTTPS (ex: `https://crm.seu-dominio.com`)
- `MEDIA_BASE_URL`: Use seu domínio do backend com HTTPS (ex: `https://api.seu-dominio.com`)
- `JWT_SECRET`: Gere uma chave secreta segura (use `openssl rand -base64 32`)

#### Frontend:
- `NEXT_PUBLIC_API_URL`: Use o domínio do backend com HTTPS (ex: `https://api.seu-dominio.com`)
- `NEXT_PUBLIC_WS_URL`: Use o domínio do backend com HTTPS (ex: `https://api.seu-dominio.com`)

### 8. Primeira Execução

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

### 9. Configurar CORS no Backend (Se necessário)

Se o backend e frontend estiverem em domínios diferentes, configure CORS no backend:

**Arquivo**: `src/main.ts`

```typescript
app.enableCors({
  origin: [
    'https://crm.seu-dominio.com', // Domínio do frontend
    'http://localhost:3001', // Para desenvolvimento local
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### 10. Testar a Aplicação

1. **Acesse o domínio do frontend**: `https://crm.seu-dominio.com` (ou o domínio configurado)
2. **Verifique o health check do backend**: `https://api.seu-dominio.com/health`
3. **Teste o login** com as credenciais do seed
4. **Verifique se não está mostrando a página padrão do Nginx**

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

1. Verifique os logs do serviço `frontend` no Easypanel
2. Verifique se `NEXT_PUBLIC_API_URL` está correto
3. Verifique se o backend está rodando
4. Verifique se o domínio está configurado corretamente no serviço Frontend

### WebSocket não funciona

1. Verifique se `NEXT_PUBLIC_WS_URL` está apontando para o domínio do backend
2. Verifique os logs do backend para erros de WebSocket
3. Verifique se o domínio do backend está configurado corretamente
4. O Easypanel suporta WebSocket automaticamente através do domínio configurado

### Página padrão do Nginx aparece

1. **⚠️ IMPORTANTE: Remova o serviço Nginx** (se existir)
2. **Configure o domínio no serviço Frontend**, não no Nginx
3. **Use o proxy reverso automático do Easypanel** - não crie um serviço Nginx separado
4. Veja `EASYPANEL-FIX-NGINX.md` para mais detalhes

### Erro "invalid mount target" no Nginx

1. **⚠️ IMPORTANTE: Não use um serviço Nginx separado** - use o proxy reverso automático do Easypanel
2. Se realmente precisar de Nginx, use ConfigMaps (veja Opção 2 na seção 6)

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

