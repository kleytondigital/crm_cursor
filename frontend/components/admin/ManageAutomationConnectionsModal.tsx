'use client'

import { useState, useEffect } from 'react'
import { X, Link2, Link2Off, Loader2 } from 'lucide-react'
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
}

interface ManageAutomationConnectionsModalProps {
  instance: WorkflowInstance
  onClose: () => void
  onSuccess?: () => void
}

export default function ManageAutomationConnectionsModal({
  instance,
  onClose,
  onSuccess,
}: ManageAutomationConnectionsModalProps) {
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectedConnections, setConnectedConnections] = useState<Connection[]>([])
  const [availableConnections, setAvailableConnections] = useState<Connection[]>([])

  useEffect(() => {
    loadData()
  }, [instance.id])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Carregar conexões conectadas
      const connected = await apiRequest<Connection[]>(
        `/workflow-templates/instances/${instance.id}/connections`
      )
      setConnectedConnections(connected || [])

      // Carregar todas as conexões disponíveis
      const allConnections = await apiRequest<Connection[]>('/connections')
      const activeConnections = (allConnections || []).filter(
        (conn) => conn.status === 'ACTIVE'
      )
      setAvailableConnections(activeConnections)
    } catch (err: any) {
      console.error('Erro ao carregar conexões:', err)
      setError(err?.message || 'Erro ao carregar conexões')
    } finally {
      setLoading(false)
    }
  }

  const [showWizard, setShowWizard] = useState(false)
  const [wizardConnection, setWizardConnection] = useState<Connection | null>(null)

  const handleConnect = async (connection: Connection) => {
    if (!instance.webhookUrl) {
      setError('A automação não possui webhookUrl configurado')
      return
    }

    // Mostrar wizard de ativação
    setWizardConnection(connection)
    setShowWizard(true)
  }

  const handleDisconnect = async (connectionId: string) => {
    setDisconnecting(connectionId)
    setError(null)
    try {
      await apiRequest(
        `/workflow-templates/instances/${instance.id}/connections/${connectionId}`,
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

  const connectedIds = new Set(connectedConnections.map((c) => c.id))
  const unconnectedConnections = availableConnections.filter(
    (c) => !connectedIds.has(c.id)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background-card p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Gerenciar Conexões</h3>
            <p className="text-sm text-text-muted mt-1">Automação: {instance.name}</p>
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

        {!instance.webhookUrl && (
          <div className="mb-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm text-yellow-400">
            Esta automação não possui webhookUrl configurado. Configure o webhook antes de conectar às conexões.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Conexões Conectadas */}
            <div>
              <h4 className="mb-3 text-lg font-semibold text-white">
                Conexões Conectadas ({connectedConnections.length})
              </h4>
              {connectedConnections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-text-muted">
                  Nenhuma conexão conectada
                </div>
              ) : (
                <div className="space-y-2">
                  {connectedConnections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <p className="font-medium text-white">{connection.name}</p>
                        <p className="text-xs text-text-muted">{connection.sessionName}</p>
                      </div>
                      <Button
                        onClick={() => handleDisconnect(connection.id)}
                        disabled={disconnecting === connection.id}
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        {disconnecting === connection.id ? (
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

            {/* Conexões Disponíveis */}
            <div>
              <h4 className="mb-3 text-lg font-semibold text-white">
                Conexões Disponíveis ({unconnectedConnections.length})
              </h4>
              {unconnectedConnections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-text-muted">
                  Todas as conexões ativas já estão conectadas
                </div>
              ) : (
                <div className="space-y-2">
                  {unconnectedConnections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <p className="font-medium text-white">{connection.name}</p>
                        <p className="text-xs text-text-muted">{connection.sessionName}</p>
                      </div>
                      <Button
                        onClick={() => handleConnect(connection)}
                        disabled={!instance.webhookUrl}
                        size="sm"
                        className="gap-2 bg-brand-primary text-white hover:bg-brand-primary-dark"
                      >
                        <Link2 className="h-4 w-4" />
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
      {showWizard && wizardConnection && (
        <ActivationWizardModal
          instanceId={instance.id}
          connectionId={wizardConnection.id}
          instanceName={instance.name}
          connectionName={wizardConnection.name}
          onClose={() => {
            setShowWizard(false)
            setWizardConnection(null)
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

