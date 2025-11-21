'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'

interface ActivationStep {
  step: number
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  details?: any
}

interface ActivationWizardModalProps {
  instanceId: string
  connectionId: string
  instanceName: string
  connectionName: string
  onClose: () => void
  onSuccess?: () => void
}

export default function ActivationWizardModal({
  instanceId,
  connectionId,
  instanceName,
  connectionName,
  onClose,
  onSuccess,
}: ActivationWizardModalProps) {
  const [loading, setLoading] = useState(true)
  const [steps, setSteps] = useState<ActivationStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    startActivation()
  }, [])

  const startActivation = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await apiRequest<{
        success: boolean
        steps: ActivationStep[]
        error?: string
      }>(
        `/workflow-templates/instances/${instanceId}/connections/${connectionId}/wizard`,
        {
          method: 'POST',
        }
      )

      setSteps(result.steps || [])
      setSuccess(result.success || false)

      if (!result.success && result.error) {
        setError(result.error)
      } else if (result.success) {
        onSuccess?.()
      }
    } catch (err: any) {
      console.error('Erro ao ativar automação:', err)
      setError(err?.message || 'Erro ao conectar automação')
      
      // Criar steps de erro caso não tenha retornado
      if (steps.length === 0) {
        setSteps([
          {
            step: 1,
            name: 'Erro na conexão',
            status: 'error',
            message: err?.message || 'Erro desconhecido ao conectar automação',
          },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  const getStepIcon = (step: ActivationStep) => {
    switch (step.status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-brand-primary" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-white/20" />
    }
  }

  const getStepColor = (step: ActivationStep) => {
    switch (step.status) {
      case 'success':
        return 'border-green-500/50 bg-green-500/10'
      case 'error':
        return 'border-red-500/50 bg-red-500/10'
      case 'running':
        return 'border-brand-primary/50 bg-brand-primary/10'
      default:
        return 'border-white/10 bg-white/5'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background-card p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Ativar Automação</h3>
            <p className="text-sm text-text-muted mt-1">
              Conectando "{instanceName}" à "{connectionName}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-muted hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Erro geral */}
        {error && !loading && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-400 mb-1">Erro na Ativação</p>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sucesso */}
        {success && !loading && (
          <div className="mb-6 rounded-xl bg-green-500/10 border border-green-500/20 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-green-400 mb-1">Ativação Concluída!</p>
                <p className="text-sm text-green-300">
                  A automação foi conectada com sucesso à conexão.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-4">
          {steps.length > 0 ? (
            steps.map((step, index) => (
              <div
                key={step.step}
                className={`rounded-xl border p-4 transition-all ${getStepColor(step)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">{getStepIcon(step)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white">
                        {step.step}. {step.name}
                      </p>
                    </div>
                    {step.message && (
                      <p
                        className={`text-sm ${
                          step.status === 'error'
                            ? 'text-red-300'
                            : step.status === 'success'
                            ? 'text-green-300'
                            : 'text-text-muted'
                        }`}
                      >
                        {step.message}
                      </p>
                    )}
                    {step.details && step.status === 'success' && (
                      <div className="mt-2 rounded-lg bg-black/20 p-2 text-xs text-text-muted">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(step.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="mt-6 flex justify-end gap-3">
          {error && (
            <Button
              onClick={startActivation}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              Tentar Novamente
            </Button>
          )}
          <Button onClick={onClose} variant="ghost">
            {success ? 'Fechar' : 'Cancelar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

