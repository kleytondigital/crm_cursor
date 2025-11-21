'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Copy, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'

interface Variable {
  name: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'multiselect' | 'file_document' | 'file_image' | 'file_audio' | 'file_video'
  label: string
  description: string
  required: boolean
  default: string
  options?: string[]
  accept?: string // Para tipos de arquivo: ex: ".pdf,.doc,.docx,.txt" para file_document
  _optionsText?: string // Campo temporário para digitação livre de opções
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
          accept: config.accept || undefined,
        }))
      : []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [jsonError, setJsonError] = useState('')

  const addVariable = (afterIndex?: number) => {
    const newVariable: Variable = {
      name: '',
      type: 'text',
      label: '',
      description: '',
      required: false,
      default: '',
      options: [],
    }

    if (afterIndex !== undefined) {
      // Inserir após o índice especificado
      setVariables((prev) => {
        const updated = [...prev]
        updated.splice(afterIndex + 1, 0, newVariable)
        return updated
      })
    } else {
      // Adicionar ao final
      setVariables((prev) => [...prev, newVariable])
    }
  }

  const duplicateVariable = (index: number) => {
    setVariables((prev) => {
      const variableToDuplicate = prev[index]
      const duplicated: Variable = {
        ...variableToDuplicate,
        name: variableToDuplicate.name ? `${variableToDuplicate.name}_copy` : '',
        label: variableToDuplicate.label ? `${variableToDuplicate.label} (cópia)` : '',
      }
      const updated = [...prev]
      updated.splice(index + 1, 0, duplicated)
      return updated
    })
  }

  const removeVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index))
  }

  const updateVariable = (index: number, field: string, value: any) => {
    setVariables((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
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

      // Validar opções para multiselect
      if (variable.type === 'multiselect' && (!variable.options || variable.options.length === 0)) {
        setError(`Variável "${variable.name}": Tipo multiselect precisa ter pelo menos uma opção`)
        return false
      }
    }

    // Verificar se variáveis do CRM usadas no JSON existem na definição
    // Variáveis do CRM: {@variavel} (com prefixo @)
    // Variáveis do n8n: {{variavel}} (chaves duplas) e {variavel} (sem @) - ignorar essas
    const jsonString = JSON.stringify(parsedJson)
    
    // Estratégia: proteger variáveis do n8n {{}} e {} (sem @),
    // depois procurar apenas variáveis do CRM com prefixo {@variavel}
    
    // 1. Proteger variáveis do n8n {{}} substituindo por placeholder temporário
    const n8nVariablePlaceholders = new Map<string, string>()
    let placeholderIndex = 0
    const protectedJsonString1 = jsonString.replace(/\{\{([^}]+)\}\}/g, (match) => {
      const placeholder = `__N8N_VAR_DOUBLE_${placeholderIndex++}__`
      n8nVariablePlaceholders.set(placeholder, match)
      return placeholder
    })
    
    // 2. Proteger variáveis do n8n {} (sem prefixo @) substituindo por placeholder temporário
    // Não capturar {@variavel} - essas são variáveis do CRM
    const protectedJsonString2 = protectedJsonString1.replace(/\{([^@}][^}]*)\}/g, (match) => {
      // Se não começa com @, é variável do n8n, proteger
      const placeholder = `__N8N_VAR_SINGLE_${placeholderIndex++}__`
      n8nVariablePlaceholders.set(placeholder, match)
      return placeholder
    })
    
    // 3. Procurar apenas variáveis do CRM com prefixo {@variavel}
    const variableMatches = protectedJsonString2.match(/\{@([^}]+)\}/g) || []
    
    const usedVariables = new Set(
      variableMatches
        .map(match => {
          // Remover chaves e prefixo @: {@variavel} -> variavel
          const varName = match.replace(/^\{@|\}$/g, '').trim()
          // Suporta formato com valor padrão: {@variavel|default}
          return varName.split('|')[0].trim()
        })
        .filter(Boolean)
    )

    const definedVariables = new Set(variables.map(v => v.name.trim()).filter(Boolean))
    const undefinedVariables = Array.from(usedVariables).filter(v => !definedVariables.has(v))
    
    if (undefinedVariables.length > 0) {
      setError(`Variáveis do CRM usadas no JSON mas não definidas: ${undefinedVariables.join(', ')}`)
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
      // Converter variáveis para formato esperado (remover campos temporários)
      const variablesConfig: Record<string, any> = {}
      variables.forEach((v) => {
        const { _optionsText, ...cleanVariable } = v // Remover campo temporário
        variablesConfig[v.name] = {
          type: cleanVariable.type,
          label: cleanVariable.label,
          description: cleanVariable.description,
          required: cleanVariable.required,
          default: cleanVariable.default,
          ...(cleanVariable.type === 'select' && cleanVariable.options?.length ? { options: cleanVariable.options } : {}),
          ...(cleanVariable.type === 'multiselect' && cleanVariable.options?.length ? { options: cleanVariable.options } : {}),
          ...(cleanVariable.accept ? { accept: cleanVariable.accept } : {}),
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
                  Cole o JSON exportado do n8n. Use &#123;&#64;nomeVariavel&#125; (com prefixo @) para marcar variáveis editáveis do CRM. Variáveis do n8n (&#123;&#123;variavel&#125;&#125; e &#123;variavel&#125;) serão mantidas como estão.
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
                onClick={() => addVariable()}
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => duplicateVariable(index)}
                          className="text-brand-secondary hover:text-brand-primary transition-colors"
                          title="Duplicar variável"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => addVariable(index)}
                          className="text-brand-secondary hover:text-brand-primary transition-colors"
                          title="Adicionar variável após esta"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeVariable(index)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Remover variável"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                          onChange={(e) => {
                            const newType = e.target.value as Variable['type']
                            // Atualizar o array de variáveis usando função para garantir estado atualizado
                            setVariables((prev) => {
                              const currentVariable = prev[index]
                              // Criar nova variável com o tipo atualizado
                              const updatedVariable: Variable = {
                                ...currentVariable,
                                type: newType,
                                // Limpar opções se não for select/multiselect, manter se for
                                options: (newType === 'select' || newType === 'multiselect') 
                                  ? (currentVariable.options || [])
                                  : undefined,
                                // Limpar accept se não for tipo de arquivo
                                // Definir accept padrão se for tipo de arquivo e não tiver
                                accept: newType.startsWith('file_')
                                  ? (currentVariable.accept || (
                                      newType === 'file_document' ? '.pdf,.doc,.docx,.txt' :
                                      newType === 'file_image' ? '.jpg,.jpeg,.png,.gif,.webp' :
                                      newType === 'file_audio' ? '.mp3,.wav,.ogg,.m4a' :
                                      newType === 'file_video' ? '.mp4,.webm,.ogg,.mov' :
                                      undefined
                                    ))
                                  : undefined,
                              }
                              
                              const updated = [...prev]
                              updated[index] = updatedVariable
                              return updated
                            })
                          }}
                          className="w-full rounded-lg border border-white/10 bg-background-card px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                        >
                          <option value="text">Texto</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Select</option>
                          <option value="multiselect">Múltipla Seleção</option>
                          <option value="number">Número</option>
                          <option value="file_document">Arquivo (PDF/DOC/TXT)</option>
                          <option value="file_image">Arquivo de Imagem</option>
                          <option value="file_audio">Arquivo de Áudio</option>
                          <option value="file_video">Arquivo de Vídeo</option>
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

                      {/* Campo de Opções - apenas para select e multiselect */}
                      {(variable.type === 'select' || variable.type === 'multiselect') && (
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs text-text-muted">
                            Opções (separadas por vírgula) *
                          </label>
                          <input
                            type="text"
                            value={variable._optionsText !== undefined 
                              ? variable._optionsText 
                              : (variable.options?.join(', ') || '')}
                            onChange={(e) => {
                              // Permitir digitação livre - armazenar texto temporário
                              const inputValue = e.target.value
                              updateVariable(index, '_optionsText', inputValue)
                            }}
                            onBlur={(e) => {
                              // Processar opções apenas quando sair do campo (blur)
                              const inputValue = e.target.value
                              const optionsArray = inputValue
                                .split(',')
                                .map((o) => o.trim())
                                .filter(Boolean)
                              updateVariable(index, 'options', optionsArray)
                              // Limpar campo temporário após processar
                              updateVariable(index, '_optionsText', undefined)
                            }}
                            onKeyDown={(e) => {
                              // Permitir Enter para confirmar opções
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const inputValue = e.currentTarget.value
                                const optionsArray = inputValue
                                  .split(',')
                                  .map((o) => o.trim())
                                  .filter(Boolean)
                                updateVariable(index, 'options', optionsArray)
                                updateVariable(index, '_optionsText', undefined)
                                e.currentTarget.blur()
                              }
                            }}
                            className="w-full rounded-lg border border-white/10 bg-background-card px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                            placeholder="PIX, Cartão de Crédito, Boleto"
                          />
                          <p className="mt-1 text-xs text-text-muted">
                            {variable.type === 'multiselect' 
                              ? 'O usuário poderá selecionar múltiplas opções. Digite as opções separadas por vírgula (ex: PIX, Cartão de Crédito, Boleto)'
                              : 'O usuário poderá selecionar uma única opção. Digite as opções separadas por vírgula'}
                          </p>
                        </div>
                      )}

                      {/* Campo Accept - apenas para tipos de arquivo */}
                      {(variable.type === 'file_document' || 
                        variable.type === 'file_image' || 
                        variable.type === 'file_audio' || 
                        variable.type === 'file_video') && (
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs text-text-muted">
                            Tipos de Arquivo Aceitos (separados por vírgula)
                          </label>
                          <input
                            type="text"
                            value={variable.accept || (() => {
                              if (variable.type === 'file_document') return '.pdf,.doc,.docx,.txt'
                              if (variable.type === 'file_image') return '.jpg,.jpeg,.png,.gif,.webp'
                              if (variable.type === 'file_audio') return '.mp3,.wav,.ogg,.m4a'
                              if (variable.type === 'file_video') return '.mp4,.webm,.ogg,.mov'
                              return ''
                            })()}
                            onChange={(e) => updateVariable(index, 'accept', e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-background-card px-3 py-2 text-sm text-white focus:border-brand-primary focus:outline-none"
                            placeholder={
                              variable.type === 'file_document' 
                                ? '.pdf,.doc,.docx,.txt'
                                : variable.type === 'file_image'
                                ? '.jpg,.jpeg,.png,.gif,.webp'
                                : variable.type === 'file_audio'
                                ? '.mp3,.wav,.ogg,.m4a'
                                : variable.type === 'file_video'
                                ? '.mp4,.webm,.ogg,.mov'
                                : ''
                            }
                          />
                          <p className="mt-1 text-xs text-text-muted">
                            Exemplo: .pdf,.doc,.docx (ou deixe em branco para usar padrão)
                          </p>
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

