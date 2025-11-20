'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import KanbanColumn from './KanbanColumn'
import { Lead } from '@/types'
import { leadsAPI } from '@/lib/api'
import { PipelineStage, pipelineStagesAPI } from '@/lib/api/pipeline-stages'
import { Loader2 } from 'lucide-react'

type LeadStatus = 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO'

interface KanbanBoardProps {
  onEditStage?: (stage: PipelineStage) => void
}

export default function KanbanBoard({ onEditStage }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
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
    const newStatus = destination.droppableId as LeadStatus
    const oldStatus = source.droppableId as LeadStatus

    // Otimistic update
    const updatedLeads = leads.map((lead) =>
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    )
    setLeads(updatedLeads)

    try {
      // Atualizar no backend
      await leadsAPI.updateStatus(leadId, newStatus)
    } catch (err: any) {
      // Reverter em caso de erro
      setLeads(leads)
      setError(err.response?.data?.message || 'Erro ao atualizar status do lead')
    }
  }

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead) => lead.status === status)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-white/5 bg-background-subtle/60 shadow-inner-glow">
        <Loader2 className="h-8 w-8 animate-spin text-brand-secondary" />
      </div>
    )
  }

  if (error && !leads.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-brand-danger/30 bg-brand-danger/10 px-6 py-10 text-brand-danger shadow-inner-glow">
        {error}
      </div>
    )
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER'

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 bg-background-subtle/60 shadow-inner-glow">
      {error && (
        <div className="border-b border-brand-warning/40 bg-brand-warning/10 px-6 py-3 text-sm text-brand-warning">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-x-auto px-3 py-4 sm:px-6 sm:py-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 lg:gap-6 min-w-max">
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={getLeadsByStatus(stage.status)}
                onEdit={isAdmin && onEditStage ? () => onEditStage(stage) : undefined}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {stages.length === 0 && !loading && (
        <div className="flex items-center justify-center py-12 px-6">
          <div className="text-center text-text-muted">
            <p>Nenhum estágio configurado.</p>
            {isAdmin && (
              <p className="mt-2 text-sm">Clique em "Gerenciar Estágios" para criar.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

