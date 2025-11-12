# B2X CRM - Documentação da API

## Autenticação

Todas as rotas protegidas requerem um token JWT no header:

```
Authorization: Bearer <token>
```

## Endpoints

### Autenticação

#### POST /auth/register
Registra um novo usuário.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "123456",
  "name": "Nome do Usuário",
  "companyId": "uuid-da-empresa"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nome do Usuário",
    "role": "USER",
    "companyId": "uuid-da-empresa"
  }
}
```

#### POST /auth/login
Realiza login e retorna o token JWT.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Response:**
```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Nome do Usuário",
    "role": "USER",
    "companyId": "uuid-da-empresa"
  }
}
```

### Companies

#### POST /companies
Cria uma nova empresa (público, não requer autenticação).

**Body:**
```json
{
  "name": "Nome da Empresa",
  "slug": "nome-da-empresa",
  "email": "contato@empresa.com",
  "phone": "(11) 99999-9999",
  "document": "12.345.678/0001-90"
}
```

#### GET /companies
Lista todas as empresas ativas (requer autenticação).

#### GET /companies/:id
Obtém uma empresa por ID (requer autenticação).

#### PATCH /companies/:id
Atualiza uma empresa (requer autenticação).

**Body:**
```json
{
  "name": "Novo Nome",
  "email": "novo@email.com"
}
```

#### DELETE /companies/:id
Desativa uma empresa (soft delete) (requer autenticação).

### Users

#### POST /users
Cria um novo usuário (requer autenticação).

**Body:**
```json
{
  "email": "user@example.com",
  "password": "123456",
  "name": "Nome do Usuário",
  "companyId": "uuid-da-empresa",
  "role": "USER"
}
```

#### GET /users
Lista usuários (requer autenticação).
- Se não for ADMIN, retorna apenas usuários da mesma empresa.

#### GET /users/:id
Obtém um usuário por ID (requer autenticação).
- Se não for ADMIN, só pode acessar usuários da mesma empresa.

#### PATCH /users/:id
Atualiza um usuário (requer autenticação).
- Se não for ADMIN, só pode atualizar usuários da mesma empresa.

**Body:**
```json
{
  "name": "Novo Nome",
  "email": "novo@email.com",
  "password": "nova-senha"
}
```

#### DELETE /users/:id
Desativa um usuário (soft delete) (requer autenticação).
- Se não for ADMIN, só pode remover usuários da mesma empresa.

## Roles

- `ADMIN` - Acesso completo
- `USER` - Acesso limitado à própria empresa
- `MANAGER` - Acesso limitado à própria empresa (futuro)

## Multi-tenant

O sistema identifica automaticamente o tenant (empresa) através do token JWT. O middleware `TenantMiddleware` extrai a informação da empresa do token e adiciona ao request, permitindo isolamento de dados por empresa.

## Códigos de Status

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Bad Request
- `401` - Não autorizado
- `403` - Proibido
- `404` - Não encontrado
- `409` - Conflito (ex: email já existe)
- `500` - Erro interno do servidor

