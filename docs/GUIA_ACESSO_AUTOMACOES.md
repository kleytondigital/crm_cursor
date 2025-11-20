# 🚀 Guia de Acesso às Automações

Este documento explica como acessar e usar as funcionalidades de automação implementadas no CRM.

## 📍 URLs e Acessos

### 1. **Gestão de Templates (Super Admin)**

**URL:** `http://localhost:3000/saas` (ou sua URL de produção)

**Permissões necessárias:** `SUPER_ADMIN`

**Como acessar:**
1. Faça login com uma conta de **Super Administrador**
2. Acesse a rota `/saas` no navegador
3. Na barra de navegação superior, clique na aba **"Automações"**

**Funcionalidades disponíveis:**
- ✅ Criar novos templates de workflow
- ✅ Editar templates existentes
- ✅ Visualizar templates (preview do JSON)
- ✅ Remover templates (soft delete)
- ✅ Gerenciar variáveis editáveis
- ✅ Preview do workflow antes de salvar
- ✅ Validação de JSON e variáveis

**Passo a passo para criar um template:**
1. No painel Super Admin (`/saas`), clique na aba **"Automações"**
2. Clique no botão **"Novo Template"**
3. Preencha:
   - **Nome** do template (ex: "Atendimento Automático com IA")
   - **Descrição** (opcional)
   - **Categoria** (ex: "Atendimento", "Vendas", "Suporte")
   - **Ícone** (ex: "bot")
   - **JSON do Workflow** do n8n (cole o JSON exportado)
   - **Variáveis Editáveis** (adicione variáveis que os tenants poderão personalizar)
4. Use o botão **"Ver Preview"** para validar o JSON
5. Clique em **"Criar Template"**

---

### 2. **Criar Automações (Tenant Admin)**

**URL:** `http://localhost:3000/automacoes` (ou sua URL de produção)

**Permissões necessárias:** `ADMIN`, `MANAGER` ou `USER` (qualquer usuário autenticado)

**Como acessar:**
1. Faça login com qualquer conta autenticada
2. Acesse a rota `/automacoes` no navegador
   - Ou clique em **"Automações"** no menu de navegação
   - Ou clique no ícone no **Bottom Navigation** (mobile)

**Funcionalidades disponíveis:**
- ✅ Ver automações existentes (Minhas Automações)
- ✅ Ver templates disponíveis (Criar Nova)
- ✅ Criar nova automação a partir de um template
- ✅ Ativar/Desativar automações
- ✅ Remover automações
- ✅ Configurar variáveis do template
- ✅ Preview dos valores antes de criar
- ✅ Validação de campos obrigatórios

**Passo a passo para criar uma automação:**
1. Acesse a página `/automacoes`
2. Clique na aba **"Criar Nova"** ou no botão **"Criar Nova"** na aba "Minhas Automações"
3. Selecione um template disponível
4. Clique em **"Usar Template"**
5. Preencha:
   - **Nome da Automação** (obrigatório)
   - **Configurações** (campos baseados nas variáveis do template)
6. Use o botão **"Ver Preview"** para revisar os valores
7. Clique em **"Criar Automação"**

---

## 🔐 Requisitos de Permissões

### Super Admin (`/saas`)
- **Criar Templates:** ✅ Apenas Super Admin
- **Editar Templates:** ✅ Apenas Super Admin (templates globais)
- **Remover Templates:** ✅ Apenas Super Admin
- **Visualizar Templates:** ✅ Apenas Super Admin

### Tenant Admin/User (`/automacoes`)
- **Criar Automações:** ✅ Qualquer usuário autenticado
- **Ver Templates:** ✅ Qualquer usuário autenticado
- **Ativar/Desativar Automações:** ✅ Qualquer usuário autenticado
- **Remover Automações:** ✅ Qualquer usuário autenticado
- **Editar Configurações:** ⚠️ Em desenvolvimento

---

## 📋 Estrutura de URLs

```
Frontend:
├── /saas                    → Painel Super Admin
│   └── /saas#workflows      → Gestão de Templates
│
├── /automacoes              → Página de Automações (Tenant)
│   ├── "Minhas Automações" → Lista de instâncias criadas
│   └── "Criar Nova"        → Lista de templates disponíveis
│
└── /gestor                  → Painel Gestor
    └── /gestor#automations  → Seção de Automações (link para /automacoes)

Backend API:
├── GET    /workflow-templates              → Listar templates
├── POST   /workflow-templates              → Criar template (Super Admin)
├── GET    /workflow-templates/:id          → Obter template
├── PATCH  /workflow-templates/:id          → Atualizar template (Super Admin)
├── DELETE /workflow-templates/:id          → Remover template (Super Admin)
│
├── POST   /workflow-templates/:id/instantiate  → Criar instância
├── GET    /workflow-templates/instances/all    → Listar instâncias
├── GET    /workflow-templates/instances/:id    → Obter instância
├── PATCH  /workflow-templates/instances/:id    → Atualizar instância
├── POST   /workflow-templates/instances/:id/activate   → Ativar
├── POST   /workflow-templates/instances/:id/deactivate → Desativar
└── DELETE /workflow-templates/instances/:id            → Remover instância
```

---

## 🧪 Como Testar

### 1. Criar um Template (Super Admin)

1. **Acesse:** `http://localhost:3000/saas`
2. **Clique em:** "Automações" na barra superior
3. **Clique em:** "Novo Template"
4. **Preencha:**
   ```json
   Nome: Teste de Automação
   Descrição: Template de teste para validação
   Categoria: Teste
   Ícone: bot
   JSON do Workflow: {
     "name": "{{nomeEmpresa}} - Automação",
     "nodes": [
       {
         "name": "Webhook",
         "type": "n8n-nodes-base.webhook",
         "parameters": {
           "path": "teste",
           "httpMethod": "POST"
         }
       }
     ],
     "connections": {}
   }
   ```
5. **Adicione uma variável:**
   - Nome: `nomeEmpresa`
   - Tipo: `text`
   - Label: `Nome da Empresa`
   - Obrigatório: ✅ Sim
   - Valor Padrão: `Minha Empresa`
6. **Clique em:** "Ver Preview" para validar
7. **Clique em:** "Criar Template"

### 2. Criar uma Automação (Tenant)

1. **Acesse:** `http://localhost:3000/automacoes`
2. **Clique em:** "Criar Nova" ou vá para a aba "Criar Nova"
3. **Selecione:** O template criado anteriormente
4. **Clique em:** "Usar Template"
5. **Preencha:**
   - Nome da Automação: `Automação de Teste`
   - Nome da Empresa: `Empresa Teste`
6. **Clique em:** "Ver Preview" para revisar
7. **Clique em:** "Criar Automação"

### 3. Ativar/Desativar Automação

1. **Acesse:** `/automacoes`
2. **Na aba "Minhas Automações"**, encontre sua automação
3. **Clique em:**
   - 🟢 **"Ativar"** para ativar a automação
   - 🔴 **"Desativar"** para desativar a automação

---

## 🔧 Configuração Necessária

### Variáveis de Ambiente

Certifique-se de ter configurado no `.env`:

```env
# URL do Webhook Gestor do N8N
N8N_MANAGER_WEBHOOK_URL=https://seu-n8n.com/webhook/manager-crm
# ou para desenvolvimento local:
N8N_MANAGER_WEBHOOK_URL=http://localhost:5678/webhook/manager-crm
```

### Requisitos do N8N

1. O **Webhook Gestor** deve estar configurado no n8n
2. O webhook deve aceitar requisições POST com o formato:
   ```json
   {
     "action": "create|update|delete|activate|deactivate",
     "tenantId": "uuid-do-tenant",
     "templateName": "Nome do Template",
     "automationName": "Nome da Automação",
     "variables": {
       "variavel1": "valor1",
       "variavel2": "valor2"
     }
   }
   ```

---

## 📱 Acesso Mobile

No **mobile**, todas as funcionalidades estão disponíveis via:

1. **Bottom Navigation:** Ícone de "Bot" → `/automacoes`
2. **Menu Gestor:** Seção "Automações" → `/automacoes`
3. **Navegação Principal:** Link "Automações" → `/automacoes`

**Super Admin no mobile:**
- Acesse diretamente via URL: `/saas`
- Funcionalidades disponíveis no mobile também

---

## 🐛 Troubleshooting

### Erro: "N8N_MANAGER_WEBHOOK_URL não configurado"
**Solução:** Verifique se a variável `N8N_MANAGER_WEBHOOK_URL` está definida no `.env`

### Erro: "Campos obrigatórios faltando"
**Solução:** Preencha todos os campos marcados com `*` (asterisco) antes de salvar

### Erro: "JSON do workflow inválido"
**Solução:** 
1. Use o botão "Ver Preview" para validar o JSON
2. Certifique-se de que o JSON está bem formatado
3. Verifique se todas as chaves estão fechadas corretamente

### Erro: "Erro ao criar workflow no n8n"
**Solução:**
1. Verifique se o n8n está rodando
2. Verifique se o Webhook Gestor está configurado corretamente
3. Verifique os logs do backend para mais detalhes

### Não consigo acessar `/saas`
**Solução:** 
1. Certifique-se de estar logado com uma conta de **Super Admin**
2. Verifique se o `role` do usuário no banco é `SUPER_ADMIN`

---

## 📚 Documentação Relacionada

- [N8N Integration Guide](./N8N_INTEGRATION.md)
- [Webhook Manager Documentation](./N8N_WEBHOOK_MANAGER.md)
- [Audio Transcription Setup](./AUDIO_TRANSCRIPTION_SETUP.md)

---

## ✅ Checklist de Funcionalidades

### Super Admin (`/saas`)
- [x] Criar template com JSON do n8n
- [x] Editar template existente
- [x] Visualizar template (preview)
- [x] Remover template (soft delete)
- [x] Gerenciar variáveis editáveis
- [x] Validação de JSON em tempo real
- [x] Validação de variáveis
- [x] Preview do workflow antes de salvar

### Tenant (`/automacoes`)
- [x] Ver templates disponíveis
- [x] Ver automações criadas
- [x] Criar automação a partir de template
- [x] Configurar variáveis do template
- [x] Preview dos valores configurados
- [x] Ativar/Desativar automação
- [x] Remover automação
- [x] Validação de campos obrigatórios
- [ ] Editar configurações da automação (futuro)
- [ ] Ver logs de execução (futuro)
- [ ] Testar automação antes de ativar (futuro)

---

## 🎯 Próximos Passos

Após acessar e testar as funcionalidades básicas, você pode:

1. **Criar templates personalizados** para seus casos de uso
2. **Configurar variáveis editáveis** para permitir personalização
3. **Criar automações** a partir dos templates
4. **Ativar automações** quando estiverem prontas
5. **Monitorar execuções** (quando logs forem implementados)

---

**Dúvidas?** Consulte a documentação técnica ou entre em contato com o time de desenvolvimento.

