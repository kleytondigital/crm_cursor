# 🎨 Interface de Gerenciamento de Pipeline - Guia de Uso

## 📋 Visão Geral

A interface de gerenciamento de estágios do pipeline permite que **Admins** personalizem completamente o funil de vendas (Kanban) do CRM.

---

## 🚀 Como Acessar

1. Faça login como **ADMIN** ou **MANAGER**
2. Clique em **"Estágios"** na barra de navegação superior
3. Ou acesse diretamente: `https://crm.seudominio.com/pipeline`

---

## ✨ Funcionalidades

### 1. 📊 **Visualizar Estágios**

- Lista todos os estágios do pipeline
- Mostra cor, nome, status e tipo (Padrão/Custom)
- Indica estágios ativos/inativos

### 2. ➕ **Criar Novo Estágio**

**Passo a passo:**
1. Clique em **"Novo Estágio"**
2. Preencha:
   - **Nome**: Ex: "Qualificado", "Proposta Enviada"
   - **Status do Lead**: Selecione o status interno
   - **Cor**: Escolha uma cor ou digite o código hex
   - **Ativo**: Marque se o estágio estará ativo
3. Veja o preview do estágio
4. Clique em **"Criar"**

**Dicas:**
- Use cores que façam sentido para seu processo
- Nomes claros facilitam a organização
- Estágios inativos não aparecem no Kanban

### 3. ✏️ **Editar Estágio**

1. Clique no ícone de **edição** (✏️) no estágio
2. Altere nome, cor ou status
3. Clique em **"Atualizar"**

⚠️ **Limitação**: Estágios padrão (marcados) **não podem ser editados**

### 4. 🗑️ **Remover Estágio**

1. Clique no ícone de **lixeira** (🗑️) no estágio
2. Confirme a remoção

⚠️ **Limitação**: Estágios padrão **não podem ser removidos**

### 5. 🔄 **Reordenar Estágios (Drag-and-Drop)**

1. **Arraste** o ícone ⋮⋮ do estágio
2. **Solte** na nova posição
3. A ordem é salva automaticamente

✅ **Dica**: A ordem define como os leads aparecem no Kanban

---

## 🎨 Seletor de Cores

### Cores Pré-definidas

| Cor | Hex | Uso Sugerido |
|-----|-----|--------------|
| 🔵 Azul | `#3B82F6` | Novos, Iniciais |
| 🟠 Laranja | `#F59E0B` | Em Progresso |
| 🟣 Roxo | `#8B5CF6` | Aguardando |
| 🟢 Verde | `#10B981` | Sucesso, Concluído |
| 🔴 Vermelho | `#EF4444` | Perdido, Cancelado |
| 🟡 Amarelo | `#FBBF24` | Atenção |
| ⚫ Cinza | `#6B7280` | Padrão |
| 💗 Rosa | `#EC4899` | VIP, Premium |
| 🌊 Teal | `#14B8A6` | Follow-up |
| 🟧 Laranja Escuro | `#F97316` | Urgente |

### Cor Personalizada

- Clique no **seletor de cor** para escolher visualmente
- Ou digite diretamente o código **hex** (ex: `#FF5733`)

---

## 🎯 Exemplo de Uso: Pipeline de Vendas B2B

### Estágios Criados

```
1️⃣ Lead Novo          🔵 #60A5FA  (NOVO)
2️⃣ Qualificado        🟡 #FBBF24  (EM_ATENDIMENTO)
3️⃣ Proposta Enviada   🟣 #A78BFA  (AGUARDANDO)
4️⃣ Negociação         🟠 #FB923C  (EM_ATENDIMENTO)
5️⃣ Fechado - Ganho    🟢 #34D399  (CONCLUIDO)
6️⃣ Fechado - Perdido  🔴 #EF4444  (CONCLUIDO)
```

### Resultado no Kanban

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Lead Novo   │ → │ Qualificado │ → │ Proposta    │ → │ Negociação  │
│ 🔵 5 leads  │   │ 🟡 3 leads  │   │ 🟣 2 leads  │   │ 🟠 1 lead   │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
                                                              ↓
                                                        ┌─────────────┐
                                                        │ Fechado     │
                                                        │ 🟢 Ganho: 8 │
                                                        │ 🔴 Perdido: 2│
                                                        └─────────────┘
```

---

## 📱 Interface - Capturas de Tela

### Tela Principal

```
┌─────────────────────────────────────────────────────┐
│ Estágios do Pipeline                    [+ Novo]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⋮⋮  🔵  Novo               [NOVO]  [Padrão] ✏️ 🗑️  │
│  ⋮⋮  🟠  Em Atendimento     [EM_ATENDIMENTO]  ✏️ 🗑️ │
│  ⋮⋮  🟣  Aguardando         [AGUARDANDO]      ✏️ 🗑️ │
│  ⋮⋮  🟢  Concluído          [CONCLUIDO]       ✏️ 🗑️ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Modal de Criação

```
┌─────────────────────────────────────┐
│ Novo Estágio                    [X] │
├─────────────────────────────────────┤
│                                     │
│ Nome do Estágio *                   │
│ [Qualificado para Vendas_______]    │
│                                     │
│ Status do Lead *                    │
│ [EM_ATENDIMENTO ▼]                  │
│                                     │
│ Cor *                               │
│ [🎨] [#FBBF24_______________]       │
│ 🔵 🟠 🟣 🟢 🔴 🟡 ⚫ 💗 🌊 🟧         │
│                                     │
│ [✓] Estágio ativo                   │
│                                     │
│ Preview:                            │
│ ┌───────────────────────────────┐   │
│ │ Qualificado para Vendas 🟡    │   │
│ └───────────────────────────────┘   │
│                                     │
│ [Cancelar]  [Criar]                 │
└─────────────────────────────────────┘
```

---

## 🔐 Permissões

| Ação | USER | MANAGER | ADMIN |
|------|------|---------|-------|
| Visualizar estágios | ❌ | ✅ | ✅ |
| Criar estágio | ❌ | ❌ | ✅ |
| Editar estágio | ❌ | ❌ | ✅ |
| Remover estágio | ❌ | ❌ | ✅ |
| Reordenar | ❌ | ❌ | ✅ |

---

## ⚠️ Limitações

1. **Estágios Padrão**
   - Não podem ser editados
   - Não podem ser removidos
   - São globais (todos os tenants veem)

2. **Status do Lead**
   - Cada estágio está vinculado a um status
   - Status disponíveis:
     - `NOVO`
     - `EM_ATENDIMENTO`
     - `AGUARDANDO`
     - `CONCLUIDO`

3. **Duplicatas**
   - Não é possível ter dois estágios com mesmo nome e status

---

## 🐛 Troubleshooting

### Problema: Não consigo criar estágio

**Solução:**
1. Verifique se você é ADMIN
2. Confirme que nome + status são únicos
3. Verifique se a cor está em formato hex válido

### Problema: Não consigo editar estágio

**Solução:**
1. Verifique se não é um estágio padrão
2. Confirme que você é ADMIN

### Problema: Drag-and-drop não funciona

**Solução:**
1. Certifique-se de arrastar pelo ícone ⋮⋮
2. Atualize a página
3. Verifique se há erros no console (F12)

### Problema: Estágio não aparece no Kanban

**Solução:**
1. Verifique se o estágio está **ativo**
2. Confirme que há leads com aquele status
3. Atualize a página do Kanban

---

## 🚀 Boas Práticas

### 1. Nomeação Clara
✅ **Bom**: "Proposta Enviada", "Aguardando Assinatura"  
❌ **Ruim**: "Etapa 3", "Status A"

### 2. Cores Consistentes
- Use paleta de cores coerente
- Cores quentes (vermelho, laranja) para urgência
- Cores frias (azul, verde) para progresso/sucesso

### 3. Quantidade Ideal
- **4-8 estágios**: Ideal para maioria dos processos
- Menos de 4: Muito simplificado
- Mais de 10: Pode confundir

### 4. Ordenação Lógica
- Ordene do início ao fim do processo
- Estágios finais (concluído/perdido) no fim

---

## 📊 Métricas e Análise

Com estágios personalizados, você pode:
- ✅ Identificar gargalos no funil
- ✅ Medir tempo em cada estágio
- ✅ Calcular taxa de conversão por etapa
- ✅ Otimizar processo de vendas

---

## 🔗 Links Relacionados

- [Documentação Completa do Pipeline](./PIPELINE_STAGES.md)
- [API Keys de Super Admin](./SUPER_ADMIN_API_KEYS.md)
- [Integração com N8N](./N8N_INTEGRATION.md)

---

**Documentação criada em:** 19/11/2025  
**Versão:** 1.0.0

