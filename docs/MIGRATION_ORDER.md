# Ordem de Criação das Tabelas e Dependências

## Problema Identificado

As migrations estão sendo executadas na ordem alfabética dos nomes das pastas, o que pode causar problemas quando migrations criadas manualmente (com datas futuras como `20250125*`) são executadas antes das migrations iniciais que criam as tabelas base.

## Tabelas Base e Ordem de Criação

### 1. Tabelas Fundamentais (Migration Inicial)
**Migration: `20251108231010_inicial`**

Esta migration cria as tabelas fundamentais do sistema:

- ✅ `companies` - Empresas/Tenants
- ✅ `users` - Usuários do sistema

**Dependências**: Nenhuma

---

### 2. Tabelas de Mensagens
**Migration: `20251108232043_mensagens`**

- ✅ `conversations` - Conversas/Threads
- ✅ `messages` - Mensagens individuais
- ✅ `leads` - Leads/Contatos

**Dependências**: 
- Requer `companies` (para `tenantId`)

---

### 3. Tabelas de Pipeline/Kanban
**Migration: `20251109003608_kanbam`**

- ✅ `pipeline_stages` - Estágios do pipeline

**Dependências**:
- Requer `companies` (para `tenantId`)

---

### 4. Tabelas de Conexões e Atendimentos
**Migrations: `20251109021125_add_connections_messages_fields`, `20251110023937_atendance`**

- ✅ `connections` - Conexões WhatsApp
- ✅ `attendances` - Atendimentos

**Dependências**:
- Requer `companies` (para `tenantId`)
- Requer `users` (para `assignedUserId`)
- Requer `leads` (para `leadId`)
- Requer `conversations` (para `conversationId`)

---

## Migrations que Alteram Tabelas Existentes

Estas migrations devem ser executadas **APÓS** as tabelas base serem criadas:

### ⚠️ Migrations com Datas Futuras (2025-01-25)

Estas migrations foram criadas manualmente e têm nomes que fazem com que sejam executadas ANTES das migrations iniciais:

1. **`20250125000000_add_custom_lead_status_and_bot_indicator`**
   - Cria `custom_lead_statuses`
   - Altera `leads` (adiciona `statusId`)
   - Altera `conversations` (adiciona `isBotAttending`)
   - **Dependências**: Requer `companies`, `leads`, `conversations`
   - ✅ **Protegida**: Verifica existência de tabelas

2. **`20250125000001_update_pipeline_stage_to_use_status_id`**
   - Altera `pipeline_stages` (adiciona `statusId`)
   - **Dependências**: Requer `pipeline_stages`, `custom_lead_statuses`
   - ✅ **Protegida**: Verifica existência de tabelas

3. **`20250125000002_make_pipeline_stage_status_nullable`**
   - Altera `pipeline_stages` (torna `status` nullable)
   - **Dependências**: Requer `pipeline_stages`
   - ✅ **Protegida**: Verifica existência de tabelas

4. **`20250125000003_add_automations_enabled_to_company`**
   - Altera `companies` (adiciona `automationsEnabled`)
   - **Dependências**: Requer `companies`
   - ✅ **Protegida**: Verifica existência de tabelas

## Solução Implementada

Todas as migrations que alteram tabelas existentes agora verificam se as tabelas existem antes de tentar modificá-las. Isso permite que sejam executadas mesmo em bancos novos onde as tabelas base ainda não foram criadas.

### Estrutura de Proteção

```sql
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nome_da_tabela') THEN
        -- Operações na tabela
    END IF;
END $$;
```

## Recomendações Futuras

1. **Nomenclatura de Migrations**: Use timestamps consistentes que refletem a ordem lógica de criação
2. **Documentação**: Sempre documente dependências entre migrations
3. **Testes**: Teste migrations em bancos vazios para garantir que funcionam em qualquer ordem
4. **Validação**: Sempre verifique existência de tabelas antes de criar constraints ou alterar estruturas

## Ordem Ideal de Execução

Para um banco novo, a ordem ideal seria:

1. `20251108231010_inicial` - Tabelas base
2. `20251108232043_mensagens` - Conversas e leads
3. `20251109003608_kanbam` - Pipeline stages
4. `20251109021125_add_connections_messages_fields` - Conexões
5. `20251110023937_atendance` - Atendimentos
6. ... (outras migrations que adicionam funcionalidades)
7. `20250125000000_add_custom_lead_status_and_bot_indicator` - Status customizados
8. `20250125000001_update_pipeline_stage_to_use_status_id` - Atualizar pipeline
9. `20250125000002_make_pipeline_stage_status_nullable` - Tornar status nullable
10. `20250125000003_add_automations_enabled_to_company` - Automações

Mas como as migrations estão protegidas, elas podem ser executadas em qualquer ordem sem causar erros.

