# Configuração do Sistema - Setup

## Erro 400 ao salvar configurações

Se você estiver recebendo erro 400 ao tentar salvar as configurações do sistema, pode ser por um dos seguintes motivos:

### 1. Migration não executada

A tabela `system_settings` pode não existir no banco de dados. Execute a migration:

```bash
# Executar migration
npx prisma migrate deploy

# OU se estiver em desenvolvimento
npx prisma migrate dev
```

### 2. Seed não executado

Após executar a migration, execute o seed para criar as configurações padrão:

```bash
npm run prisma:seed
```

### 3. Verificar se a tabela existe

Você pode verificar se a tabela foi criada:

```sql
SELECT * FROM system_settings;
```

Se a tabela não existir, execute a migration manualmente ou verifique os logs do Prisma.

## Estrutura da Tabela

A tabela `system_settings` é um singleton (sempre tem ID = 1) e armazena:
- `crmName`: Nome do CRM (ex: "Darkmode CRM")
- `slogan`: Slogan/Tagline
- `version`: Versão exibida no sistema

## Como usar

1. Acesse o painel Super Admin em `/saas`
2. Vá para a seção "Configurações"
3. Edite nome, slogan e versão
4. As alterações são aplicadas globalmente para todos os tenants

