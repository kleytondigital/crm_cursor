'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, GripVertical, AlertCircle } from 'lucide-react'
import { PipelineStage, pipelineStagesAPI } from '@/lib/api/pipeline-stages'
import PipelineStageModal from '@/components/admin/PipelineStageModal'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableStageProps {
  stage: PipelineStage
  onEdit: (stage: PipelineStage) => void
  onDelete: (stage: PipelineStage) => void
}

function SortableStage({ stage, onEdit, onDelete }: SortableStageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Cor e Nome */}
      <div className="flex flex-1 items-center gap-3">
        <div
          className="h-10 w-10 rounded-full shadow-sm"
          style={{ backgroundColor: stage.color }}
          title={stage.color}
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{stage.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
              {stage.status}
            </span>
            {stage.isDefault && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Padrão
              </span>
            )}
            {!stage.isActive && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Inativo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(stage)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          title="Editar estágio"
          disabled={stage.isDefault}
        >
          <Edit2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDelete(stage)}
          className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
          title={stage.isDefault ? 'Estágios padrão não podem ser removidos' : 'Remover estágio'}
          disabled={stage.isDefault}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<PipelineStage | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadStages()
  }, [])

  const loadStages = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await pipelineStagesAPI.getAll()
      // Ordenar por order
      const sorted = data.sort((a, b) => a.order - b.order)
      setStages(sorted)
    } catch (err: any) {
      console.error('Erro ao carregar estágios:', err)
      setError('Erro ao carregar estágios')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = stages.findIndex((s) => s.id === active.id)
    const newIndex = stages.findIndex((s) => s.id === over.id)

    const newStages = arrayMove(stages, oldIndex, newIndex)

    // Atualizar ordem localmente (otimista)
    setStages(newStages)

    try {
      // Enviar nova ordem para o backend
      const reorderData = newStages.map((stage, index) => ({
        id: stage.id,
        order: index,
      }))
      await pipelineStagesAPI.reorder(reorderData)
    } catch (err: any) {
      console.error('Erro ao reordenar estágios:', err)
      // Reverter ordem em caso de erro
      loadStages()
    }
  }

  const handleEdit = (stage: PipelineStage) => {
    setSelectedStage(stage)
    setShowModal(true)
  }

  const handleDelete = async (stage: PipelineStage) => {
    if (!deleteConfirm || deleteConfirm.id !== stage.id) {
      setDeleteConfirm(stage)
      return
    }

    try {
      await pipelineStagesAPI.remove(stage.id)
      await loadStages()
      setDeleteConfirm(null)
    } catch (err: any) {
      console.error('Erro ao remover estágio:', err)
      alert(err.response?.data?.message || 'Erro ao remover estágio')
    }
  }

  const handleSuccess = () => {
    setShowModal(false)
    setSelectedStage(null)
    loadStages()
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-primary border-t-transparent mx-auto" />
          <p className="text-gray-600">Carregando estágios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Estágios do Pipeline</h1>
          <p className="mt-1 text-gray-600">
            Configure os estágios do funil de vendas (Kanban)
          </p>
        </div>

        {/* Info Alert */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Como funciona:</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Arraste os estágios para reordenar</li>
                <li>Cada estágio está associado a um status de lead</li>
                <li>Estágios padrão (marcados) não podem ser editados ou removidos</li>
                <li>Você pode criar quantos estágios personalizados quiser</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {stages.length} estágio{stages.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={() => {
              setSelectedStage(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 font-medium text-white hover:bg-brand-primary-dark shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Novo Estágio
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Stages List */}
        {stages.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-600">Nenhum estágio cadastrado</p>
            <button
              onClick={() => {
                setSelectedStage(null)
                setShowModal(true)
              }}
              className="mt-4 text-brand-primary hover:underline"
            >
              Criar primeiro estágio
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {stages.map((stage) => (
                  <SortableStage
                    key={stage.id}
                    stage={stage}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="mt-4 rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-900">
              Tem certeza que deseja remover "{deleteConfirm.name}"?
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Sim, remover
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <PipelineStageModal
          stage={selectedStage}
          onClose={() => {
            setShowModal(false)
            setSelectedStage(null)
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

