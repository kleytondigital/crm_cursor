'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'

interface Variable {
  name: string
  type: 'text' | 'textarea' | 'select' | 'number'
  label: string
  description: string
  required: boolean
  default: string
  options?: string[]
}

interface CreateTemplateModalProps {
  onClose: () => void
  onSuccess: () => void
  editTemplate?: any
}

export default function CreateTemplateModal({ onClose, onSuccess, editTemplate }: CreateTemplateModalProps) {
  const [name, setName] = useState(editTemplate?.name || '')
  const [description, setDescription] = useState(editTemplate?.description || '')
  const [category, setCategory] = useState(editTemplate?.category || '')
  const [icon, setIcon] = useState(editTemplate?.icon || 'bot')
  const [workflowJson, setWorkflowJson] = useState(
    editTemplate?.n8nWorkflowData ? JSON.stringify(editTemplate.n8nWorkflowData, null, 2) : ''
  )
  const [variables, setVariables] = useState<Variable[]>(
    editTemplate?.variables 
      ? Object.entries(editTemplate.variables).map(([name, config]: [string, any]) => ({
          name,
          type: config.type || 'text',
          label: config.label || name,
          description: config.description || '',
          required: config.required || false,
          default: config.default || '',
          options: config.options || [],
        }))
      : []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [jsonError, setJsonError] = useState('')

  const addVariable = () => {
    setVariables([
      ...variables,
      {
        name: '',
        type: 'text',
        label: '',
        description: '',
        required: false,
        default: '',
        options: [],
      },
    ])
  }

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index))
  }

  const updateVariable = (index: number, field: string, value: any) => {
    const updated = [...variables]
    updated[index] = { ...updated[index], [field]: value }
    setVariables(updated)
  }

  const validateForm = () => {
    setError('')

    if (!name.trim()) {
      setError('Nome é obrigatório')
      return false
    }

    if (!workflowJson.trim()) {
      setError('JSON do workflow é obrigatório')
      return false
    }

    // Validar JSON
    let parsedJson: any
    try {
      parsedJson = JSON.parse(workflowJson)
    } catch (e: any) {
      setError('JSON do workflow inválido: ' + e.message)
      return false
    }

    // Validar estrutura básica do workflow n8n
    if (!parsedJson.name && !parsedJson.nodes) {
      setError('JSON do workflow deve ter pelo menos "name" ou "nodes"')
      return false
    }

    // Validar variáveis únicas
    const variableNames = variables.map(v => v.name.trim().toLowerCase()).filter(Boolean)
    const uniqueNames = new Set(variableNames)
    if (variableNames.length !== uniqueNames.size) {
      setError('Variáveis devem ter nomes únicos')
      return false
    }

    // Validar cada variável
    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i]
      
      if (!variable.name.trim()) {
        setError(`Variável ${i + 1}: Nome é obrigatório`)
        return false
      }

      // Validar nome da variável (sem espaços, caracteres especiais)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.name.trim())) {
        setError(`Variável "${variable.name}": Nome deve conter apenas letras, números e underscore, e começar com letra ou underscore`)
        return false
      }

      if (!variable.label.trim()) {
        setError(`Variável "${variable.name}": Label é obrigatório`)
        return false
      }

      // Validar opções para select
      if (variable.type === 'select' && (!variable.options || variable.options.length === 0)) {
        setError(`Variável "${variable.name}": Tipo select precisa ter pelo menos uma opção`)
        return false
      }
    }

    // Verificar se variáveis usadas no JSON existem na definição
    const jsonString = JSON.stringify(parsedJson)
    const variableMatches = jsonString.match(/\{\{([^}]+)\}\}/g) || []
    const usedVariables = new Set(
      variableMatches
        .map(match => match.replace(/\{\{|\}\}/g, '').trim().split('|')[0].trim())
        .filter(Boolean)
    )

    const definedVariables = new Set(variables.map(v => v.name.trim()).filter(Boolean))
    const undefinedVariables = Array.from(usedVariables).filter(v => !definedVariables.has(v))
    
    if (undefinedVariables.length > 0) {
      setError(`Variáveis usadas no JSON mas não definidas: ${undefinedVariables.join(', ')}`)
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Converter variáveis para formato esperado
      const variablesConfig: Record<string, any> = {}
      variables.forEach((v) => {
        variablesConfig[v.name] = {
          type: v.type,
          label: v.label,
          description: v.description,
          required: v.required,
          default: v.default,
          ...(v.type === 'select' && v.options?.length ? { options: v.options } : {}),
        }
      })

      const payload = {
        name,
        description,
        category,
        icon,
        isGlobal: true,
        n8nWorkflowData: JSON.parse(workflowJson),
        variables: variablesConfig,
      }

      const endpoint = editTemplate
        ? `/workflow-templates/${editTemplate.id}`
        : '/workflow-templates'

      await apiRequest(endpoint, {
        method: editTemplate ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar template:', error)
      setError(error.message || 'Erro ao salvar template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background-card p-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">
            {editTemplate ? 'Editar Template' : 'Novo Template'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-muted hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Informações Básicas</h4>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-muted">
                Nome *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-background-muted px-4 py-3 text-white placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
                placeholder="Ex: Atendimento Automático com IA"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text-muted">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-background-muted px-4 py-3 text-white placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
                placeholder="Descreva o que este template faz..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-muted">
                  Categoria
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-background-muted px-4 py-3 text-white placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
                  placeholder="Ex: Atendimento, Vendas"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-muted">
                  Ícone
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-background-muted px-4 py-3 text-white placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
                  placeholder="bot"
                />
              </div>
            </div>
          </div>

          {/* JSON do Workflow */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">JSON do Workflow (n8n) *</h4>
              <a
                href="https://docs.n8n.io/api/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-secondary hover:underline"
              >
                Documentação n8n
              </a>
            </div>

            <div className="space-y-2">
              <textarea
                value={workflowJson}
                onChange={(e) => {
                  setWorkflowJson(e.target.value)
                  setJsonError('')
                  // Validar JSON em tempo real
                  if (e.target.value.trim()) {
                    try {
                      JSON.parse(e.target.value)
                    } catch (err: any) {
                      setJsonError('JSON inválido: ' + err.message)
                    }
                  }
                }}
                rows={12}
                className={`w-full rounded-xl border px-4 py-3 font-mono text-sm text-white placeholder:text-text-muted focus:outline-none ${
                  jsonError
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-white/10 bg-background-muted focus:border-brand-primary'
                }`}
                placeholder={`{\n  "name": "Meu Workflow",\n  "nodes": [...],\n  "connections": {...}\n}`}
              />
              {jsonError && (
                <p className="text-xs text-red-400">{jsonError}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  Cole o JSON exportado do n8n. Use &#123;&#123;nomeVariavel&#125;&#125; para marcar variáveis editáveis.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (workflowJson.trim()) {
                      try {
                        const parsed = JSON.parse(workflowJson)
                        setShowPreview(!showPreview)
                      } catch {
                        setJsonError('JSON inválido. Não é possível visualizar preview.')
                      }
                    }
                  }}
                  className="text-xs"
                  disabled={!workflowJson.trim() || !!jsonError}
                >
                  {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
                </Button>
              </div>
              {showPreview && workflowJson.trim() && !jsonError && (
                <div className="rounded-xl border border-brand-primary/30 bg-background-muted/60 p-4">
                  <p className="mb-2 text-xs font-semibold text-brand-secondary">Preview do JSON:</p>
                  <pre className="max-h-64 overflow-auto text-xs text-white">
                    {JSON.stringify(JSON.parse(workflowJson), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Variáveis */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">Variáveis Editáveis</h4>
              <Button
                onClick={addVariable}
                size="sm"
                className="gap-2 bg-brand-primary text-white"
              >
                <Plus className="h-4 w-4" />
                Adicionar Variável
              </Button>
            </div>

            {variables.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-background-muted/40 p-6 text-center">
                <p className="text-sm text-text-muted">
                  Nenhuma variável configurada. Adicione variáveis que os tenants poderão personalizar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {variables.map((variable, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-white/10 bg-background-muted/60 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        Variável {index + 1}
                      </span>
                      <button
                        onClick={() => removeVariable(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs text-text-muted">
                          Nome da Variável *
                        </label>
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => updateVariable(index, 'name', e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-background-card px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                          placeholder="systemPrompt"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-text-muted">
                          Tipo *
                        </label>
                        <select
                          value={variable.type}
                          onChange={(e) => updateVariable(index, 'type', e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-background-card px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                        >
                          <option value="text">Texto</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Select</option>
                          <option value="number">Número</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-text-muted">
                          Label *
                        </label>
                        <input
                          type="text"
                          value={variable.label}
                          onChange={(e) => updateVariable(index, 'label', e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-background-card px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                          placeholder="Prompt do Sistema"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs text-text-muted">
                          Valor Padrão
                        </label>
                        <input
                          type="text"
                          value={variable.default}
                          onChange={(e) => updateVariable(index, 'default', e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-background-card px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                          placeholder="Valor padrão"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="mb-1 block text-xs text-text-muted">
                          Descrição
                        </label>
                        <input
                          type="text"
                          value={variable.description}
                          onChange={(e) => updateVariable(index, 'description', e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-background-card px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                          placeholder="Descreva esta variável..."
                        />
                      </div>

                      <div className="col-span-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`required-${index}`}
                          checked={variable.required}
                          onChange={(e) => updateVariable(index, 'required', e.target.checked)}
                          className="h-4 w-4 rounded border-white/10 bg-background-card text-brand-primary focus:ring-brand-primary"
                        />
                        <label htmlFor={`required-${index}`} className="text-sm text-text-muted">
                          Obrigatório
                        </label>
                      </div>

                      {variable.type === 'select' && (
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs text-text-muted">
                            Opções (separadas por vírgula)
                          </label>
                          <input
                            type="text"
                            value={variable.options?.join(', ') || ''}
                            onChange={(e) =>
                              updateVariable(
                                index,
                                'options',
                                e.target.value.split(',').map((o) => o.trim()).filter(Boolean)
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-background-card px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                            placeholder="Opção 1, Opção 2, Opção 3"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="mt-8 flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-brand-primary text-white"
            disabled={loading}
          >
            {loading ? 'Salvando...' : editTemplate ? 'Atualizar Template' : 'Criar Template'}
          </Button>
        </div>
      </div>
    </div>
  )
}

