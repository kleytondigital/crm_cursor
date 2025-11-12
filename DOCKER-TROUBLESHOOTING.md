# 🔧 Troubleshooting Docker Build - B2X CRM

## Problema: Build falha com exit code 1

### Possíveis Causas

1. **package-lock.json não encontrado**
   - O `npm ci` precisa do `package-lock.json`
   - Verifique se o arquivo existe no repositório
   - Se não existir, gere com: `npm install`

2. **Dependências do sistema faltando**
   - Prisma precisa de `python3`, `make`, `g++` no Alpine Linux
   - bcrypt precisa de `python3`, `make`, `g++` para compilar

3. **Prisma generate falha**
   - Verifique se o schema Prisma está correto
   - Verifique se o DATABASE_URL não é necessário (não é, só precisa do schema)
   - Execute localmente: `npx prisma generate`

4. **Build do NestJS falha**
   - Verifique se há erros de TypeScript
   - Execute localmente: `npm run build`
   - Verifique se todos os arquivos necessários estão sendo copiados

### Soluções

#### 1. Verificar package-lock.json

```bash
# Verificar se existe
ls -la package-lock.json

# Se não existir, gerar
npm install
```

#### 2. Verificar Prisma Schema

```bash
# Validar schema
npx prisma validate

# Gerar client localmente
npx prisma generate
```

#### 3. Testar Build Localmente

```bash
# Build local
npm run build

# Verificar se dist existe
ls -la dist
```

#### 4. Verificar Dependências

```bash
# Limpar cache
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

#### 5. Docker Build Local

```bash
# Build local para testar
docker build -t b2x-crm-backend:test .

# Ver logs detalhados
docker build --progress=plain -t b2x-crm-backend:test .
```

### Erros Comuns

#### Erro: "Cannot find module '@prisma/client'"

**Solução**: O Prisma Client não foi gerado corretamente.
- Verifique se `npx prisma generate` está sendo executado
- Verifique se o schema Prisma está correto
- Verifique se as dependências estão instaladas

#### Erro: "npm ci failed"

**Solução**: 
- Verifique se `package-lock.json` existe
- Verifique se há conflitos de versão
- Tente usar `npm install` em vez de `npm ci`

#### Erro: "Build failed: dist directory not found"

**Solução**:
- Verifique se o build do NestJS está funcionando
- Execute `npm run build` localmente
- Verifique se há erros de TypeScript

### Verificações no Easypanel

1. **Verificar logs do build**
   - No Easypanel, acesse os logs do build
   - Procure por erros específicos

2. **Verificar variáveis de ambiente**
   - Certifique-se de que as variáveis estão configuradas corretamente
   - O DATABASE_URL não é necessário para o build, só para runtime

3. **Verificar contexto do build**
   - Certifique-se de que o contexto está correto (`.` para raiz)
   - Certifique-se de que o Dockerfile está no caminho correto

### Comandos Úteis

```bash
# Verificar se Dockerfile está correto
cat Dockerfile

# Verificar .dockerignore
cat .dockerignore

# Build local para debug
docker build --progress=plain --no-cache -t b2x-crm-backend:test .

# Executar container localmente
docker run -p 3000:3000 b2x-crm-backend:test

# Ver logs do container
docker logs <container-id>
```

### Próximos Passos

1. Se o build falhar, verifique os logs do Easypanel
2. Execute o build localmente para reproduzir o erro
3. Verifique se todas as dependências estão instaladas
4. Verifique se o Prisma Client está sendo gerado corretamente
5. Verifique se o build do NestJS está funcionando

## 🔍 Debug Avançado

### Habilitar logs detalhados no Docker

```dockerfile
# Adicionar ao Dockerfile para debug
RUN npm ci --prefer-offline --no-audit --loglevel=verbose
```

### Verificar cada stage do build

```bash
# Build até o stage builder
docker build --target builder -t b2x-crm-builder:test .

# Executar container do builder
docker run -it b2x-crm-builder:test sh

# Verificar se Prisma Client foi gerado
ls -la node_modules/.prisma

# Verificar se build foi criado
ls -la dist
```

### Verificar arquivos copiados

```dockerfile
# Adicionar ao Dockerfile para debug
RUN ls -la
RUN ls -la node_modules/.prisma || echo "Prisma Client not found"
RUN ls -la dist || echo "dist not found"
```

## 📚 Recursos

- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)

