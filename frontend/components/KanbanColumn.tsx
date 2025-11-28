'use client'

import React, { useEffect, useState } from 'react'
import { Droppable, DroppableProps } from 'react-beautiful-dnd'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Edit2, GripVertical } from 'lucide-react'
import LeadCard from './LeadCard'
import { Lead } from '@/types'
import { PipelineStage } from '@/lib/api/pipeline-stages'

interface KanbanColumnProps {
  stage: PipelineStage
  leads: Lead[]
  onEdit?: () => void
  droppableId?: string // ID customizado para o droppable (para status customizados)
  isDragging?: boolean
  isDefault?: boolean
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

export default function KanbanColumn({ stage, leads, onEdit, droppableId, isDragging = false, isDefault = false }: KanbanColumnProps) {
  // Converter cor hex para classes Tailwind border e background
  const borderStyle = { borderColor: `${stage.color}40` }
  const indicatorStyle = { backgroundColor: stage.color }

  // Configurar sortable para arrastar a coluna (exceto se for estágio padrão)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: stage.id,
    disabled: isDefault, // Desabilitar drag para estágio padrão
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isColumnDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...borderStyle, ...style }}
      className={`flex min-w-[200px] sm:min-w-[220px] md:min-w-[240px] w-[240px] h-full flex-col rounded-xl border-2 shadow-inner-glow flex-shrink-0 ${
        isColumnDragging ? 'z-50' : ''
      }`}
    >
      <div className="flex-shrink-0 flex items-start justify-between gap-2 border-b border-white/5 px-3 py-2 md:px-4 md:py-3 lg:px-5 lg:py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Handle de arrastar coluna - apenas no header */}
            {!isDefault && (
              <div
                {...attributes}
                {...listeners}
                className="text-text-muted hover:text-white transition flex-shrink-0 p-0.5 rounded cursor-grab active:cursor-grabbing touch-none select-none"
                title="Arrastar para reordenar estágio"
                data-dnd-handle="true"
                onMouseDown={(e) => {
                  e.stopPropagation()
                  // Prevenir que o evento seja capturado pelo react-beautiful-dnd
                  e.preventDefault()
                }}
                onTouchStart={(e) => {
                  e.stopPropagation()
                }}
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
            )}
            {isDefault && (
              <div className="text-text-muted/50 flex-shrink-0 p-0.5 cursor-not-allowed" title="Estágio inicial não pode ser movido">
                <GripVertical className="h-3.5 w-3.5" />
              </div>
            )}
            <span 
              className="h-2 w-2 rounded-full flex-shrink-0" 
              style={indicatorStyle}
            />
            <h2 className="text-xs md:text-sm font-semibold text-white truncate flex-1 min-w-0" title={stage.name}>{stage.name}</h2>
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
            className={`flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 transition min-h-0 ${
              snapshot.isDraggingOver ? 'bg-white/5' : 'bg-transparent'
            }`}
            style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
            // Prevenir que o drag da coluna seja ativado quando arrastar cards
            onMouseDown={(e) => {
              // Se clicar na área de cards, não ativar drag da coluna
              if (e.target !== e.currentTarget) {
                e.stopPropagation()
              }
            }}
          >
            <div className="space-y-2">
              {leads.map((lead, index) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  index={index}
                  isDragDisabled={stage.isDefault || stage.order === 0}
                />
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </StrictModeDroppable>
    </div>
  )
}

