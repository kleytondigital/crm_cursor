'use client'

import { useState } from 'react'
import { Instagram, Facebook, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { connectionsAPI } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function SocialConnectionsList() {
  const [disconnectId, setDisconnectId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['social-connections'],
    queryFn: () => connectionsAPI.getSocialConnections(),
  })

  const refreshMutation = useMutation({
    mutationFn: (id: string) => connectionsAPI.refreshSocialToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-connections'] })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => connectionsAPI.disconnectSocial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-connections'] })
      setDisconnectId(null)
    },
  })

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'INSTAGRAM':
        return <Instagram className="h-5 w-5" />
      case 'FACEBOOK':
        return <Facebook className="h-5 w-5" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Inativa
        </Badge>
      )
    }

    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="default" className="gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" />
            Ativa
          </Badge>
        )
      case 'ERROR':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Erro
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            {status}
          </Badge>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-muted">Carregando conexões...</div>
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-background-muted/50 p-6 mb-4">
          <Instagram className="h-8 w-8 text-text-muted" />
        </div>
        <p className="text-text-muted">Nenhuma conexão social configurada</p>
        <p className="text-sm text-text-muted mt-2">
          Conecte suas contas do Instagram ou Facebook para começar
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {connections.map((connection: any) => (
          <div
            key={connection.id}
            className="rounded-xl border border-white/10 bg-background-subtle/80 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="rounded-lg bg-brand-primary/20 p-2">
                  {getProviderIcon(connection.provider)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{connection.name}</h3>
                    {getStatusBadge(connection.status, connection.isActive)}
                  </div>
                  {connection.metadata && (
                    <div className="text-sm text-text-muted space-y-1">
                      {connection.metadata.pageName && (
                        <p>Página: {connection.metadata.pageName}</p>
                      )}
                      {connection.metadata.instagramUsername && (
                        <p>Instagram: @{connection.metadata.instagramUsername}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshMutation.mutate(connection.id)}
                  disabled={refreshMutation.isPending}
                  title="Renovar token"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDisconnectId(connection.id)}
                  title="Desconectar"
                >
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!disconnectId} onOpenChange={(open) => !open && setDisconnectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desconectar Conexão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desconectar esta conexão? Você não receberá mais mensagens desta conta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDisconnectId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => disconnectId && disconnectMutation.mutate(disconnectId)}
              className="bg-rose-500 hover:bg-rose-600"
            >
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

