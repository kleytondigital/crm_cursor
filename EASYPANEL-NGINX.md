# 🔧 Configuração do Nginx no Easypanel - B2X CRM

## ⚠️ Problema: "invalid mount target" e Página Padrão do Nginx

### Problema 1: Erro de Mount Target

```
invalid mount target, must be an absolute path: ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

### Problema 2: Página Padrão do Nginx

O domínio está mostrando a página padrão do Nginx ao invés da aplicação.

## ✅ Solução Recomendada: Usar Proxy Reverso do Easypanel

**Não é necessário criar um serviço Nginx separado no Easypanel!** O Easypanel já faz proxy reverso automaticamente através do domínio configurado.

### Opção 1: Usar Proxy Reverso Automático do Easypanel (Recomendado)

1. **Configure os serviços Backend e Frontend normalmente** (sem Nginx)

2. **Configure o domínio no serviço Frontend**:
   - No serviço `frontend`, vá em **"Domain"**
   - Adicione seu domínio: `crm.seu-dominio.com`
   - Ative **SSL/TLS** (Let's Encrypt)
   - O Easypanel irá fazer proxy reverso automaticamente

3. **Configure o domínio no serviço Backend** (opcional, se quiser acesso direto):
   - No serviço `backend`, vá em **"Domain"**
   - Adicione seu domínio: `api.seu-dominio.com` ou `backcrm.seu-dominio.com`
   - Ative **SSL/TLS** (Let's Encrypt)

4. **Atualize as variáveis de ambiente do Frontend**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
   NEXT_PUBLIC_WS_URL=https://api.seu-dominio.com
   ```

### Opção 2: Usar Nginx como Serviço Separado (Avançado)

Se você realmente precisa de um Nginx separado (para configurações customizadas):

1. **Criar ConfigMap no Easypanel**:
   - No Easypanel, vá em **"Configs"** ou **"Storage"**
   - Crie um novo ConfigMap
   - Nome: `nginx-config`
   - Key: `nginx.conf`
   - Value: Cole o conteúdo do arquivo `nginx/nginx.conf`

2. **Configurar Serviço Nginx**:
   - **Name**: `nginx`
   - **Image**: `nginx:alpine`
   - **Port**: `80`
   - **Volumes**:
     - **Source**: `nginx-config` (ConfigMap criado)
     - **Mount Path**: `/etc/nginx/conf.d/default.conf` ⚠️ **Caminho absoluto**
     - **Sub Path**: `nginx.conf` (nome da key no ConfigMap)

3. **Configurar Domínio**:
   - No serviço `nginx`, vá em **"Domain"**
   - Adicione seu domínio
   - Ative **SSL/TLS**

## 🔧 Configuração do Nginx (Se Usar Opção 2)

### Arquivo nginx.conf

O arquivo `nginx/nginx.conf` já está configurado corretamente para:
- Proxy reverso para backend (`/api/`)
- Proxy reverso para frontend (`/`)
- WebSocket para Socket.IO (`/socket.io/`)
- Uploads de arquivos (`/uploads/`)

### Importante: Nomes dos Serviços

No Easypanel, os nomes dos serviços devem corresponder aos nomes no `nginx.conf`:
- Backend: `backend` (deve ser o nome do serviço no Easypanel)
- Frontend: `frontend` (deve ser o nome do serviço no Easypanel)

## 📝 Passo a Passo: Configurar Proxy Reverso Automático (Recomendado)

### 1. Configurar Backend

1. Serviço: `backend`
2. Port: `3000`
3. Domain: `api.seu-dominio.com` ou `backcrm.seu-dominio.com`
4. SSL: Ativado (Let's Encrypt)

### 2. Configurar Frontend

1. Serviço: `frontend`
2. Port: `3001`
3. Domain: `crm.seu-dominio.com` ou `seu-dominio.com`
4. SSL: Ativado (Let's Encrypt)
5. **Variáveis de Ambiente**:
   ```env
   NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
   NEXT_PUBLIC_WS_URL=https://api.seu-dominio.com
   ```

### 3. Configurar CORS no Backend (Se necessário)

Se o backend e frontend estiverem em domínios diferentes, configure CORS no backend:

```typescript
// src/main.ts
app.enableCors({
  origin: ['https://crm.seu-dominio.com'],
  credentials: true,
});
```

## 🔍 Verificação

Após configurar:

1. **Acesse o domínio do frontend**: `https://crm.seu-dominio.com`
2. **Deve carregar a aplicação**, não a página padrão do Nginx
3. **Acesse a API**: `https://api.seu-dominio.com/health`
4. **Deve retornar**: `{"status":"ok",...}`

## 🐛 Troubleshooting

### Página Padrão do Nginx

**Solução**: Você está acessando o serviço Nginx diretamente. Use o proxy reverso do Easypanel ou configure o domínio corretamente.

### Erro "invalid mount target"

**Solução**: No Easypanel, use ConfigMaps ao invés de volumes para arquivos de configuração, ou use o proxy reverso automático.

### WebSocket não funciona

**Solução**: Configure o WebSocket no Easypanel ou use o proxy reverso automático que já suporta WebSocket.

## 📚 Referências

- [Easypanel Domains Documentation](https://easypanel.io/docs/domains)
- [Easypanel Proxy Documentation](https://easypanel.io/docs/proxy)
- [Nginx Documentation](https://nginx.org/en/docs/)

