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
      config[varName] = varConfig.default || ''
    })
    return config
  })()

  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, any>>(initialConfig)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

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
      await apiRequest(`/workflow-templates/${template.id}/instantiate`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          config,
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
                                {value !== undefined && value !== null && value !== ''
                                  ? String(value)
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

