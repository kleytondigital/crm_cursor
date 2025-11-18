# 🔧 Fix: Erro de Permissões do Prisma no Docker

## 🐛 Problema

```
Error: EACCES: permission denied, unlink '/app/node_modules/.prisma/client/index.js'
```

### Causa

O erro ocorre porque:
1. Durante o **build**, o Prisma Client é gerado como usuário `root`
2. Durante a **execução**, o container roda como usuário `nestjs` (não-root)
3. O usuário `nestjs` não tem permissão para modificar arquivos criados pelo `root`

---

## ✅ Solução Implementada

### 1. Ajuste no Dockerfile

**Arquivo:** `Dockerfile`

```dockerfile
# Criar diretórios necessários e ajustar permissões (antes de mudar usuário)
RUN mkdir -p /app/uploads && \
    chmod +x /app/docker-entrypoint.sh && \
    chown -R nestjs:nodejs /app/node_modules/.prisma /app/uploads 2>/dev/null || true

# Mudar para usuário não-root
USER nestjs
```

**O que faz:**
- Cria diretórios necessários
- Muda ownership do `.prisma` para o usuário `nestjs`
- `2>/dev/null || true` ignora erros se o diretório não existir ainda

### 2. Ajuste no Entrypoint

**Arquivo:** `scripts/docker-entrypoint.sh`

```bash
# Prisma Client já foi gerado durante o build
# Apenas verificar se existe e está atualizado
if [ ! -d "/app/node_modules/.prisma/client" ]; then
  echo "⚠️  Prisma Client não encontrado, gerando..."
  npx prisma generate
else
  echo "✅ Prisma Client já está disponível"
fi
```

**O que faz:**
- Verifica se o Prisma Client existe
- Só tenta gerar se não existir
- Evita tentar sobrescrever arquivos sem permissão

---

## 🚀 Como Aplicar

### Opção 1: Rebuild Completo (Recomendado)

```bash
# No Easypanel, simplesmente fazer rebuild
# Ou localmente:
docker build --no-cache -t seu-crm-backend .
docker-compose up -d --force-recreate
```

### Opção 2: Fix Manual (Se já estiver em produção)

```bash
# 1. Conectar no container
docker exec -it <container-id> sh

# 2. Verificar permissões
ls -la /app/node_modules/.prisma/

# 3. Se necessário, ajustar (como root)
docker exec -u root -it <container-id> sh
chown -R nestjs:nodejs /app/node_modules/.prisma
exit

# 4. Reiniciar container
docker restart <container-id>
```

---

## 🔍 Diagnóstico

### Como Identificar o Problema

**Sintomas:**
- Erro `EACCES: permission denied` nos logs
- Mensagem menciona `/app/node_modules/.prisma/`
- Container inicia mas aplicação falha

**Verificar permissões:**
```bash
# Dentro do container
docker exec -it <container-id> sh

# Ver quem é o dono dos arquivos
ls -la /app/node_modules/.prisma/client/

# Deve mostrar:
# drwxr-xr-x  nestjs nodejs  ...
```

**Se mostrar `root` como dono, há um problema de permissões.**

---

## 📊 Logs Esperados

### ✅ Logs Corretos (Após Fix)

```
🚀 Starting B2X CRM Backend...
✅ DATABASE_URL is configured
📦 Applying database migrations...
No pending migrations to apply.
✅ Migrations applied successfully
✅ Prisma Client já está disponível
📊 Migration status:
[...]
🎯 Starting application...
```

### ❌ Logs com Erro (Antes do Fix)

```
🚀 Starting B2X CRM Backend...
✅ DATABASE_URL is configured
📦 Applying database migrations...
✅ Migrations applied successfully
🔧 Generating Prisma Client...
Error: EACCES: permission denied, unlink '/app/node_modules/.prisma/client/index.js'
```

---

## 🛡️ Por Que Usar Usuário Não-Root?

### Segurança

Rodar como `root` é um risco de segurança:
- ❌ Se o container for comprometido, atacante tem acesso root
- ❌ Pode afetar o host em alguns casos
- ❌ Não segue best practices de Docker

### Boas Práticas

Usar usuário não-root (`nestjs`):
- ✅ Princípio do menor privilégio
- ✅ Melhor isolamento
- ✅ Recomendado por Docker e Kubernetes
- ✅ Requerido em alguns ambientes (PCI-DSS, etc.)

---

## 🔄 Alternativas

### Opção A: Rodar como Root (NÃO RECOMENDADO)

```dockerfile
# Remover esta linha do Dockerfile:
# USER nestjs

# Mas isso é INSEGURO e não é recomendado!
```

### Opção B: Volume com Permissões Corretas

```yaml
# docker-compose.yml
volumes:
  - ./node_modules/.prisma:/app/node_modules/.prisma:rw

# Definir permissões no volume
```

### Opção C: Gerar Prisma Client em Runtime (Mais Lento)

```dockerfile
# Não copiar .prisma do builder
# Gerar sempre no entrypoint
# Mais lento, mas evita problemas de permissão
```

**Recomendação:** Use a solução implementada (Opção no Dockerfile + Entrypoint).

---

## 🧪 Teste

### Verificar se Fix Funcionou

```bash
# 1. Rebuild e restart
docker-compose up -d --build

# 2. Ver logs
docker logs <container-id>

# 3. Verificar se aplicação iniciou
curl http://localhost:3000/health

# 4. Verificar permissões
docker exec -it <container-id> ls -la /app/node_modules/.prisma/client/
```

**Esperado:**
```
drwxr-xr-x  nestjs nodejs  4096 Jan 18 12:00 .
-rw-r--r--  nestjs nodejs  1234 Jan 18 12:00 index.js
```

---

## 📚 Referências

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Prisma in Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [Running as Non-Root](https://docs.docker.com/engine/security/userns/)

---

## 🆘 Troubleshooting

### Erro Persiste Após Fix

**Verificar:**
```bash
# 1. Rebuild SEM cache
docker build --no-cache -t seu-crm .

# 2. Remover containers antigos
docker-compose down -v
docker-compose up -d

# 3. Verificar se Dockerfile foi atualizado
docker exec -it <container-id> cat /app/docker-entrypoint.sh
```

### Permission Denied em Outros Arquivos

Se o erro for em outros arquivos/diretórios:

```dockerfile
# Adicionar no Dockerfile, antes do USER nestjs:
RUN chown -R nestjs:nodejs /app
```

**⚠️ Cuidado:** Isso pode tornar o build mais lento.

---

## ✅ Checklist de Resolução

- [x] Dockerfile atualizado com `chown`
- [x] `docker-entrypoint.sh` atualizado para verificar antes de gerar
- [x] Rebuild do container
- [x] Logs não mostram mais erro `EACCES`
- [x] Aplicação inicia corretamente
- [x] Migrations são aplicadas
- [x] Prisma Client funciona

---

**Última atualização:** 2025-01-18  
**Status:** ✅ Resolvido  
**Prioridade:** 🔥 Alta (quebra a aplicação)

