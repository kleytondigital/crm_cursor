'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import KanbanColumn from './KanbanColumn'
import { Lead } from '@/types'
import { leadsAPI } from '@/lib/api'
import { Loader2 } from 'lucide-react'

const COLUMNS = [
  {
    id: 'NOVO',
    title: 'Novos Leads',
    description: 'Aguardando primeiro contato',
    border: 'border-brand-secondary/40',
    indicator: 'bg-brand-secondary',
  },
  {
    id: 'EM_ATENDIMENTO',
    title: 'Em Atendimento',
    description: 'Conversas em andamento',
    border: 'border-brand-primary/40',
    indicator: 'bg-brand-primary',
  },
  {
    id: 'AGUARDANDO',
    title: 'Aguardando Retorno',
    description: 'Dependem do cliente',
    border: 'border-brand-warning/50',
    indicator: 'bg-brand-warning',
  },
  {
    id: 'CONCLUIDO',
    title: 'Concluídos',
    description: 'Oportunidades convertidas',
    border: 'border-brand-success/50',
    indicator: 'bg-brand-success',
  },
] as const

type LeadStatus = 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO'

export default function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 bg-background-subtle/60 shadow-inner-glow">
      {error && (
        <div className="border-b border-brand-warning/40 bg-brand-warning/10 px-6 py-3 text-sm text-brand-warning">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-x-auto px-6 py-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                leads={getLeadsByStatus(column.id as LeadStatus)}
              />
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}

