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
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { adReportsAPI, adAccountsAPI, connectionsAPI } from '@/lib/api'

const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6']

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
  const funnel = {
    impressions: metrics.impressions || 0,
    clicks: metrics.clicks || 0,
    messages: metrics.messages || 0,
    conversions: metrics.conversions || 0,
  }
  const breakdown = metricsData?.adsBreakdown || []

  // Preparar dados para gráficos
  const funnelData = [
    { name: 'Impressões', value: funnel.impressions, color: COLORS[0] },
    { name: 'Cliques', value: funnel.clicks, color: COLORS[1] },
    { name: 'Mensagens', value: funnel.messages, color: COLORS[2] },
    { name: 'Conversões', value: funnel.conversions, color: COLORS[3] },
  ]

  const timelineChartData = timeline.map((item: any) => ({
    date: format(parseISO(item.date), 'dd/MM'),
    Investimento: item.spend || 0,
    Impressões: item.impressions || 0,
    Cliques: item.clicks || 0,
    Mensagens: item.messages || 0,
  }))

  const breakdownChartData = breakdown.slice(0, 10).map((item: any) => ({
    name: item.name?.length > 20 ? item.name.substring(0, 20) + '...' : item.name || 'Sem nome',
    Investimento: item.spend || 0,
    Impressões: item.impressions || 0,
    Cliques: item.clicks || 0,
    Mensagens: item.messages || 0,
  }))

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
              {/* Filtros de Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Período
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white">Data Fim</label>
                      <input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {loadingMetrics ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              ) : metricsError ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <XCircle className="mb-4 h-12 w-12 text-red-500" />
                    <p className="text-center text-red-500">
                      Erro ao carregar métricas. Tente novamente.
                    </p>
                    <Button onClick={() => refetchMetrics()} className="mt-4">
                      Tentar Novamente
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Métricas Principais */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-text-muted">
                          Investimento
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-text-muted" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          R$ {metrics.spend.toFixed(2).replace('.', ',')}
                        </div>
                        <p className="text-xs text-text-muted">
                          CPM: R$ {metrics.cpm.toFixed(2).replace('.', ',')}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-text-muted">
                          Impressões
                        </CardTitle>
                        <Eye className="h-4 w-4 text-text-muted" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          {metrics.impressions.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-xs text-text-muted">
                          Alcance: {metrics.reach.toLocaleString('pt-BR')}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-text-muted">Cliques</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-text-muted" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          {metrics.clicks.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-xs text-text-muted">
                          CTR: {(metrics.ctr * 100).toFixed(2)}% | CPC: R${' '}
                          {metrics.cpc.toFixed(2).replace('.', ',')}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-text-muted">Mensagens</CardTitle>
                        <MessageSquare className="h-4 w-4 text-text-muted" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          {metrics.messages.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-xs text-text-muted">
                          Custo por mensagem: R${' '}
                          {metrics.costPerMessage.toFixed(2).replace('.', ',')}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Métricas Secundárias */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium text-text-muted">Conversões</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">
                          {metrics.conversions.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-xs text-text-muted">
                          Taxa: {(metrics.conversionRate * 100).toFixed(2)}% | CPA: R${' '}
                          {metrics.cpa.toFixed(2).replace('.', ',')}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium text-text-muted">
                          Funil de Conversão
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={funnelData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="value" fill="#8B5CF6">
                              {funnelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Timeline */}
                  {timeline.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Evolução Temporal</CardTitle>
                        <CardDescription>
                          Métricas ao longo do tempo (investimento, impressões, cliques, mensagens)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                          <LineChart data={timelineChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="date" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                              }}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="Investimento"
                              stroke="#8B5CF6"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="Impressões"
                              stroke="#EC4899"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="Cliques"
                              stroke="#10B981"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="Mensagens"
                              stroke="#F59E0B"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Breakdown por Anúncio */}
                  {breakdown.length > 0 && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle>Desempenho por Anúncio</CardTitle>
                          <CardDescription>Top 10 anúncios com melhor desempenho</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={breakdownChartData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis type="number" stroke="#9CA3AF" />
                              <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={150} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1F2937',
                                  border: '1px solid #374151',
                                  borderRadius: '8px',
                                }}
                              />
                              <Legend />
                              <Bar dataKey="Investimento" fill="#8B5CF6" />
                              <Bar dataKey="Impressões" fill="#EC4899" />
                              <Bar dataKey="Cliques" fill="#10B981" />
                              <Bar dataKey="Mensagens" fill="#F59E0B" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Tabela de Breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Detalhamento por Anúncio</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-white/10">
                                  <th className="px-4 py-2 text-left text-text-muted">Anúncio</th>
                                  <th className="px-4 py-2 text-right text-text-muted">Investimento</th>
                                  <th className="px-4 py-2 text-right text-text-muted">Impressões</th>
                                  <th className="px-4 py-2 text-right text-text-muted">Cliques</th>
                                  <th className="px-4 py-2 text-right text-text-muted">CTR</th>
                                  <th className="px-4 py-2 text-right text-text-muted">Mensagens</th>
                                  <th className="px-4 py-2 text-right text-text-muted">CPM</th>
                                  <th className="px-4 py-2 text-right text-text-muted">CPC</th>
                                  <th className="px-4 py-2 text-right text-text-muted">CPA</th>
                                </tr>
                              </thead>
                              <tbody>
                                {breakdown.map((item: any, index: number) => (
                                  <tr
                                    key={index}
                                    className="border-b border-white/5 hover:bg-white/5"
                                  >
                                    <td className="px-4 py-2 text-white">{item.name || 'Sem nome'}</td>
                                    <td className="px-4 py-2 text-right text-white">
                                      R$ {(item.spend || 0).toFixed(2).replace('.', ',')}
                                    </td>
                                    <td className="px-4 py-2 text-right text-white">
                                      {(item.impressions || 0).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-2 text-right text-white">
                                      {(item.clicks || 0).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-2 text-right text-white">
                                      {((item.ctr || 0) * 100).toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-2 text-right text-white">
                                      {(item.messages || 0).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-4 py-2 text-right text-white">
                                      R$ {(item.cpm || 0).toFixed(2).replace('.', ',')}
                                    </td>
                                    <td className="px-4 py-2 text-right text-white">
                                      R$ {(item.cpc || 0).toFixed(2).replace('.', ',')}
                                    </td>
                                    <td className="px-4 py-2 text-right text-white">
                                      R$ {(item.cpa || 0).toFixed(2).replace('.', ',')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  )
}