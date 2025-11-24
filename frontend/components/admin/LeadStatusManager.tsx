'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, GripVertical, AlertCircle } from 'lucide-react'
import { CustomLeadStatus, CreateLeadStatusDto, leadStatusAPI } from '@/lib/api/lead-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'

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

interface LeadStatusModalProps {
  status?: CustomLeadStatus | null
  onClose: () => void
  onSuccess: () => void
}

function LeadStatusModal({ status, onClose, onSuccess }: LeadStatusModalProps) {
  const [formData, setFormData] = useState<CreateLeadStatusDto>({
    name: '',
    description: '',
    color: '#3B82F6',
    isActive: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status) {
      setFormData({
        name: status.name,
        description: status.description,
        color: status.color,
        isActive: status.isActive,
      })
    }
  }, [status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (status) {
        await leadStatusAPI.update(status.id, formData)
      } else {
        await leadStatusAPI.create(formData)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar status:', err)
      setError(err.response?.data?.message || 'Erro ao salvar status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-background-subtle/95 p-6 shadow-xl backdrop-blur-md">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {status ? 'Editar Status' : 'Novo Status'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Nome do Status *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-background-muted/80 border-white/10 text-white placeholder:text-text-muted"
              placeholder="Ex: Novo Lead, Enviou Catálogo"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Descrição *
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="bg-background-muted/80 border-white/10 text-white placeholder:text-text-muted"
              placeholder="Descreva o que este status significa para auxiliar o agente de automação..."
            />
            <p className="mt-1 text-xs text-text-muted">
              Esta descrição será usada pelo agente de automação para entender quando usar este status.
            </p>
          </div>

          {/* Cor */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Cor
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`h-10 w-10 rounded-lg border-2 transition-all ${
                    formData.color === color
                      ? 'border-white scale-110'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <Input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="mt-2 h-10 w-full bg-background-muted/80 border-white/10"
            />
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-background-muted/80 text-brand-primary focus:ring-brand-primary"
            />
            <label htmlFor="isActive" className="text-sm text-white">
              Status ativo
            </label>
          </div>

          {/* Erro */}
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 bg-background-muted/80 text-white hover:bg-background-soft"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-primary text-white hover:bg-brand-primary/90"
            >
              {loading ? 'Salvando...' : status ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LeadStatusManager() {
  const [statuses, setStatuses] = useState<CustomLeadStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingStatus, setEditingStatus] = useState<CustomLeadStatus | null>(null)
  const [showModal, setShowModal] = useState(false)

  const loadStatuses = async () => {
    try {
      setLoading(true)
      const data = await leadStatusAPI.getAll()
      // Ordenar por order
      const sorted = data.sort((a, b) => a.order - b.order)
      setStatuses(sorted)
      setError('')
    } catch (err: any) {
      console.error('Erro ao carregar status:', err)
      setError('Erro ao carregar status customizados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatuses()
  }, [])

  const handleCreate = () => {
    setEditingStatus(null)
    setShowModal(true)
  }

  const handleEdit = (status: CustomLeadStatus) => {
    setEditingStatus(status)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este status? Leads usando este status precisarão ser movidos para outro status antes.')) {
      return
    }

    try {
      await leadStatusAPI.delete(id)
      await loadStatuses()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao deletar status')
    }
  }

  const handleModalSuccess = () => {
    loadStatuses()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-text-muted">Carregando status...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Status de Leads</h2>
          <p className="mt-1 text-sm text-text-muted">
            Gerencie os status customizados dos leads. A descrição ajuda o agente de automação a entender quando usar cada status.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo Status
        </Button>
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Lista de Status */}
      {statuses.length === 0 ? (
        <Card className="border-white/10 bg-background-subtle/60 p-8 text-center">
          <p className="text-text-muted">Nenhum status customizado criado ainda.</p>
          <Button
            onClick={handleCreate}
            className="mt-4 gap-2 bg-brand-primary text-white hover:bg-brand-primary/90"
          >
            <Plus className="h-4 w-4" />
            Criar Primeiro Status
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {statuses.map((status) => (
            <Card
              key={status.id}
              className="border-white/10 bg-background-subtle/60 p-4"
            >
              <div className="flex items-start gap-4">
                {/* Cor */}
                <div
                  className="h-12 w-12 shrink-0 rounded-lg"
                  style={{ backgroundColor: status.color }}
                />

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{status.name}</h3>
                    {!status.isActive && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-text-muted">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text-muted">{status.description}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
                    <span>Ordem: {status.order}</span>
                    <span>•</span>
                    <span>Criado em: {new Date(status.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(status)}
                    className="border-white/10 bg-background-muted/80 text-white hover:bg-background-soft"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(status.id)}
                    className="border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <LeadStatusModal
          status={editingStatus}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

