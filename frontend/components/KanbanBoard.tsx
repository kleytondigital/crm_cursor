'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import KanbanColumn from './KanbanColumn'
import { Lead, CustomLeadStatus } from '@/types'
import { leadsAPI } from '@/lib/api'
import { PipelineStage, pipelineStagesAPI } from '@/lib/api/pipeline-stages'
import { leadStatusAPI } from '@/lib/api/lead-status'
import { Loader2 } from 'lucide-react'

type LeadStatus = 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO'

interface KanbanBoardProps {
  onEditStage?: (stage: PipelineStage) => void
}

export default function KanbanBoard({ onEditStage }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [customStatuses, setCustomStatuses] = useState<CustomLeadStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

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

  const loadCustomStatuses = async () => {
    try {
      const data = await leadStatusAPI.getAll()
      // Filtrar apenas status ativos e ordenar
      const activeStatuses = data
        .filter((status) => status.isActive)
        .sort((a, b) => a.order - b.order)
      setCustomStatuses(activeStatuses)
    } catch (err: any) {
      console.error('Erro ao carregar status customizados:', err)
      // Não falhar se não houver status customizados
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

    // Carregar estágios, status customizados e leads
    loadStages()
    loadCustomStatuses()
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
    const destinationId = destination.droppableId

    // Verificar se é um status customizado (começa com "status-") ou um estágio (enum)
    const isCustomStatus = destinationId.startsWith('status-')
    const statusId = isCustomStatus ? destinationId.replace('status-', '') : null
    const newStatus = isCustomStatus ? null : (destinationId as LeadStatus)

    // Encontrar o lead atual
    const currentLead = leads.find((l) => l.id === leadId)
    if (!currentLead) return

    // Otimistic update
    const updatedLeads = leads.map((lead) => {
      if (lead.id === leadId) {
        if (isCustomStatus) {
          // Atualizar para status customizado
          const customStatus = customStatuses.find((s) => s.id === statusId)
          return {
            ...lead,
            statusId: statusId || null,
            customStatus: customStatus || null,
          }
        } else {
          // Atualizar para enum (compatibilidade)
          return { ...lead, status: newStatus as LeadStatus, statusId: null, customStatus: null }
        }
      }
      return lead
    })
    setLeads(updatedLeads)

    try {
      // Atualizar no backend
      if (isCustomStatus) {
        await leadsAPI.updateStatusId(leadId, statusId)
      } else {
        await leadsAPI.updateStatus(leadId, newStatus as string)
      }
    } catch (err: any) {
      // Reverter em caso de erro
      setLeads(leads)
      setError(err.response?.data?.message || 'Erro ao atualizar status do lead')
    }
  }

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead) => lead.status === status)
  }

  const getLeadsByStatusId = (statusId: string) => {
    return leads.filter((lead) => lead.statusId === statusId)
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
        <DragDropContext onDragEnd={onDragEnd}>
          <div 
            className="flex h-full gap-2 md:gap-3 lg:gap-4 xl:gap-6 overflow-x-auto overflow-y-hidden" 
            style={{ 
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch',
              scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
            }}
          >
            {/* Renderizar estágios do pipeline (compatibilidade) */}
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={getLeadsByStatus(stage.status)}
                onEdit={isAdmin && onEditStage ? () => onEditStage(stage) : undefined}
                droppableId={stage.status}
              />
            ))}
            {/* Renderizar status customizados */}
            {customStatuses.map((customStatus) => (
              <KanbanColumn
                key={`status-${customStatus.id}`}
                stage={{
                  id: `status-${customStatus.id}`,
                  name: customStatus.name,
                  status: 'NOVO' as LeadStatus, // Placeholder, não usado
                  color: customStatus.color,
                  order: customStatus.order,
                  isDefault: false,
                  isActive: customStatus.isActive,
                  tenantId: customStatus.tenantId,
                  createdAt: customStatus.createdAt,
                  updatedAt: customStatus.updatedAt,
                }}
                leads={getLeadsByStatusId(customStatus.id)}
                onEdit={undefined} // Status customizados são editados no Gestor
                droppableId={`status-${customStatus.id}`}
              />
            ))}
          </div>
        </DragDropContext>
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

