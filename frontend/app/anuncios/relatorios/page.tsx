'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, parseISO } from 'date-fns'
import Image from 'next/image'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'
import {
  DollarSign,
  Eye,
  MousePointerClick,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  RefreshCw,
  ArrowLeft,
  Rocket,
  Megaphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { adReportsAPI, adAccountsAPI, connectionsAPI } from '@/lib/api'
import MetaAdsDashboardHeader from '@/components/meta-ads/MetaAdsDashboardHeader'
import MetaAdsDashboardContent from '@/components/meta-ads/MetaAdsDashboardContent'

type ViewMode = 'connections' | 'accounts' | 'reports'

export default function AdReportsPage() {
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('connections')
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('')
  const [selectedConnectionName, setSelectedConnectionName] = useState<string>('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedAccountName, setSelectedAccountName] = useState<string>('')
  const [dateStart, setDateStart] = useState<string>(
    format(subDays(new Date(), 7), 'yyyy-MM-dd')
  )
  const [dateEnd, setDateEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    setMounted(true)
  }, [])

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  // Buscar conexões Meta Ads disponíveis
  const { data: connections = [], isLoading: loadingConnections } = useQuery({
    queryKey: ['meta-ads-connections'],
    queryFn: () => connectionsAPI.getMetaAdsConnections(),
    enabled: mounted && !!token,
  })

  // Buscar contas de anúncio da conexão selecionada (incluindo conectadas)
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['ad-accounts', selectedConnectionId],
    queryFn: () => adAccountsAPI.listAvailable(selectedConnectionId, true),
    enabled: mounted && !!token && !!selectedConnectionId && viewMode !== 'connections',
  })

  // Buscar métricas via webhook gestor
  const {
    data: metricsData,
    isLoading: loadingMetrics,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['ad-reports-metrics', selectedConnectionId, selectedAccountId, dateStart, dateEnd],
    queryFn: () =>
      adReportsAPI.listMetricas({
        connectionId: selectedConnectionId,
        adAccountId: selectedAccountId,
        dateStart,
        dateEnd,
      }),
    enabled:
      mounted &&
      !!token &&
      !!selectedConnectionId &&
      !!selectedAccountId &&
      viewMode === 'reports',
  })

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  // Formatar dados para o dashboard
  const metrics = metricsData?.metrics || {
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    cpc: 0,
    cpm: 0,
    ctr: 0,
    cpa: 0,
    messages: 0,
    costPerMessage: 0,
    conversions: 0,
    conversionRate: 0,
  }

  const timeline = metricsData?.timeline || []
  const breakdown = metricsData?.adsBreakdown || []

  // Handler para selecionar conexão
  const handleSelectConnection = (connectionId: string, connectionName: string) => {
    setSelectedConnectionId(connectionId)
    setSelectedConnectionName(connectionName)
    setSelectedAccountId('')
    setSelectedAccountName('')
    setViewMode('accounts')
  }

  // Handler para selecionar conta
  const handleSelectAccount = (accountId: string, accountName: string) => {
    setSelectedAccountId(accountId)
    setSelectedAccountName(accountName)
    setViewMode('reports')
  }

  // Handler para voltar
  const handleBack = () => {
    if (viewMode === 'reports') {
      setViewMode('accounts')
      setSelectedAccountId('')
      setSelectedAccountName('')
    } else if (viewMode === 'accounts') {
      setViewMode('connections')
      setSelectedConnectionId('')
      setSelectedConnectionName('')
      setSelectedAccountId('')
      setSelectedAccountName('')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {viewMode !== 'connections' && (
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  Relatórios Meta Ads
                </h1>
                <p className="mt-1 text-sm text-text-muted">
                  {viewMode === 'connections' && 'Selecione uma conexão Meta para começar'}
                  {viewMode === 'accounts' && `Conexão: ${selectedConnectionName}`}
                  {viewMode === 'reports' &&
                    `Análise de desempenho - ${selectedConnectionName} > ${selectedAccountName}`}
                </p>
              </div>
            </div>
            {viewMode === 'reports' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => refetchMetrics()} disabled={loadingMetrics}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingMetrics ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            )}
          </div>

          {/* View: Seleção de Conexões */}
          {viewMode === 'connections' && (
            <div>
              {loadingConnections ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : connections.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <XCircle className="mb-4 h-12 w-12 text-text-muted" />
                    <p className="text-center text-text-muted">
                      Nenhuma conexão Meta Ads disponível. Configure uma conexão nas configurações.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connections.map((conn: any) => (
                    <Card
                      key={conn.id}
                      className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
                      onClick={() => handleSelectConnection(conn.id, conn.name)}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                              <Image
                                src="/meta.png"
                                alt="Meta"
                                fill
                                className="object-contain"
                              />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{conn.name}</CardTitle>
                              <CardDescription className="text-xs">Meta API Connection</CardDescription>
                            </div>
                          </div>
                          {conn.status === 'ACTIVE' ? (
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-500" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-text-muted">Status:</span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              conn.status === 'ACTIVE'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-red-500/20 text-red-500'
                            }`}
                          >
                            {conn.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View: Seleção de Contas */}
          {viewMode === 'accounts' && (
            <div>
              {loadingAccounts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : accounts.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <XCircle className="mb-4 h-12 w-12 text-text-muted" />
                    <p className="text-center text-text-muted">
                      Nenhuma conta de anúncio disponível para esta conexão.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {accounts.map((account: any) => (
                    <Card
                      key={account.id}
                      className="cursor-pointer transition-all hover:border-primary hover:shadow-lg"
                      onClick={() => handleSelectAccount(account.id, account.name || account.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg">{account.name || account.id}</CardTitle>
                        <CardDescription className="text-xs">
                          {account.id}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {account.currency && (
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-sm text-text-muted">Moeda:</span>
                            <span className="text-sm font-semibold text-white">{account.currency}</span>
                          </div>
                        )}
                        {account.business && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-text-muted">Empresa:</span>
                            <span className="text-sm font-semibold text-white">
                              {account.business.name}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View: Dashboard de Relatórios */}
          {viewMode === 'reports' && (
            <>
              {/* Header com filtros */}
              <MetaAdsDashboardHeader
                dateStart={dateStart}
                dateEnd={dateEnd}
                onDateChange={(start, end) => {
                  setDateStart(start)
                  setDateEnd(end)
                }}
                onReset={() => {
                  setDateStart(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
                  setDateEnd(format(new Date(), 'yyyy-MM-dd'))
                }}
              />

              <MetaAdsDashboardContent
                metrics={metrics}
                timeline={timeline}
                breakdown={breakdown}
                loading={loadingMetrics}
                error={metricsError}
                onRetry={() => refetchMetrics()}
              />
            </>
          )}
        </div>
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  )
}