'use client'

import React, { useEffect, useState } from 'react'
import { Droppable, DroppableProps } from 'react-beautiful-dnd'
import { Edit2 } from 'lucide-react'
import LeadCard from './LeadCard'
import { Lead } from '@/types'
import { PipelineStage } from '@/lib/api/pipeline-stages'

interface KanbanColumnProps {
  stage: PipelineStage
  leads: Lead[]
  onEdit?: () => void
  droppableId?: string // ID customizado para o droppable (para status customizados)
}

// Wrapper para Droppable que funciona com React StrictMode
// O warning sobre defaultProps é conhecido do react-beautiful-dnd e pode ser ignorado
// ou aguardar atualização da biblioteca
const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))

    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  if (!enabled) {
    return null
  }

  return <Droppable {...props}>{children}</Droppable>
}

export default function KanbanColumn({ stage, leads, onEdit, droppableId }: KanbanColumnProps) {
  // Converter cor hex para classes Tailwind border e background
  const borderStyle = { borderColor: `${stage.color}40` }
  const indicatorStyle = { backgroundColor: stage.color }

  return (
    <div
      className="flex min-w-[240px] sm:min-w-[260px] md:min-w-[280px] lg:min-w-[320px] lg:w-[340px] h-full flex-col rounded-2xl md:rounded-3xl border-2 shadow-inner-glow flex-shrink-0"
      style={borderStyle}
    >
      <div className="flex-shrink-0 flex items-start justify-between gap-2 border-b border-white/5 px-3 py-2 md:px-4 md:py-3 lg:px-5 lg:py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 md:gap-2">
            <span 
              className="h-2 w-2 rounded-full flex-shrink-0" 
              style={indicatorStyle}
            />
            <h2 className="text-xs md:text-sm font-semibold text-white truncate">{stage.name}</h2>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-text-muted hover:text-brand-secondary transition flex-shrink-0 p-1 rounded hover:bg-white/5"
                title="Editar estágio"
              >
                <Edit2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
              </button>
            )}
          </div>
          {stage.customStatus && (
            <p className="mt-0.5 md:mt-1 text-[10px] md:text-xs text-text-muted truncate" title={stage.customStatus.description}>
              {stage.customStatus.name}
            </p>
          )}
        </div>
        <span className="rounded-full bg-white/5 px-2 py-0.5 md:px-2.5 md:py-1 text-[10px] md:text-xs font-semibold text-text-muted flex-shrink-0">
          {leads.length}
        </span>
      </div>

      <StrictModeDroppable droppableId={droppableId || stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 md:px-3 md:py-3 lg:px-4 lg:py-4 transition min-h-0 ${
              snapshot.isDraggingOver ? 'bg-white/5' : 'bg-transparent'
            }`}
            style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
          >
            <div className="space-y-2 md:space-y-3 lg:space-y-4">
              {leads.map((lead, index) => (
                <LeadCard key={lead.id} lead={lead} index={index} />
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </StrictModeDroppable>
    </div>
  )
}

