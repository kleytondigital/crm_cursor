'use client'

import { useState } from 'react'
import { X, Eye, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'

interface ConfigureTemplateModalProps {
  template: any
  onClose: () => void
  onSuccess: () => void
}

export default function ConfigureTemplateModal({
  template,
  onClose,
  onSuccess,
}: ConfigureTemplateModalProps) {
  // Inicializar config com valores padrão do template
  const initialConfig = (() => {
    const config: Record<string, any> = {}
    Object.entries(template.variables || {}).forEach(([varName, varConfig]: [string, any]) => {
      // Para multiselect, usar array vazio se não tiver default
      if (varConfig.type === 'multiselect') {
        config[varName] = Array.isArray(varConfig.default) ? varConfig.default : []
      } else {
        config[varName] = varConfig.default || ''
      }
    })
    return config
  })()

  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, any>>(initialConfig)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  
  // Estados para modo teste
  const [testMode, setTestMode] = useState(false)
  const [testPhone, setTestPhone] = useState('')

  const handleVariableChange = (varName: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [varName]: value,
    }))
  }

  const validateForm = () => {
    setError('')
    const errors: Record<string, string> = {}

    // Validar nome
    if (!name.trim()) {
      setError('Nome da automação é obrigatório')
      return false
    }

    // Validar telefone de teste se modo teste estiver ativado
    if (testMode) {
      if (!testPhone.trim()) {
        errors.testPhone = 'Telefone para modo teste é obrigatório'
      } else {
        // Validar formato do telefone (apenas números, sem @c.us)
        const cleanPhone = testPhone.replace(/[^\d]/g, '')
        if (cleanPhone.length !== 13 || !cleanPhone.startsWith('55')) {
          errors.testPhone = 'Telefone deve ter 13 dígitos no formato 5562999999999 (código do país + DDD + número)'
        }
      }
    }

    // Validar cada campo
    for (const [varName, varConfig] of Object.entries(template.variables || {})) {
      const varConfigTyped = varConfig as any
      const value = config[varName]

      // Campo obrigatório vazio
      if (varConfigTyped.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors[varName] = 'Este campo é obrigatório'
      }

      // Validação de tipo number
      if (varConfigTyped.type === 'number' && value !== undefined && value !== null && value !== '') {
        const numValue = typeof value === 'string' ? parseFloat(value) : value
        if (isNaN(numValue)) {
          errors[varName] = 'Deve ser um número válido'
        }
      }

      // Validação de select
      if (varConfigTyped.type === 'select' && value && varConfigTyped.options) {
        if (!varConfigTyped.options.includes(value)) {
          errors[varName] = 'Opção inválida'
        }
      }

      // Validação de multiselect
      if (varConfigTyped.type === 'multiselect') {
        if (varConfigTyped.required && (!Array.isArray(value) || value.length === 0)) {
          errors[varName] = 'Selecione pelo menos uma opção'
        }
        if (Array.isArray(value) && value.length > 0 && varConfigTyped.options) {
          const invalidOptions = value.filter((v: string) => !varConfigTyped.options.includes(v))
          if (invalidOptions.length > 0) {
            errors[varName] = 'Opções inválidas: ' + invalidOptions.join(', ')
          }
        }
      }

      // Validação de arquivo
      if (varConfigTyped.type?.startsWith('file_') && varConfigTyped.required) {
        if (!value || (typeof value === 'string' && !value.trim())) {
          errors[varName] = 'Arquivo é obrigatório'
        }
      }
    }

    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      setError('Corrija os erros nos campos antes de continuar')
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
      // Preparar telefone de teste com @c.us se modo teste estiver ativado
      let finalTestPhone: string | undefined = undefined
      if (testMode && testPhone.trim()) {
        // Limpar telefone (remover caracteres não numéricos) e adicionar @c.us
        const cleanPhone = testPhone.replace(/[^\d]/g, '')
        finalTestPhone = `${cleanPhone}@c.us`
      }

      await apiRequest(`/workflow-templates/${template.id}/instantiate`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          config,
          testMode: testMode || undefined,
          testPhone: finalTestPhone,
        }),
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Erro ao criar automação:', error)
      setError(error.message || 'Erro ao criar automação')
    } finally {
      setLoading(false)
    }
  }

  const renderVariableField = (varName: string, varConfig: any, hasError: boolean = false) => {
    const value = config[varName]

    const baseInputClasses = `w-full rounded-xl border px-4 py-3 text-white placeholder:text-text-muted focus:outline-none ${
      hasError
        ? 'border-red-500/50 bg-red-500/5 focus:border-red-500'
        : 'border-white/10 bg-background-muted focus:border-brand-primary'
    }`

    switch (varConfig.type) {
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => {
              handleVariableChange(varName, e.target.value)
              // Limpar erro quando começar a digitar
              if (validationErrors[varName]) {
                setValidationErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors[varName]
                  return newErrors
                })
              }
            }}
            className={baseInputClasses}
            rows={4}
            placeholder={varConfig.description || varConfig.label}
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => {
              handleVariableChange(varName, e.target.value)
              // Limpar erro quando selecionar
              if (validationErrors[varName]) {
                setValidationErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors[varName]
                  return newErrors
                })
              }
            }}
            className={baseInputClasses}
          >
            <option value="">Selecione...</option>
            {varConfig.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            <select
              multiple
              value={selectedValues}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value)
                handleVariableChange(varName, selected)
                // Limpar erro quando selecionar
                if (validationErrors[varName]) {
                  setValidationErrors((prev) => {
                    const newErrors = { ...prev }
                    delete newErrors[varName]
                    return newErrors
                  })
                }
              }}
              className={`${baseInputClasses} min-h-[120px]`}
              size={Math.min(6, varConfig.options?.length || 1)}
            >
              {varConfig.options?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted">
              {selectedValues.length > 0 
                ? `${selectedValues.length} opção(ões) selecionada(s)` 
                : 'Mantenha Ctrl (ou Cmd) pressionado para selecionar múltiplas opções'}
            </p>
          </div>
        )

      case 'file_document':
      case 'file_image':
      case 'file_audio':
      case 'file_video':
        // Definir extensões padrão baseado no tipo
        const defaultExtensions = 
          varConfig.type === 'file_document' 
            ? '.pdf,.doc,.docx,.txt'
            : varConfig.type === 'file_image'
            ? '.jpg,.jpeg,.png,.gif,.webp'
            : varConfig.type === 'file_audio'
            ? '.mp3,.wav,.ogg,.m4a'
            : varConfig.type === 'file_video'
            ? '.mp4,.webm,.ogg,.mov'
            : ''
        
        // Usar accept do config ou padrão
        const acceptExtensions = varConfig.accept || defaultExtensions
        
        // Converter extensões para MIME types para o input file
        const getMimeType = (ext: string): string => {
          const extTrim = ext.trim().toLowerCase()
          const mimeMap: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
            '.mov': 'video/quicktime',
          }
          return mimeMap[extTrim] || ''
        }
        
        const acceptMimeTypes = acceptExtensions
          .split(',')
          .map((ext: string) => getMimeType(ext))
          .filter(Boolean)
          .join(',')

        return (
          <div className="space-y-2">
            <input
              type="file"
              accept={acceptMimeTypes || acceptExtensions}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  // Para arquivos, podemos armazenar o File object ou a URL do arquivo
                  // Por enquanto, vamos armazenar o nome do arquivo
                  handleVariableChange(varName, file.name)
                } else {
                  handleVariableChange(varName, '')
                }
                // Limpar erro quando selecionar arquivo
                if (validationErrors[varName]) {
                  setValidationErrors((prev) => {
                    const newErrors = { ...prev }
                    delete newErrors[varName]
                    return newErrors
                  })
                }
              }}
              className={`${baseInputClasses} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-primary/90`}
            />
            {value && (
              <p className="text-xs text-text-muted">
                Arquivo selecionado: <span className="text-white font-medium">{String(value)}</span>
              </p>
            )}
            {acceptExtensions && (
              <p className="text-xs text-text-muted">
                Tipos aceitos: {acceptExtensions}
              </p>
            )}
          </div>
        )

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => {
              const numValue = e.target.value ? parseFloat(e.target.value) : ''
              handleVariableChange(varName, numValue)
              // Limpar erro quando começar a digitar
              if (validationErrors[varName]) {
                setValidationErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors[varName]
                  return newErrors
                })
              }
            }}
            className={baseInputClasses}
            placeholder={varConfig.description || varConfig.label}
          />
        )

      default: // text
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => {
              handleVariableChange(varName, e.target.value)
              // Limpar erro quando começar a digitar
              if (validationErrors[varName]) {
                setValidationErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors[varName]
                  return newErrors
                })
              }
            }}
            className={baseInputClasses}
            placeholder={varConfig.description || varConfig.label}
          />
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background-card p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Configurar Automação</h3>
            <p className="text-sm text-text-muted mt-1">Template: {template.name}</p>
          </div>
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

        {template.description && (
          <div className="mb-6 rounded-xl bg-white/5 p-4 text-sm text-text-muted">
            {template.description}
          </div>
        )}

        <div className="space-y-6">
          {/* Nome da Automação */}
          <div>
            <label className="mb-2 block text-sm font-medium text-text-muted">
              Nome da Automação <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-background-muted px-4 py-3 text-white placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
              placeholder="Ex: Atendimento Automático - Vendas"
            />
          </div>

          {/* Modo Teste */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-background-muted/50 p-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="testMode"
                checked={testMode}
                onChange={(e) => {
                  setTestMode(e.target.checked)
                  if (!e.target.checked) {
                    setTestPhone('')
                    // Limpar erro de telefone quando desativar modo teste
                    if (validationErrors.testPhone) {
                      setValidationErrors((prev) => {
                        const newErrors = { ...prev }
                        delete newErrors.testPhone
                        return newErrors
                      })
                    }
                  }
                }}
                className="h-5 w-5 rounded border-white/20 bg-background-card text-brand-primary focus:ring-2 focus:ring-brand-primary focus:ring-offset-0"
              />
              <label htmlFor="testMode" className="text-sm font-medium text-white cursor-pointer">
                Ativar Modo Teste
              </label>
            </div>
            <p className="text-xs text-text-muted pl-8">
              No modo teste, o agente responderá apenas para o número especificado. Útil para testar a automação antes de ativar.
            </p>

            {/* Campo de Telefone de Teste (visível quando modo teste estiver ativado) */}
            {testMode && (
              <div className="pl-8">
                <label className="mb-2 block text-sm font-medium text-text-muted">
                  Telefone para Teste <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => {
                    // Permitir apenas números
                    const value = e.target.value.replace(/[^\d]/g, '')
                    setTestPhone(value)
                    // Limpar erro quando começar a digitar
                    if (validationErrors.testPhone) {
                      setValidationErrors((prev) => {
                        const newErrors = { ...prev }
                        delete newErrors.testPhone
                        return newErrors
                      })
                    }
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-white placeholder:text-text-muted focus:outline-none ${
                    validationErrors.testPhone
                      ? 'border-red-500/50 bg-red-500/5 focus:border-red-500'
                      : 'border-white/10 bg-background-muted focus:border-brand-primary'
                  }`}
                  placeholder="5562999999999"
                  maxLength={13}
                />
                {validationErrors.testPhone && (
                  <p className="mt-1 text-xs text-red-400">{validationErrors.testPhone}</p>
                )}
                <p className="mt-1 text-xs text-text-muted">
                  Formato: código do país (55) + DDD (62) + número (999999999). O sistema adicionará automaticamente @c.us
                </p>
              </div>
            )}
          </div>

          {/* Variáveis Configuráveis */}
          {Object.keys(template.variables || {}).length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">Configurações</h4>

              {Object.entries(template.variables).map(([varName, varConfig]: [string, any]) => {
                const hasError = !!validationErrors[varName]
                return (
                  <div key={varName}>
                    <label className={`mb-2 block text-sm font-medium ${
                      hasError ? 'text-red-400' : 'text-text-muted'
                    }`}>
                      {varConfig.label}
                      {varConfig.required && <span className="text-red-400"> *</span>}
                    </label>
                    {varConfig.description && (
                      <p className="mb-2 text-xs text-text-muted">{varConfig.description}</p>
                    )}
                    <div>
                      {renderVariableField(varName, varConfig, hasError)}
                      {hasError && (
                        <p className="mt-1 text-xs text-red-400">{validationErrors[varName]}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Preview dos Valores */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">Preview da Configuração</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                {showPreview ? (
                  <>
                    <X className="h-4 w-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Ver Preview
                  </>
                )}
              </Button>
            </div>

            {showPreview && (
              <div className="rounded-xl border border-brand-primary/30 bg-background-muted/60 p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-brand-secondary">Nome da Automação:</p>
                    <p className="mt-1 text-sm text-white">{name || <span className="text-text-muted italic">Não definido</span>}</p>
                  </div>
                  
                  {Object.keys(config).length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-brand-secondary">Valores Configurados:</p>
                      <div className="space-y-2">
                        {Object.entries(config).map(([varName, value]) => {
                          const varConfig = template.variables?.[varName]
                          if (!varConfig) return null
                          
                          return (
                            <div key={varName} className="rounded-lg border border-white/5 bg-background-card/60 px-3 py-2">
                              <p className="text-xs font-semibold text-white">
                                {varConfig.label || varName}
                              </p>
                              <p className="mt-1 text-xs text-text-muted">
                                {value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
                                  ? Array.isArray(value)
                                    ? value.join(', ')
                                    : String(value)
                                  : <span className="italic">Não definido</span>
                                }
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {Object.keys(config).length === 0 && (
                    <p className="text-xs text-text-muted italic">
                      Nenhuma variável configurada
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="mt-8 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-brand-primary text-white"
            disabled={loading}
          >
            {loading ? 'Criando...' : 'Criar Automação'}
          </Button>
        </div>
      </div>
    </div>
  )
}

