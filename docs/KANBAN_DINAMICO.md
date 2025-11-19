# Kanban Dinâmico com Estágios Personalizados

Este documento descreve como o Kanban foi implementado para funcionar dinamicamente com os estágios configurados no banco de dados.

## Visão Geral

O Kanban agora exibe **estágios personalizados** cadastrados no sistema, ao invés de estágios fixos no código. Isso permite que cada tenant personalize seus próprios estágios do pipeline.

## Principais Funcionalidades

### 1. Estágios Dinâmicos

- **Fonte de Dados**: Os estágios são carregados da API (`/pipeline-stages`)
- **Filtros**:
  - Apenas estágios **ativos** (`isActive=true`) são exibidos
  - Ordenados pela propriedade `order`
  - Estágios globais (padrão) e estágios do tenant são mesclados

### 2. Edição Inline

- **Ícone de Editar**: Aparece no título de cada coluna do Kanban
- **Permissão**: Apenas para usuários com role `ADMIN` ou `MANAGER`
- **Ação**: Clique abre o modal `PipelineStageModal` para editar o estágio
- **Atualização**: Após salvar, o Kanban é atualizado automaticamente

### 3. Cores Personalizadas

- Cada estágio usa a cor configurada (`stage.color`)
- A cor é aplicada:
  - **Border**: Borda da coluna (com 40% de opacidade)
  - **Indicator**: Bolinha de status no título

### 4. Responsividade

- Se nenhum estágio estiver configurado, exibe mensagem informativa
- Sugere que admins acessem "Gerenciar Estágios" para criar

## Arquitetura

### Componentes Envolvidos

#### `KanbanBoard.tsx`

**Responsabilidades**:
- Carregar estágios do banco (`pipelineStagesAPI.getAll()`)
- Filtrar e ordenar estágios ativos
- Renderizar colunas dinamicamente baseado nos estágios
- Passar callback `onEditStage` para abrir modal de edição

**Estado**:
```typescript
const [stages, setStages] = useState<PipelineStage[]>([])
```

**Principais Funções**:
```typescript
const loadStages = async () => {
  const data = await pipelineStagesAPI.getAll()
  const activeStages = data
    .filter((stage) => stage.isActive)
    .sort((a, b) => a.order - b.order)
  setStages(activeStages)
}
```

#### `KanbanColumn.tsx`

**Responsabilidades**:
- Receber `stage: PipelineStage` ao invés de objeto fixo
- Exibir nome, cor e indicador do estágio
- Renderizar botão de editar (se `onEdit` for fornecido)
- Aplicar cores personalizadas via `style` inline

**Props**:
```typescript
interface KanbanColumnProps {
  stage: PipelineStage
  leads: Lead[]
  onEdit?: () => void
}
```

**Estilo Dinâmico**:
```typescript
const borderStyle = { borderColor: `${stage.color}40` }
const indicatorStyle = { backgroundColor: stage.color }
```

#### `KanbanPage.tsx`

**Responsabilidades**:
- Integrar `KanbanBoard` com modal de edição
- Gerenciar estado do modal (`showStageModal`, `selectedStage`)
- Fornecer callback `onEditStage` para abrir modal ao clicar no ícone

**Callback de Edição**:
```typescript
<KanbanBoard 
  key={refreshKey}
  onEditStage={(stage) => {
    setSelectedStage(stage)
    setShowStageModal(true)
  }}
/>
```

## Fluxo de Uso

### Cenário 1: Visualizar Kanban

1. Usuário acessa `/kanban`
2. `KanbanBoard` carrega estágios e leads
3. Estágios ativos são exibidos como colunas
4. Cores personalizadas são aplicadas

### Cenário 2: Editar Estágio (Admin)

1. Admin visualiza ícone de editar (lápis) nos títulos
2. Clica no ícone de um estágio
3. Modal `PipelineStageModal` abre com dados do estágio
4. Admin edita nome, cor, status, etc.
5. Salva alterações
6. Kanban atualiza automaticamente (`refreshKey++`)

### Cenário 3: Gerenciar Estágios Completo

1. Admin clica em "Gerenciar Estágios" no header do Kanban
2. É redirecionado para `/pipeline`
3. Cria, edita, remove ou reordena estágios
4. Volta para o Kanban
5. Estágios atualizados são exibidos

## Considerações Técnicas

### Permissões

- **Visualizar Kanban**: Todos os usuários autenticados
- **Editar Estágios**: Apenas `ADMIN` e `MANAGER`
- **Gerenciar Estágios**: Apenas `ADMIN`

### Sincronização

- **Modal de Edição**: Usa `refreshKey++` após salvar para forçar recarregar
- **Tempo Real**: Não há sincronização via WebSocket (refresh manual necessário)

### Drag & Drop

- `react-beautiful-dnd` usa `droppableId={stage.status}` para identificar colunas
- Status do lead é atualizado ao arrastar entre colunas (`leadsAPI.updateStatus`)

## Melhorias Futuras

1. **Tooltip**: Exibir descrição ou informações adicionais ao passar o mouse
2. **Estatísticas**: Mostrar métricas por estágio (conversão, tempo médio, etc.)
3. **Filtros Avançados**: Filtrar leads por tags, datas, etc.
4. **Sincronização Real Time**: Atualizar Kanban automaticamente via WebSocket
5. **Ações Rápidas**: Adicionar/remover estágios diretamente no Kanban
6. **Histórico**: Rastrear mudanças de estágios dos leads

## Troubleshooting

### Estágios não aparecem

- Verifique se há estágios **ativos** (`isActive=true`) no banco
- Verifique permissões da API `/pipeline-stages`
- Verifique console do navegador para erros

### Cores não aplicadas

- Certifique-se de que `stage.color` é um hex válido (ex: `#3B82F6`)
- Verifique se o estilo inline está sendo aplicado no DevTools

### Ícone de editar não aparece

- Verifique se o usuário é `ADMIN` ou `MANAGER`
- Certifique-se de que `onEditStage` está sendo passado para `KanbanBoard`

### Kanban não atualiza após editar

- Verifique se `refreshKey` está incrementando após salvar
- Verifique se `loadStages()` está sendo chamado no `useEffect`

## Referências

- [PipelineStage Model](../prisma/schema.prisma)
- [Pipeline Stages API](./PIPELINE_STAGES.md)
- [Frontend Pipeline Usage](./FRONTEND_PIPELINE_USAGE.md)

