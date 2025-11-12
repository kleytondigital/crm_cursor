# B2X CRM - Sistema SaaS Multi-tenant

Sistema CRM desenvolvido com NestJS, PostgreSQL e Prisma ORM, com arquitetura multi-tenant.

## 🚀 Tecnologias

- **NestJS** - Framework Node.js
- **PostgreSQL** - Banco de dados
- **Prisma ORM** - ORM para TypeScript
- **JWT** - Autenticação
- **TypeScript** - Linguagem de programação
- **bcrypt** - Hash de senhas

## 📋 Pré-requisitos

- Node.js (v18 ou superior)
- PostgreSQL
- npm ou yarn

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd CRM
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o arquivo `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/b2x_crm?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
TENANT_HEADER="x-tenant-id"
```

4. Execute as migrações do Prisma:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Inicie o servidor:
```bash
npm run start:dev
```

## 📁 Estrutura do Projeto

```
src/
├── modules/           # Módulos da aplicação
│   ├── auth/         # Módulo de autenticação
│   ├── companies/    # Módulo de empresas
│   └── users/        # Módulo de usuários
├── shared/           # Código compartilhado
│   ├── decorators/   # Decorators customizados
│   ├── guards/       # Guards de autenticação
│   ├── middleware/   # Middlewares
│   └── prisma/       # Serviço Prisma
└── main.ts           # Arquivo principal
```

## 🔐 Autenticação

O sistema usa JWT para autenticação. Para acessar rotas protegidas, inclua o token no header:

```
Authorization: Bearer <token>
```

### Endpoints de Autenticação

- `POST /auth/register` - Registrar novo usuário
- `POST /auth/login` - Login

## 🏢 Multi-tenant

O sistema identifica o tenant (empresa) através do token JWT. O middleware `TenantMiddleware` extrai a informação da empresa do token e adiciona ao request.

### Decorators

- `@CurrentUser()` - Obtém o usuário atual do request
- `@Tenant()` - Obtém a empresa (tenant) do request
- `@Public()` - Marca rotas como públicas (sem autenticação)

## 📚 Endpoints

### Companies

- `GET /companies` - Listar todas as empresas
- `GET /companies/:id` - Obter empresa por ID
- `POST /companies` - Criar nova empresa (público)
- `PATCH /companies/:id` - Atualizar empresa
- `DELETE /companies/:id` - Desativar empresa

### Users

- `GET /users` - Listar usuários (filtrado por empresa se não for ADMIN)
- `GET /users/:id` - Obter usuário por ID
- `POST /users` - Criar novo usuário
- `PATCH /users/:id` - Atualizar usuário
- `DELETE /users/:id` - Desativar usuário

## 🔒 Segurança

- Senhas são hasheadas com bcrypt
- Tokens JWT com expiração configurável
- Validação de dados com class-validator
- Isolamento de dados por tenant
- Soft delete para empresas e usuários

## 📝 Scripts

- `npm run start:dev` - Inicia o servidor em modo desenvolvimento
- `npm run build` - Compila o projeto
- `npm run prisma:generate` - Gera o cliente Prisma
- `npm run prisma:migrate` - Executa as migrações
- `npm run prisma:studio` - Abre o Prisma Studio
- `npm run lint` - Executa o linter
- `npm test` - Executa os testes

## 🎯 Boas Práticas

- Separação de responsabilidades por módulos
- Uso de DTOs para validação
- Guards para autenticação e autorização
- Middleware para identificação de tenant
- Soft delete para preservar dados
- Validação de dados de entrada
- Tratamento de erros adequado

## 📄 Licença

MIT

