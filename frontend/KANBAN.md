# Kanban de Leads - Documentação

## Visão Geral

O Kanban de Leads permite visualizar e gerenciar leads através de um sistema de arrastar e soltar (drag and drop). Cada lead pode ser movido entre diferentes colunas de status.

## Status Disponíveis

1. **NOVO** - Leads recém-criados
2. **EM_ATENDIMENTO** - Leads que estão sendo atendidos
3. **AGUARDANDO** - Leads aguardando resposta
4. **CONCLUIDO** - Leads finalizados

## Funcionalidades

### Drag and Drop
- Arraste um card de lead de uma coluna para outra
- O status é automaticamente atualizado no backend
- Atualização otimista (UI atualiza antes da confirmação do servidor)
- Reversão automática em caso de erro

### Visualização
- Cards exibem informações do lead (nome, telefone, tags, data)
- Contador de leads por coluna
- Layout responsivo (mobile, tablet, desktop)
- Scroll vertical nas colunas quando necessário
- Scroll horizontal quando necessário em telas menores

## Estrutura

### Componentes

- **KanbanBoard** - Componente principal que gerencia o estado
- **KanbanColumn** - Coluna individual do Kanban
- **LeadCard** - Card individual de lead
- **Navigation** - Navegação entre páginas

### API

- `GET /leads` - Lista todos os leads
- `GET /leads?status=NOVO` - Filtra leads por status
- `PATCH /leads/:id` - Atualiza lead (incluindo status)

## Uso

1. Acesse a página `/kanban`
2. Visualize os leads organizados por status
3. Arraste um card para outra coluna para alterar o status
4. O status é atualizado automaticamente

## Responsividade

- **Mobile**: 1 coluna, scroll horizontal
- **Tablet**: 2 colunas
- **Desktop**: 4 colunas lado a lado

## Estilização

- Cores diferenciadas por status
- Animações suaves durante o drag
- Feedback visual ao arrastar sobre uma coluna
- Cards com sombra e hover effects

