# 🚀 Guia de Deploy - B2X CRM

Este guia descreve como fazer o deploy do B2X CRM em produção usando **Easypanel** com Docker e Nginx.

## 📋 Arquivos de Configuração

O projeto inclui os seguintes arquivos para deploy:

- `Dockerfile` - Backend NestJS
- `frontend/Dockerfile` - Frontend Next.js
- `docker-compose.yml` - Orquestração local (opcional)
- `nginx/nginx.conf` - Configuração Nginx
- `DEPLOY.md` - Documentação detalhada
- `EASYPANEL.md` - Guia específico para Easypanel

## 🚀 Deploy Rápido no Easypanel

### 1. Preparar Repositório Git

```bash
# Adicionar arquivos ao Git
git add .
git commit -m "Preparar para produção"
git push origin main
```

### 2. Criar Projeto no Easypanel

1. Acesse [Easypanel](https://easypanel.io)
2. Crie um novo projeto
3. Conecte seu repositório Git
4. Configure a branch: `main`

### 3. Configurar Serviços

#### PostgreSQL
- **Name**: `postgres`
- **Database**: `b2x_crm`
- Anote as credenciais

#### Redis
- **Name**: `redis`
- **Port**: `6379`

#### Backend
- **Type**: Docker
- **Dockerfile**: `Dockerfile`
- **Context**: `.`
- **Port**: `3000`
- **Health Check**: `/health`
- **Start Command**: `sh -c "npx prisma migrate deploy && node dist/main.js"`

**Variáveis de Ambiente**:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:SENHA@postgres:5432/b2x_crm?schema=public
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=sua-jwt-secret-super-segura
JWT_EXPIRES_IN=7d
APP_URL=https://seu-dominio.com
MEDIA_BASE_URL=https://seu-dominio.com
```

**Volumes** (⚠️ IMPORTANTE):
- **Source**: `./uploads` (caminho no host)
- **Mount Path**: `/app/uploads` (**DEVE ser caminho absoluto começando com /**)
- **❌ NÃO use**: `./app/uploads` ou `app/uploads`
- **✅ Use**: `/app/uploads`

#### Frontend
- **Type**: Docker
- **Context**: `./frontend` (caminho relativo à raiz)
- **Dockerfile Path**: `Dockerfile` ⚠️ **Relativo ao Context, não `frontend/Dockerfile`**
- **Port**: `3001`
- **✅ Configuração Correta**:
  - Context: `./frontend`
  - Dockerfile Path: `Dockerfile` (apenas o nome do arquivo)
- **❌ Configuração Incorreta**:
  - Context: `./frontend`
  - Dockerfile Path: `frontend/Dockerfile` (NÃO funciona)
- **Build Args**:
  ```env
  NEXT_PUBLIC_API_URL=https://seu-dominio.com/api
  NEXT_PUBLIC_WS_URL=https://seu-dominio.com
  ```

#### Nginx
- **Type**: Docker
- **Image**: `nginx:alpine`
- **Port**: `80`
- **Volume**: `./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro`

### 4. Configurar Domínio

1. No serviço Nginx, adicione seu domínio
2. Ative SSL/TLS (Let's Encrypt)
3. O certificado será gerado automaticamente

### 5. Deploy

1. O Easypanel irá fazer o build automaticamente
2. As migrações serão executadas no primeiro deploy
3. Verifique os logs de cada serviço

## 📝 Variáveis de Ambiente Importantes

### Backend

- `DATABASE_URL` - String de conexão PostgreSQL
- `REDIS_HOST` - Host do Redis (use nome do serviço)
- `REDIS_PORT` - Porta do Redis (6379)
- `JWT_SECRET` - Chave secreta JWT (use `openssl rand -base64 32`)
- `APP_URL` - URL da aplicação (com HTTPS)
- `MEDIA_BASE_URL` - URL base para mídia (com HTTPS)

### Frontend

- `NEXT_PUBLIC_API_URL` - URL da API (com HTTPS)
- `NEXT_PUBLIC_WS_URL` - URL do WebSocket (com HTTPS)

## 🔍 Verificação

1. **Health Check**: `https://seu-dominio.com/health`
2. **Frontend**: `https://seu-dominio.com`
3. **Logs**: Verifique os logs de cada serviço no Easypanel

## 🐛 Troubleshooting

### Backend não inicia
- Verifique as variáveis de ambiente
- Verifique a conexão com o banco de dados
- Verifique os logs

### Frontend não carrega
- Verifique se `NEXT_PUBLIC_API_URL` está correto
- Verifique se o backend está rodando
- Verifique os logs

### WebSocket não funciona
- Verifique a configuração do Nginx
- Verifique se `NEXT_PUBLIC_WS_URL` está correto

## 📚 Documentação Completa

Para mais detalhes, consulte:
- `DEPLOY.md` - Documentação completa de deploy
- `EASYPANEL.md` - Guia específico para Easypanel

## 🆘 Suporte

Em caso de problemas:
1. Verifique os logs de cada serviço
2. Verifique as variáveis de ambiente
3. Verifique a configuração do Nginx
4. Verifique as conexões com banco de dados e Redis

