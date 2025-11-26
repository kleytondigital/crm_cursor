# Como Executar o Seed de Dados Iniciais

O seed cria os dados iniciais necessários para o sistema funcionar, incluindo:
- Empresa "Sistema" para Super Admins
- Empresa "Empresa Exemplo"
- Usuário Super Admin (`superadmin@exemplo.com` / `superadmin123`)
- Usuário Admin (`admin@exemplo.com` / `123456`)

## Métodos de Execução

### Método 1: EasyPanel (Container em Produção)

1. **Acesse o terminal do container do backend no EasyPanel**
   - Vá até o serviço do backend
   - Clique em "Terminal" ou "Console"

2. **Execute o comando de seed:**
   ```bash
   npm run prisma:seed
   ```

   Ou diretamente:
   ```bash
   node prisma/seed.js
   ```

### Método 2: Docker Compose (Desenvolvimento Local)

1. **Verifique se o container está rodando:**
   ```bash
   docker ps | grep b2x-crm-backend
   ```

2. **Execute o comando dentro do container:**
   ```bash
   docker exec -it b2x-crm-backend npm run prisma:seed
   ```

   Ou diretamente:
   ```bash
   docker exec -it b2x-crm-backend node prisma/seed.js
   ```

### Método 3: Via Docker Compose Exec

```bash
docker-compose exec backend npm run prisma:seed
```

### Método 4: Usando npx prisma db seed (Recomendado)

Se você configurou o Prisma corretamente, pode usar:

```bash
# No EasyPanel
npx prisma db seed

# Ou no Docker local
docker exec -it b2x-crm-backend npx prisma db seed
```

## Verificação

Após executar o seed, você pode verificar se os dados foram criados:

1. **Conectar ao banco de dados:**
   ```bash
   # No container do postgres
   docker exec -it b2x-crm-postgres psql -U postgres -d b2x_crm
   ```

2. **Verificar empresas:**
   ```sql
   SELECT id, name, slug FROM companies;
   ```

3. **Verificar usuários:**
   ```sql
   SELECT email, name, role, "companyId" FROM users;
   ```

## Credenciais Criadas pelo Seed

### Super Admin
- **Email**: `superadmin@exemplo.com`
- **Senha**: `superadmin123`
- **Role**: `SUPER_ADMIN`
- **Empresa**: Sistema

### Admin (Empresa Exemplo)
- **Email**: `admin@exemplo.com`
- **Senha**: `123456`
- **Role**: `ADMIN`
- **Empresa**: Empresa Exemplo

## Notas Importantes

1. **O seed usa `upsert`**: Isso significa que se os dados já existem, eles serão atualizados ao invés de causar erro.

2. **Idempotente**: Você pode executar o seed múltiplas vezes sem problemas.

3. **Pré-requisitos OBRIGATÓRIOS**:
   - ✅ O banco de dados deve estar criado
   - ✅ **As migrations devem ter sido aplicadas** (`npx prisma migrate deploy`)
   - ✅ O Prisma Client deve estar gerado (`npx prisma generate`)

   **⚠️ IMPORTANTE**: Se você receber erro sobre colunas que não existem (como `automationsEnabled`), isso significa que as migrations ainda não foram aplicadas. Execute primeiro:
   ```bash
   npx prisma migrate deploy
   ```

## Troubleshooting

### Erro: "Cannot find module '@prisma/client'"
```bash
# Gere o Prisma Client primeiro
npx prisma generate
```

### Erro: "Database connection failed"
- Verifique se a variável `DATABASE_URL` está configurada corretamente
- Verifique se o banco de dados está acessível do container

### Erro: "Table does not exist"
- Execute as migrations primeiro:
  ```bash
  npx prisma migrate deploy
  ```

### Erro: "The column `automationsEnabled` does not exist"
Este erro ocorre quando o Prisma Client foi gerado com um schema atualizado, mas as migrations ainda não foram aplicadas ao banco.

**Solução:**
1. **Aplique todas as migrations primeiro:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Se houver migrations marcadas como falhas, resolva-as:**
   ```bash
   # Verificar status das migrations
   npx prisma migrate status
   
   # Resolver migration falha (se necessário)
   npx prisma migrate resolve --applied <nome_da_migration>
   
   # Aplicar migrations novamente
   npx prisma migrate deploy
   ```

3. **Depois execute o seed:**
   ```bash
   npm run prisma:seed
   ```

**Ordem correta de execução:**
```bash
# 1. Gerar Prisma Client
npx prisma generate

# 2. Aplicar migrations
npx prisma migrate deploy

# 3. Executar seed
npm run prisma:seed
```

### Executar seed em banco existente

Se você já tem dados e quer resetar tudo:

```bash
# CUIDADO: Isso apaga TODOS os dados!
npx prisma migrate reset
# Isso vai executar o seed automaticamente após resetar

# OU apenas executar o seed novamente (vai fazer upsert)
npm run prisma:seed
```

