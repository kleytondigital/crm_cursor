'use client'

import { useState, useEffect } from 'react'
import { X, Eye, CheckCircle, Wand2, RefreshCw, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'

interface PromptConfigModalProps {
  instance: {
    id: string
    name: string
    config?: Record<string, any>
    generatedPrompt?: string | null
    template: {
      id: string
      name: string
      variables?: Record<string, any>
    }
  }
  onClose: () => void
  onSuccess?: () => void
}

type PromptType = 'system' | 'user'

export default function PromptConfigModal({
  instance,
  onClose,
  onSuccess,
}: PromptConfigModalProps) {
  const [promptType, setPromptType] = useState<PromptType>('system')
  const [variables, setVariables] = useState<Array<{ name: string; value: any }>>([])
  const [promptAjuste, setPromptAjuste] = useState(instance.generatedPrompt || '')
  const [textAjuste, setTextAjuste] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(instance.generatedPrompt || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Inicializar variáveis a partir do config da instância
  useEffect(() => {
    if (promptType === 'system' && instance.config) {
      const vars = Object.entries(instance.config || {}).map(([key, value]) => ({
        name: key,
        value: value || '',
      }))
      setVariables(vars)
    }
  }, [promptType, instance.config])

  // Carregar prompt atual ao montar
  useEffect(() => {
    if (instance.generatedPrompt) {
      setGeneratedPrompt(instance.generatedPrompt)
      setPromptAjuste(instance.generatedPrompt)
    } else {
      // Tentar carregar do servidor
      loadCurrentPrompt()
    }
  }, [instance.id])

  const loadCurrentPrompt = async () => {
    try {
      const data = await apiRequest<{ prompt: string | null }>(
        `/workflow-templates/instances/${instance.id}/prompt`
      )
      if (data.prompt) {
        setGeneratedPrompt(data.prompt)
        setPromptAjuste(data.prompt)
      }
    } catch (error) {
      console.error('Erro ao carregar prompt:', error)
    }
  }

  const handleVariableChange = (index: number, value: any) => {
    const newVars = [...variables]
    newVars[index].value = value
    setVariables(newVars)
  }

  const handleCreateOrAdjustPrompt = async () => {
    setLoading(true)
    setError('')

    try {
      const payload: any = {
        type: promptType,
      }

      if (promptType === 'system') {
        // Criar prompt do zero
        if (variables.length === 0) {
          setError('Adicione pelo menos uma variável')
          setLoading(false)
          return
        }
        payload.variables = variables
      } else if (promptType === 'user') {
        // Ajustar prompt existente
        if (!promptAjuste || !promptAjuste.trim()) {
          setError('Prompt para ajustar não pode estar vazio')
          setLoading(false)
          return
        }
        if (!textAjuste || !textAjuste.trim()) {
          setError('Solicitação de ajuste é obrigatória')
          setLoading(false)
          return
        }
        payload.prompt_ajuste = promptAjuste.trim()
        payload.text_ajuste = textAjuste.trim()
      }

      const data = await apiRequest<{ prompt: string; instance: any }>(
        `/workflow-templates/instances/${instance.id}/prompt`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )

      setGeneratedPrompt(data.prompt)
      setPromptAjuste(data.prompt)
      
      // Se era type=user, limpar o text_ajuste após sucesso
      if (promptType === 'user') {
        setTextAjuste('')
      }

      // Callback de sucesso
      if (onSuccess) {
        onSuccess()
      }

      // Mostrar preview automaticamente
      setShowPreview(true)
    } catch (error: any) {
      console.error('Erro ao criar/ajustar prompt:', error)
      setError(
        error.response?.data?.message ||
        error.message ||
        'Erro ao criar/ajustar prompt. Verifique as configurações e tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClearPrompt = async () => {
    if (!confirm('Tem certeza que deseja limpar o prompt gerado?')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      await apiRequest(`/workflow-templates/instances/${instance.id}/prompt`, {
        method: 'DELETE',
      })

      setGeneratedPrompt(null)
      setPromptAjuste('')
      setTextAjuste('')

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Erro ao limpar prompt:', error)
      setError(error.response?.data?.message || error.message || 'Erro ao limpar prompt')
    } finally {
      setLoading(false)
    }
  }

  const canCreateSystem = variables.length > 0 && variables.every(v => v.value || v.value === 0)
  const canAdjust = promptAjuste && promptAjuste.trim() && textAjuste && textAjuste.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-background-subtle/95 backdrop-blur-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-secondary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Configurar Prompt do Agente</h2>
              <p className="text-sm text-text-muted">{instance.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 rounded-2xl border border-white/5 bg-background-muted/60 p-1">
            <button
              onClick={() => {
                setPromptType('system')
                setError('')
                setShowPreview(false)
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                promptType === 'system'
                  ? 'bg-brand-primary/20 text-white shadow-glow'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Wand2 className="h-4 w-4" />
              Criar Prompt
            </button>
            <button
              onClick={() => {
                setPromptType('user')
                setError('')
                setShowPreview(false)
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                promptType === 'user'
                  ? 'bg-brand-primary/20 text-white shadow-glow'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              Ajustar Prompt
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form System */}
          {promptType === 'system' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Variáveis para Gerar o Prompt</h3>
                <div className="space-y-3">
                  {variables.map((variable, index) => (
                    <div key={index} className="rounded-xl border border-white/10 bg-background-muted/40 p-4">
                      <label className="mb-2 block text-xs font-medium text-text-muted">
                        {variable.name}
                      </label>
                      <input
                        type="text"
                        value={variable.value}
                        onChange={(e) => handleVariableChange(index, e.target.value)}
                        placeholder={`Digite o valor para ${variable.name}`}
                        className="w-full rounded-lg border border-white/10 bg-background-subtle/60 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                      />
                    </div>
                  ))}
                  {variables.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 bg-background-muted/40 p-8 text-center text-sm text-text-muted">
                      Nenhuma variável configurada. As variáveis serão obtidas das configurações da automação.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form User */}
          {promptType === 'user' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Prompt Atual para Ajustar</h3>
                <textarea
                  value={promptAjuste}
                  onChange={(e) => setPromptAjuste(e.target.value)}
                  placeholder="Cole ou digite o prompt que deseja ajustar..."
                  rows={8}
                  className="w-full rounded-xl border border-white/10 bg-background-muted/40 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 resize-none"
                />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Solicitação de Ajuste</h3>
                <textarea
                  value={textAjuste}
                  onChange={(e) => setTextAjuste(e.target.value)}
                  placeholder="Ex: 'Torne o prompt mais formal' ou 'Adicione instruções sobre como tratar clientes insatisfeitos'..."
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-background-muted/40 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 resize-none"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Descreva como você deseja ajustar o prompt. Seja específico para melhores resultados.
                </p>
              </div>
            </div>
          )}

          {/* Generated Prompt Preview */}
          {generatedPrompt && (
            <div className="rounded-xl border border-white/10 bg-background-muted/40 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Prompt Gerado</h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-background-subtle/60 px-3 py-1.5 text-xs text-text-muted hover:text-white transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  {showPreview ? 'Ocultar' : 'Visualizar'}
                </button>
              </div>
              {showPreview && (
                <div className="mt-3 rounded-lg border border-white/5 bg-background-subtle/60 p-4">
                  <pre className="whitespace-pre-wrap break-words text-xs text-white font-mono max-h-96 overflow-y-auto">
                    {generatedPrompt}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-background-muted/40 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {generatedPrompt && (
              <button
                onClick={handleClearPrompt}
                disabled={loading}
                className="rounded-lg border border-white/10 bg-background-subtle/60 px-4 py-2 text-sm text-text-muted hover:text-white transition-colors disabled:opacity-50"
              >
                Limpar Prompt
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              disabled={loading}
              className="text-text-muted hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateOrAdjustPrompt}
              disabled={loading || (promptType === 'system' ? !canCreateSystem : !canAdjust)}
              className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {promptType === 'system' ? 'Criando...' : 'Ajustando...'}
                </>
              ) : (
                <>
                  {promptType === 'system' ? (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Criar Prompt
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Ajustar Prompt
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

