'use client'

import React, { useEffect, useState } from 'react'
import { Droppable, DroppableProps } from 'react-beautiful-dnd'
import LeadCard from './LeadCard'
import { Lead } from '@/types'

interface KanbanColumnProps {
  column: {
    id: string
    title: string
    description: string
    border: string
    indicator: string
  }
  leads: Lead[]
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

export default function KanbanColumn({ column, leads }: KanbanColumnProps) {
  return (
    <div
      className={`flex min-w-[280px] flex-col rounded-3xl border bg-background-muted/60 shadow-inner-glow ${column.border}`}
      style={{ height: 'calc(100vh - 320px)' }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${column.indicator}`} />
            <h2 className="text-sm font-semibold text-white">{column.title}</h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">{column.description}</p>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-text-muted">
          {leads.length} leads
        </span>
      </div>

      <StrictModeDroppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto px-4 py-5 transition ${
              snapshot.isDraggingOver ? 'bg-white/5' : 'bg-transparent'
            }`}
          >
            <div className="space-y-4">
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

