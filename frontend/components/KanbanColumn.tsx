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

export default function KanbanColumn({ stage, leads, onEdit }: KanbanColumnProps) {
  // Converter cor hex para classes Tailwind border e background
  const borderStyle = { borderColor: `${stage.color}40` }
  const indicatorStyle = { backgroundColor: stage.color }

  return (
    <div
      className="flex min-w-[260px] sm:min-w-[280px] lg:min-w-[320px] lg:w-[340px] flex-col rounded-3xl border-2 bg-background-muted/60 shadow-inner-glow"
      style={borderStyle}
    >
      <div className="flex items-start justify-between gap-2 border-b border-white/5 px-4 py-3 md:px-5 md:py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span 
              className="h-2 w-2 rounded-full flex-shrink-0" 
              style={indicatorStyle}
            />
            <h2 className="text-sm font-semibold text-white truncate">{stage.name}</h2>
            {onEdit && (
              <button
                onClick={onEdit}
                className="text-text-muted hover:text-brand-secondary transition flex-shrink-0 p-1 rounded hover:bg-white/5"
                title="Editar estágio"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {stage.status && (
            <p className="mt-1 text-xs text-text-muted truncate">
              {stage.status.replace('_', ' ')}
            </p>
          )}
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-text-muted flex-shrink-0">
          {leads.length}
        </span>
      </div>

      <StrictModeDroppable droppableId={stage.status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-visible px-3 py-4 md:px-4 md:py-5 transition ${
              snapshot.isDraggingOver ? 'bg-white/5' : 'bg-transparent'
            } lg:max-h-[calc(100vh-420px)] lg:overflow-y-auto`}
          >
            <div className="space-y-3 md:space-y-4">
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

