'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent as DndKitDragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import KanbanColumn from './KanbanColumn'
import { Lead } from '@/types'
import { leadsAPI } from '@/lib/api'
import { PipelineStage, pipelineStagesAPI } from '@/lib/api/pipeline-stages'
import { Loader2 } from 'lucide-react'

interface KanbanBoardProps {
  onEditStage?: (stage: PipelineStage) => void
}

export default function KanbanBoard({ onEditStage }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  // Sensors para @dnd-kit (arrastar colunas)
  // Só ativar quando o drag começar em um elemento com data-dnd-handle
  const columnSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requer 8px de movimento antes de ativar
        delay: 100, // Pequeno delay para diferenciar de cliques
      },
    }),
    useSensor(KeyboardSensor)
  )

  const loadStages = async () => {
    try {
      const data = await pipelineStagesAPI.getAll()
      // Filtrar apenas estágios ativos e ordenar
      const activeStages = data
        .filter((stage) => stage.isActive)
        .sort((a, b) => a.order - b.order)
      setStages(activeStages)
    } catch (err: any) {
      console.error('Erro ao carregar estágios:', err)
      setError('Erro ao carregar estágios do pipeline')
    }
  }

  const loadLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await leadsAPI.getAll()
      setLeads(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Obter role do usuário
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          setUserRole(user.role)
        }
      } catch (error) {
        console.error('Erro ao obter role do usuário:', error)
      }
    }

    // Carregar estágios e leads
    loadStages()
    loadLeads()
  }, [])

  // Recarregar leads quando um atendimento for assumido
  useEffect(() => {
    const handleKanbanReload = () => {
      console.log('[KanbanBoard] Recarregando leads após assumir atendimento...')
      loadLeads()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('kanban:reload', handleKanbanReload)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('kanban:reload', handleKanbanReload)
      }
    }
  }, [loadLeads])

  // Handler para arrastar colunas (estágios)
  const handleColumnDragEnd = async (event: DndKitDragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveColumnId(null)
      return
    }

    const oldIndex = stages.findIndex((s) => s.id === active.id)
    const newIndex = stages.findIndex((s) => s.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      setActiveColumnId(null)
      return
    }

    const sourceStage = stages[oldIndex]
    const destinationStage = stages[newIndex]

    // Bloquear arrastar estágio 0 (isDefault ou order === 0)
    if (sourceStage.isDefault || sourceStage.order === 0) {
      setError('Não é possível mover o estágio inicial')
      setTimeout(() => setError(null), 3000)
      setActiveColumnId(null)
      return
    }

    // Bloquear arrastar para a posição do estágio 0
    if (destinationStage.isDefault || destinationStage.order === 0) {
      setError('Não é possível mover estágios para antes do estágio inicial')
      setTimeout(() => setError(null), 3000)
      setActiveColumnId(null)
      return
    }

    const newStages = arrayMove(stages, oldIndex, newIndex)

    // Garantir que o estágio 0 sempre fique na primeira posição
    const defaultStage = newStages.find((s) => s.isDefault || s.order === 0)
    if (defaultStage) {
      const defaultIndex = newStages.indexOf(defaultStage)
      if (defaultIndex !== 0) {
        newStages.splice(defaultIndex, 1)
        newStages.unshift(defaultStage)
      }
    }

    // Atualizar ordem localmente (otimista)
    setStages(newStages)

    try {
      // Enviar nova ordem para o backend
      const reorderData = newStages.map((stage, index) => ({
        id: stage.id,
        order: stage.isDefault || stage.order === 0 ? 0 : index,
      }))
      await pipelineStagesAPI.reorder(reorderData)
      setError(null)
    } catch (err: any) {
      // Reverter em caso de erro
      setStages(stages)
      setError(err.response?.data?.message || 'Erro ao reordenar estágios')
      setTimeout(() => setError(null), 3000)
    } finally {
      setActiveColumnId(null)
    }
  }

  const handleColumnDragStart = (event: DragStartEvent) => {
    setActiveColumnId(event.active.id as string)
  }

  // Handler para arrastar cards (leads) - mantém lógica existente
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Se não há destino, não faz nada
    if (!destination) {
      return
    }

    // Se soltou na mesma posição, não faz nada
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const leadId = draggableId
    const destinationStageId = destination.droppableId
    const sourceStageId = source.droppableId

    // Encontrar os estágios de origem e destino
    const sourceStage = stages.find((s) => s.id === sourceStageId)
    const destinationStage = stages.find((s) => s.id === destinationStageId)
    
    if (!destinationStage || !sourceStage) return

    // Bloquear arrastar leads do estágio 0 (isDefault ou order === 0)
    if (sourceStage.isDefault || sourceStage.order === 0) {
      setError('Não é possível mover leads do estágio inicial')
      setTimeout(() => setError(null), 3000) // Remover erro após 3 segundos
      return
    }

    // Bloquear arrastar leads para o estágio 0 (isDefault ou order === 0)
    if (destinationStage.isDefault || destinationStage.order === 0) {
      setError('Não é possível mover leads para o estágio inicial')
      setTimeout(() => setError(null), 3000) // Remover erro após 3 segundos
      return
    }

    // Limpar erro se chegou até aqui
    setError(null)

    // Encontrar o lead atual
    const currentLead = leads.find((l) => l.id === leadId)
    if (!currentLead) return

    // Otimistic update - atualizar para usar statusId do estágio
    const updatedLeads = leads.map((lead) => {
      if (lead.id === leadId) {
        return {
          ...lead,
          statusId: destinationStage.statusId,
          customStatus: destinationStage.customStatus || null,
        } as Lead
      }
      return lead
    })
    setLeads(updatedLeads)

    try {
      // Atualizar no backend usando statusId
      await leadsAPI.updateStatusId(leadId, destinationStage.statusId)
    } catch (err: any) {
      // Reverter em caso de erro
      setLeads(leads)
      setError(err.response?.data?.message || 'Erro ao atualizar status do lead')
    }
  }

  const getLeadsByStage = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId)
    if (!stage) return []
    // Filtrar leads pelo statusId do estágio
    return leads.filter((lead) => lead.statusId === stage.statusId)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl md:rounded-3xl border border-white/5 shadow-inner-glow">
        <Loader2 className="h-8 w-8 animate-spin text-brand-secondary" />
      </div>
    )
  }

  if (error && !leads.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl md:rounded-3xl border border-brand-danger/30 bg-brand-danger/10 px-4 md:px-6 py-8 md:py-10 text-brand-danger shadow-inner-glow">
        <p className="text-sm md:text-base">{error}</p>
      </div>
    )
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER'

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl md:rounded-2xl lg:rounded-3xl border border-white/5 shadow-inner-glow bg-transparent">
      {error && (
        <div className="flex-shrink-0 border-b border-brand-warning/40 bg-brand-warning/10 px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm text-brand-warning">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden px-2 md:px-3 lg:px-4 xl:px-6 py-2 md:py-3 lg:py-4 xl:py-6 min-h-0">
        {/* Contexto @dnd-kit para arrastar colunas */}
        <DndContext
          sensors={columnSensors}
          collisionDetection={closestCenter}
          onDragStart={handleColumnDragStart}
          onDragEnd={handleColumnDragEnd}
          // Prevenir que o drag de coluna interfira com o drag de cards
          modifiers={[]}
        >
          <SortableContext
            items={stages.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            {/* Contexto react-beautiful-dnd para arrastar cards dentro das colunas */}
            <DragDropContext onDragEnd={onDragEnd}>
              <div 
                className="flex h-full gap-2 md:gap-3 overflow-x-auto overflow-y-hidden" 
                style={{ 
                  scrollbarWidth: 'thin',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
                }}
              >
                {/* Renderizar apenas estágios do pipeline (que referenciam status customizados) */}
                {stages.map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    leads={getLeadsByStage(stage.id)}
                    onEdit={isAdmin && onEditStage ? () => onEditStage(stage) : undefined}
                    droppableId={stage.id}
                    isDragging={activeColumnId === stage.id}
                    isDefault={stage.isDefault || stage.order === 0}
                  />
                ))}
              </div>
            </DragDropContext>
          </SortableContext>
        </DndContext>
      </div>

      {stages.length === 0 && !loading && (
        <div className="flex items-center justify-center py-12 px-6">
          <div className="text-center text-text-muted">
            <p className="text-sm md:text-base">Nenhum estágio configurado.</p>
            {isAdmin && (
              <p className="mt-2 text-xs md:text-sm">Clique em "Gerenciar Estágios" para criar.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

