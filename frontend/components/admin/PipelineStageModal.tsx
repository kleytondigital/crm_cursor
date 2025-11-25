'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { PipelineStage, CreatePipelineStageDto } from '@/lib/api/pipeline-stages'
import { CustomLeadStatus, leadStatusAPI } from '@/lib/api/lead-status'

interface PipelineStageModalProps {
  stage?: PipelineStage | null
  onClose: () => void
  onSuccess: () => void
}

const DEFAULT_COLORS = [
  '#3B82F6', // Azul
  '#F59E0B', // Laranja
  '#8B5CF6', // Roxo
  '#10B981', // Verde
  '#EF4444', // Vermelho
  '#FBBF24', // Amarelo
  '#6B7280', // Cinza
  '#EC4899', // Rosa
  '#14B8A6', // Teal
  '#F97316', // Laranja escuro
]

export default function PipelineStageModal({ stage, onClose, onSuccess }: PipelineStageModalProps) {
  const [formData, setFormData] = useState<CreatePipelineStageDto>({
    name: '',
    statusId: '',
    color: '#3B82F6',
    isActive: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customStatuses, setCustomStatuses] = useState<CustomLeadStatus[]>([])
  const [loadingStatuses, setLoadingStatuses] = useState(true)

  useEffect(() => {
    // Carregar status customizados disponíveis
    const loadStatuses = async () => {
      try {
        setLoadingStatuses(true)
        const statuses = await leadStatusAPI.getAll()
        const activeStatuses = statuses
          .filter((s) => s.isActive)
          .sort((a, b) => a.order - b.order)
        setCustomStatuses(activeStatuses)
        
        // Se não há stage e há statuses, selecionar o primeiro por padrão
        if (!stage && activeStatuses.length > 0 && !formData.statusId) {
          setFormData((prev) => ({ ...prev, statusId: activeStatuses[0].id }))
        }
      } catch (err: any) {
        console.error('Erro ao carregar status customizados:', err)
        setError('Erro ao carregar status customizados')
      } finally {
        setLoadingStatuses(false)
      }
    }
    loadStatuses()
  }, [])

  useEffect(() => {
    if (stage) {
      setFormData({
        name: stage.name,
        statusId: stage.statusId,
        color: stage.color,
        isActive: stage.isActive,
      })
    }
  }, [stage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { pipelineStagesAPI } = await import('@/lib/api/pipeline-stages')

      if (stage) {
        await pipelineStagesAPI.update(stage.id, formData)
      } else {
        await pipelineStagesAPI.create(formData)
      }

      onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar estágio:', err)
      setError(err.response?.data?.message || 'Erro ao salvar estágio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {stage ? 'Editar Estágio' : 'Novo Estágio'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Nome do Estágio *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Ex: Qualificado, Proposta Enviada..."
              required
              disabled={loading}
            />
          </div>

          {/* Status Customizado */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status do Lead *
            </label>
            {loadingStatuses ? (
              <div className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-500">
                Carregando status...
              </div>
            ) : customStatuses.length === 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                Nenhum status customizado encontrado. Crie um status em "Status de Leads" primeiro.
              </div>
            ) : (
              <>
                <select
                  value={formData.statusId}
                  onChange={(e) => {
                    const selectedStatus = customStatuses.find((s) => s.id === e.target.value)
                    setFormData({ 
                      ...formData, 
                      statusId: e.target.value,
                      color: selectedStatus?.color || formData.color, // Usar cor do status se não especificada
                    })
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  required
                  disabled={loading}
                >
                  {customStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Status customizado que será aplicado aos leads neste estágio
                </p>
              </>
            )}
          </div>

          {/* Cor */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Cor *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10 w-16 cursor-pointer rounded border border-gray-300"
                disabled={loading}
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-mono text-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                placeholder="#3B82F6"
                pattern="^#[0-9A-Fa-f]{6}$"
                required
                disabled={loading}
              />
            </div>

            {/* Cores pré-definidas */}
            <div className="mt-2 flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className="h-8 w-8 rounded border-2 border-gray-200 transition hover:scale-110"
                  style={{ backgroundColor: color }}
                  title={color}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {/* Ativo/Inativo */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              disabled={loading}
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Estágio ativo
            </label>
          </div>

          {/* Preview */}
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Preview:</p>
            <div
              className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm"
              style={{ backgroundColor: formData.color }}
            >
              {formData.name || 'Nome do Estágio'}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-brand-primary px-4 py-2.5 font-medium text-white hover:bg-brand-primary-dark disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : stage ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

