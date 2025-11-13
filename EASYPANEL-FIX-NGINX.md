# 🔧 Correção Rápida: Nginx no Easypanel

## ❌ Problemas

1. **Erro de Mount Target**: `invalid mount target, must be an absolute path: ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro`
2. **Página Padrão do Nginx**: O domínio está mostrando "Welcome to nginx!" ao invés da aplicação

## ✅ Solução: Remover Nginx e Usar Proxy Reverso Automático do Easypanel

**⚠️ IMPORTANTE: No Easypanel, não é necessário criar um serviço Nginx separado!**

O Easypanel já faz proxy reverso automaticamente através do domínio configurado.

### Passo a Passo

#### 1. Remover Serviço Nginx (Se Existir)

1. No Easypanel, vá no projeto
2. Se houver um serviço chamado `nginx`, **DELETE-O**
3. O Easypanel irá remover o serviço automaticamente

#### 2. Configurar Domínio no Frontend

1. No serviço `frontend`, vá em **"Domain"** ou **"Domains"**
2. Clique em **"Add Domain"** ou **"Add"**
3. Adicione seu domínio: `crm.aoseudispor.com.br` (ou seu domínio)
4. Ative **SSL/TLS** (Let's Encrypt)
5. O Easypanel irá gerar o certificado SSL automaticamente
6. O Easypanel irá fazer proxy reverso automaticamente para a porta `3001`

#### 3. Configurar Domínio no Backend

1. No serviço `backend`, vá em **"Domain"** ou **"Domains"**
2. Clique em **"Add Domain"** ou **"Add"**
3. Adicione seu domínio: `backcrm.aoseudispor.com.br` (ou seu domínio)
4. Ative **SSL/TLS** (Let's Encrypt)
5. O Easypanel irá gerar o certificado SSL automaticamente
6. O Easypanel irá fazer proxy reverso automaticamente para a porta `3000`

#### 4. Atualizar Variáveis de Ambiente do Frontend

1. No serviço `frontend`, vá em **"Environment Variables"** ou **"Env"**
2. Atualize as seguintes variáveis:
   ```env
   NEXT_PUBLIC_API_URL=https://backcrm.aoseudispor.com.br
   NEXT_PUBLIC_WS_URL=https://backcrm.aoseudispor.com.br
   ```
3. **Salve** as alterações
4. O Easypanel irá recriar o container automaticamente

#### 5. Verificar Variáveis de Ambiente do Backend

1. No serviço `backend`, vá em **"Environment Variables"** ou **"Env"**
2. Verifique se as seguintes variáveis estão corretas:
   ```env
   APP_URL=https://crm.aoseudispor.com.br
   MEDIA_BASE_URL=https://backcrm.aoseudispor.com.br
   ```
3. **Salve** as alterações se necessário
4. O Easypanel irá recriar o container automaticamente

#### 6. Verificar CORS no Backend

O backend já está configurado com CORS permitindo todas as origens (`origin: true`), então deve funcionar automaticamente.

#### 7. Testar

1. **Acesse o domínio do frontend**: `https://crm.aoseudispor.com.br`
2. **Deve carregar a aplicação**, não a página padrão do Nginx
3. **Acesse o health check do backend**: `https://backcrm.aoseudispor.com.br/health`
4. **Deve retornar**: `{"status":"ok",...}`

## 🔍 Verificação

Após configurar:

1. **Frontend deve estar acessível**: `https://crm.aoseudispor.com.br`
2. **Backend deve estar acessível**: `https://backcrm.aoseudispor.com.br/health`
3. **Não deve mostrar a página padrão do Nginx**
4. **SSL deve estar ativo** (cadeado verde no navegador)

## 🐛 Troubleshooting

### Ainda mostra a página padrão do Nginx

**Causa**: Você pode estar acessando o serviço Nginx diretamente ao invés do frontend.

**Solução**:
1. Verifique se você removeu o serviço Nginx
2. Verifique se o domínio está configurado no serviço Frontend, não no Nginx
3. Verifique se o domínio está apontando para o serviço correto no Easypanel

### Erro "invalid mount target"

**Causa**: Você está tentando montar um volume com caminho relativo no Easypanel.

**Solução**: 
1. **NÃO use um serviço Nginx separado** - use o proxy reverso automático do Easypanel
2. Se realmente precisar de Nginx, use ConfigMaps (veja `EASYPANEL.md`)

### WebSocket não funciona

**Causa**: O proxy reverso do Easypanel pode não estar configurado para WebSocket.

**Solução**: 
1. O Easypanel suporta WebSocket automaticamente através do domínio configurado
2. Verifique se `NEXT_PUBLIC_WS_URL` está apontando para o domínio do backend
3. Verifique os logs do backend para erros de WebSocket

## 📚 Referências

- [EASYPANEL.md](./EASYPANEL.md) - Documentação completa do Easypanel
- [EASYPANEL-NGINX.md](./EASYPANEL-NGINX.md) - Documentação sobre Nginx no Easypanel

