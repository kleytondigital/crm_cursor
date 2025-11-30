'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building2,
  Link2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'
import { adAccountsAPI, connectionsAPI } from '@/lib/api'
import Image from 'next/image'

type AdAccount = {
  id: string
  adAccountId: string
  name: string
  currency?: string | null
  accountStatus?: string | null
  connectionId: string
  isActive: boolean
  connection?: {
    id: string
    name: string
    provider: string
  }
  createdAt: string
}

type AvailableAdAccount = {
  id: string
  account_id: string
  name: string
  currency: string
  account_status: number
  business?: {
    id: string
    name: string
  }
}

export default function AdAccountsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [mounted, setMounted] = useState(false)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  // Buscar conexões sociais (Instagram/Facebook)
  const { data: socialConnections = [], isLoading: isLoadingConnections } = useQuery({
    queryKey: ['social-connections'],
    queryFn: () => connectionsAPI.getSocialConnections(),
    enabled: mounted && !!token,
  })

  // Filtrar apenas conexões ativas
  const activeSocialConnections = socialConnections.filter(
    (conn: any) => conn.status === 'ACTIVE' && (conn.provider === 'INSTAGRAM' || conn.provider === 'FACEBOOK')
  )

  // Buscar contas de anúncio conectadas
  const { data: connectedAccounts = [], isLoading: isLoadingAccounts, refetch: refetchAccounts } = useQuery<AdAccount[]>({
    queryKey: ['ad-accounts'],
    queryFn: () => adAccountsAPI.listConnected(),
    enabled: mounted && !!token,
  })

  // Buscar contas disponíveis para conexão
  const { data: availableAccounts = [], isLoading: isLoadingAvailable, refetch: refetchAvailable } = useQuery<AvailableAdAccount[]>({
    queryKey: ['ad-accounts-available', selectedConnectionId],
    queryFn: () => adAccountsAPI.listAvailable(selectedConnectionId),
    enabled: mounted && !!token && !!selectedConnectionId && connectDialogOpen,
  })

  const connectMutation = useMutation({
    mutationFn: (data: { connectionId: string; adAccountId: string }) =>
      adAccountsAPI.connect(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['ad-accounts-available'] })
      setConnectDialogOpen(false)
      setSelectedConnectionId('')
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => adAccountsAPI.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-accounts'] })
    },
  })

  const handleOpenConnectDialog = () => {
    if (activeSocialConnections.length === 0) {
      alert('Você precisa ter pelo menos uma conexão social (Instagram ou Facebook) ativa para conectar contas de anúncio.')
      return
    }
    setSelectedConnectionId(activeSocialConnections[0]?.id || '')
    setConnectDialogOpen(true)
  }

  const handleConnect = (adAccountId: string) => {
    if (!selectedConnectionId) return
    connectMutation.mutate({
      connectionId: selectedConnectionId,
      adAccountId,
    })
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Contas de Anúncio Meta
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                Gerencie suas contas de anúncio vinculadas ao CRM
              </p>
            </div>
            <Button
              onClick={handleOpenConnectDialog}
              disabled={isLoadingConnections || activeSocialConnections.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Conectar Conta
            </Button>
          </div>

          {/* Contas Conectadas */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Contas Conectadas</h2>

            {isLoadingAccounts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            ) : connectedAccounts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="mb-4 h-12 w-12 text-text-muted" />
                  <p className="text-center text-text-muted">
                    Nenhuma conta de anúncio conectada. Clique em "Conectar Conta" para começar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {connectedAccounts.map((account) => (
                  <Card key={account.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{account.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {account.adAccountId}
                          </CardDescription>
                        </div>
                        {account.isActive ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {account.connection && (
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                          <Link2 className="h-4 w-4" />
                          <span>{account.connection.name}</span>
                          {account.connection.provider === 'INSTAGRAM' && (
                            <Image
                              src="/instagram.png"
                              alt="Instagram"
                              width={16}
                              height={16}
                              className="object-contain"
                            />
                          )}
                          {account.connection.provider === 'FACEBOOK' && (
                            <Image
                              src="/facebook.png"
                              alt="Facebook"
                              width={16}
                              height={16}
                              className="object-contain"
                            />
                          )}
                        </div>
                      )}
                      {account.currency && (
                        <div className="text-sm text-text-muted">
                          <span className="font-medium">Moeda:</span> {account.currency}
                        </div>
                      )}
                      {account.accountStatus && (
                        <Badge variant="outline" className="text-xs">
                          Status: {account.accountStatus}
                        </Badge>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnectMutation.mutate(account.id)}
                        disabled={disconnectMutation.isPending}
                      >
                        {disconnectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Desconectar
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Dialog para Conectar Conta */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conectar Conta de Anúncio</DialogTitle>
            <DialogDescription>
              Selecione uma conexão social e escolha a conta de anúncio que deseja vincular.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selecionar Conexão */}
            {activeSocialConnections.length > 1 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Conexão Social
                </label>
                <select
                  value={selectedConnectionId}
                  onChange={(e) => {
                    setSelectedConnectionId(e.target.value)
                    queryClient.invalidateQueries({ queryKey: ['ad-accounts-available'] })
                  }}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                >
                  {activeSocialConnections.map((conn: any) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name} ({conn.provider})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Lista de Contas Disponíveis */}
            {selectedConnectionId && (
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Contas Disponíveis
                </label>
                {isLoadingAvailable ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                ) : availableAccounts.length === 0 ? (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center text-text-muted">
                    Nenhuma conta de anúncio disponível para esta conexão.
                  </div>
                ) : (
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {availableAccounts.map((account) => (
                      <Card key={account.id} className="cursor-pointer hover:bg-white/5" onClick={() => handleConnect(account.id)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-white">{account.name}</p>
                              <p className="text-sm text-text-muted">{account.id}</p>
                              {account.currency && (
                                <p className="text-xs text-text-muted">
                                  Moeda: {account.currency}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              disabled={connectMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleConnect(account.id)
                              }}
                            >
                              {connectMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Conectar'
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConnectDialogOpen(false)
                setSelectedConnectionId('')
              }}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
      <BottomNavigation />
    </div>
  )
}

