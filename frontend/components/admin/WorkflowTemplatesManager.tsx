'use client'

import { useEffect, useState } from 'react'
import { Plus, Bot, Edit2, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CreateTemplateModal from './CreateTemplateModal'
import ViewTemplateModal from './ViewTemplateModal'

interface WorkflowTemplate {
  id: string
  name: string
  description?: string
  category?: string
  icon?: string
  isGlobal: boolean
  variables: Record<string, any>
  n8nWorkflowData?: any
  createdAt: string
}

export default function WorkflowTemplatesManager() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewTemplate, setViewTemplate] = useState<WorkflowTemplate | null>(null)
  const [editTemplate, setEditTemplate] = useState<WorkflowTemplate | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/workflow-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este template?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3000/workflow-templates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        loadTemplates()
      }
    } catch (error) {
      console.error('Erro ao remover template:', error)
      alert('Erro ao remover template')
    }
  }

  const handleView = async (template: WorkflowTemplate) => {
    // Buscar template completo com n8nWorkflowData
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3000/workflow-templates/${template.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const fullTemplate = await response.json()
        setViewTemplate(fullTemplate)
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error)
      alert('Erro ao carregar template')
    }
  }

  const handleEdit = async (template: WorkflowTemplate) => {
    // Buscar template completo para edição
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3000/workflow-templates/${template.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const fullTemplate = await response.json()
        setEditTemplate(fullTemplate)
        setViewTemplate(null) // Fechar modal de visualização se estiver aberto
      }
    } catch (error) {
      console.error('Erro ao carregar template:', error)
      alert('Erro ao carregar template')
    }
  }

  const handleCloseModals = () => {
    setShowCreateModal(false)
    setViewTemplate(null)
    setEditTemplate(null)
  }

  const handleSuccess = () => {
    loadTemplates()
    handleCloseModals()
  }

  if (loading) {
    return <div className="text-white">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Templates de Workflow</h2>
          <p className="text-sm text-text-muted">
            Gerencie templates globais de automação
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90"
        >
          <Plus className="h-4 w-4" />
          Novo Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-2xl border border-white/10 bg-background-card/80 p-6 shadow-glow backdrop-blur-xl transition hover:border-brand-primary/30"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-secondary">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{template.name}</h3>
                  {template.category && (
                    <span className="text-xs text-text-muted">{template.category}</span>
                  )}
                </div>
              </div>
            </div>

            {template.description && (
              <p className="mb-4 text-sm text-text-muted line-clamp-2">
                {template.description}
              </p>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              {Object.keys(template.variables).map((varName) => (
                <span
                  key={varName}
                  className="rounded-full bg-white/5 px-2 py-1 text-xs text-text-muted"
                >
                  {varName}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(template)}
                className="flex-1 gap-2 text-text-muted hover:text-white"
              >
                <Eye className="h-4 w-4" />
                Ver
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(template)}
                className="flex-1 gap-2 text-text-muted hover:text-white"
              >
                <Edit2 className="h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(template.id)}
                className="gap-2 text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background-card/40 p-12 text-center">
          <Bot className="mb-4 h-16 w-16 text-text-muted" />
          <h3 className="mb-2 text-lg font-semibold text-white">
            Nenhum template ainda
          </h3>
          <p className="mb-6 text-sm text-text-muted">
            Crie seu primeiro template de automação
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2 bg-brand-primary text-white"
          >
            <Plus className="h-4 w-4" />
            Criar Template
          </Button>
        </div>
      )}

      {/* Modais */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={handleCloseModals}
          onSuccess={handleSuccess}
        />
      )}

      {editTemplate && (
        <CreateTemplateModal
          editTemplate={editTemplate}
          onClose={handleCloseModals}
          onSuccess={handleSuccess}
        />
      )}

      {viewTemplate && (
        <ViewTemplateModal
          template={viewTemplate}
          onClose={handleCloseModals}
          onEdit={() => handleEdit(viewTemplate)}
        />
      )}
    </div>
  )
}

