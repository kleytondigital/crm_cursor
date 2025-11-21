'use client'

import { useState, useEffect } from 'react'
import { X, Link2, Link2Off, Loader2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'
import ActivationWizardModal from './ActivationWizardModal'

interface Connection {
  id: string
  name: string
  sessionName: string
  status: string
}

interface WorkflowInstance {
  id: string
  name: string
  webhookUrl?: string
  isActive: boolean
  template: {
    id: string
    name: string
    category?: string
    icon?: string
  }
  aiAgent?: {
    id: string
    name: string
  }
}

interface ManageConnectionAutomationsModalProps {
  connection: Connection
  onClose: () => void
  onSuccess?: () => void
}

export default function ManageConnectionAutomationsModal({
  connection,
  onClose,
  onSuccess,
}: ManageConnectionAutomationsModalProps) {
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectedInstances, setConnectedInstances] = useState<WorkflowInstance[]>([])
  const [availableInstances, setAvailableInstances] = useState<WorkflowInstance[]>([])
  const [showWizard, setShowWizard] = useState(false)
  const [wizardInstance, setWizardInstance] = useState<WorkflowInstance | null>(null)

  useEffect(() => {
    loadData()
  }, [connection.id])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Carregar automações conectadas
      const connected = await apiRequest<WorkflowInstance[]>(
        `/connections/${connection.id}/automations`
      )
      setConnectedInstances(connected || [])

      // Carregar todas as automações disponíveis
      const allInstances = await apiRequest<WorkflowInstance[]>(
        '/workflow-templates/instances/all'
      )
      // Filtrar apenas as que têm webhookUrl
      const instancesWithWebhook = (allInstances || []).filter(
        (inst) => inst.webhookUrl
      )
      setAvailableInstances(instancesWithWebhook)
    } catch (err: any) {
      console.error('Erro ao carregar automações:', err)
      setError(err?.message || 'Erro ao carregar automações')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (instance: WorkflowInstance) => {
    if (!instance.isActive) {
      setError('A automação precisa estar ativa para ser conectada')
      return
    }

    // Mostrar wizard de ativação
    setWizardInstance(instance)
    setShowWizard(true)
  }

  const handleDisconnect = async (instanceId: string) => {
    setDisconnecting(instanceId)
    setError(null)
    try {
      await apiRequest(
        `/workflow-templates/instances/${instanceId}/connections/${connection.id}`,
        {
          method: 'DELETE',
        }
      )
      await loadData()
      onSuccess?.()
    } catch (err: any) {
      console.error('Erro ao desconectar:', err)
      setError(err?.message || 'Erro ao desconectar automação da conexão')
    } finally {
      setDisconnecting(null)
    }
  }

  const connectedIds = new Set(connectedInstances.map((i) => i.id))
  const unconnectedInstances = availableInstances.filter(
    (i) => !connectedIds.has(i.id)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background-card p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Gerenciar Automações</h3>
            <p className="text-sm text-text-muted mt-1">Conexão: {connection.name}</p>
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Automações Conectadas */}
            <div>
              <h4 className="mb-3 text-lg font-semibold text-white">
                Automações Conectadas ({connectedInstances.length})
              </h4>
              {connectedInstances.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-text-muted">
                  Nenhuma automação conectada
                </div>
              ) : (
                <div className="space-y-2">
                  {connectedInstances.map((instance) => (
                    <div
                      key={instance.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          instance.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-text-muted'
                        }`}>
                          <Bot className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{instance.name}</p>
                          <p className="text-xs text-text-muted">
                            {instance.template.category || 'Automação'} •{' '}
                            {instance.isActive ? 'Ativa' : 'Inativa'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDisconnect(instance.id)}
                        disabled={disconnecting === instance.id}
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        {disconnecting === instance.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2Off className="h-4 w-4" />
                        )}
                        Desconectar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Automações Disponíveis */}
            <div>
              <h4 className="mb-3 text-lg font-semibold text-white">
                Automações Disponíveis ({unconnectedInstances.length})
              </h4>
              {unconnectedInstances.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-text-muted">
                  Todas as automações com webhook já estão conectadas
                </div>
              ) : (
                <div className="space-y-2">
                  {unconnectedInstances.map((instance) => (
                    <div
                      key={instance.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          instance.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-text-muted'
                        }`}>
                          <Bot className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{instance.name}</p>
                          <p className="text-xs text-text-muted">
                            {instance.template.category || 'Automação'} •{' '}
                            {instance.isActive ? 'Ativa' : 'Inativa'}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleConnect(instance)}
                        disabled={connecting === instance.id || !instance.isActive}
                        size="sm"
                        className="gap-2 bg-brand-primary text-white hover:bg-brand-primary-dark"
                        title={!instance.isActive ? 'A automação precisa estar ativa' : ''}
                      >
                        {connecting === instance.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="h-4 w-4" />
                        )}
                        Conectar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="ghost">
            Fechar
          </Button>
        </div>
      </div>

      {/* Wizard de Ativação */}
      {showWizard && wizardInstance && (
        <ActivationWizardModal
          instanceId={wizardInstance.id}
          connectionId={connection.id}
          instanceName={wizardInstance.name}
          connectionName={connection.name}
          onClose={() => {
            setShowWizard(false)
            setWizardInstance(null)
            loadData()
          }}
          onSuccess={() => {
            loadData()
            onSuccess?.()
          }}
        />
      )}
    </div>
  )
}

