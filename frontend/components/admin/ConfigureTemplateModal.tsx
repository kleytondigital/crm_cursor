'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
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
  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Inicializar config com valores padrão
  useState(() => {
    const initialConfig: Record<string, any> = {}
    Object.entries(template.variables || {}).forEach(([varName, varConfig]: [string, any]) => {
      initialConfig[varName] = varConfig.default || ''
    })
    setConfig(initialConfig)
  })

  const handleVariableChange = (varName: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [varName]: value,
    }))
  }

  const validateForm = () => {
    if (!name.trim()) {
      setError('Nome da automação é obrigatório')
      return false
    }

    // Validar campos obrigatórios
    for (const [varName, varConfig] of Object.entries(template.variables || {})) {
      const varConfigTyped = varConfig as any
      if (varConfigTyped.required && !config[varName]) {
        setError(`Campo "${varConfigTyped.label}" é obrigatório`)
        return false
      }
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

  const renderVariableField = (varName: string, varConfig: any) => {
    const value = config[varName]

    switch (varConfig.type) {
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleVariableChange(varName, e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-background-muted px-4 py-3 text-white placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
            rows={4}
            placeholder={varConfig.description || varConfig.label}
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleVariableChange(varName, e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-background-muted px-4 py-3 text-white focus:border-brand-primary focus:outline-none"
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
            onChange={(e) => handleVariableChange(varName, parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl border border-white/10 bg-background-muted px-4 py-3 text-white placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
            placeholder={varConfig.description || varConfig.label}
          />
        )

      default: // text
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleVariableChange(varName, e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-background-muted px-4 py-3 text-white placeholder:text-text-muted focus:border-brand-primary focus:outline-none"
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

              {Object.entries(template.variables).map(([varName, varConfig]: [string, any]) => (
                <div key={varName}>
                  <label className="mb-2 block text-sm font-medium text-text-muted">
                    {varConfig.label}
                    {varConfig.required && <span className="text-red-400"> *</span>}
                  </label>
                  {varConfig.description && (
                    <p className="mb-2 text-xs text-text-muted">{varConfig.description}</p>
                  )}
                  {renderVariableField(varName, varConfig)}
                </div>
              ))}
            </div>
          )}
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

