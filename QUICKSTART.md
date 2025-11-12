# Guia Rápido de Início - B2X CRM

## Passo a Passo

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Banco de Dados

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/b2x_crm?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
TENANT_HEADER="x-tenant-id"
```

**Importante:** Altere o `JWT_SECRET` para um valor seguro em produção!

### 3. Configurar PostgreSQL

Certifique-se de que o PostgreSQL está rodando e crie o banco de dados:

```sql
CREATE DATABASE b2x_crm;
```

### 4. Executar Migrações

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. (Opcional) Popular Banco com Dados de Exemplo

```bash
npm run prisma:seed
```

Isso criará:
- Uma empresa de exemplo (slug: `exemplo-empresa`)
- Um usuário admin (email: `admin@exemplo.com`, senha: `123456`)
- Um usuário comum (email: `user@exemplo.com`, senha: `123456`)

### 6. Iniciar o Servidor

```bash
npm run start:dev
```

O servidor estará disponível em `http://localhost:3000`

## Testando a API

### 1. Criar uma Empresa (Público)

```bash
curl -X POST http://localhost:3000/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minha Empresa",
    "slug": "minha-empresa",
    "email": "contato@minhaempresa.com",
    "phone": "(11) 99999-9999",
    "document": "12.345.678/0001-90"
  }'
```

### 2. Registrar um Usuário (Público)

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "123456",
    "name": "Usuario Teste",
    "companyId": "uuid-da-empresa-criada"
  }'
```

### 3. Fazer Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "123456"
  }'
```

Use o `access_token` retornado nas próximas requisições.

### 4. Listar Usuários (Protegido)

```bash
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer <seu-token-jwt>"
```

## Estrutura do Projeto

```
src/
├── modules/           # Módulos da aplicação
│   ├── auth/         # Autenticação JWT
│   ├── companies/    # Gerenciamento de empresas
│   └── users/        # Gerenciamento de usuários
├── shared/           # Código compartilhado
│   ├── decorators/   # Decorators customizados
│   ├── filters/      # Filtros de exceção
│   ├── guards/       # Guards de autenticação
│   ├── middleware/   # Middlewares
│   └── prisma/       # Serviço Prisma
└── main.ts           # Ponto de entrada
```

## Recursos Implementados

✅ Autenticação JWT
✅ Multi-tenant (identificação por token)
✅ CRUD completo de empresas
✅ CRUD completo de usuários
✅ Isolamento de dados por tenant
✅ Validação de dados
✅ Tratamento de erros
✅ Soft delete
✅ Roles (ADMIN, USER, MANAGER)
✅ Guards e decorators customizados

## Próximos Passos

- Adicionar mais módulos de negócio
- Implementar testes unitários e E2E
- Adicionar logging estruturado
- Implementar cache
- Adicionar rate limiting
- Implementar upload de arquivos
- Adicionar notificações

