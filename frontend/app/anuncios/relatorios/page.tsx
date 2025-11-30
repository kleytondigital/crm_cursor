'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { format, subDays, parseISO } from 'date-fns'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'
import {
  DollarSign,
  Eye,
  Users,
  MousePointerClick,
  MessageSquare,
  Target,
  TrendingUp,
  Loader2,
  Calendar,
  Filter,
  RefreshCw,
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
import { adReportsAPI, adAccountsAPI } from '@/lib/api'

const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6']

export default function AdReportsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [dateStart, setDateStart] = useState<string>(
    format(subDays(new Date(), 7), 'yyyy-MM-dd')
  )
  const [dateEnd, setDateEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    setMounted(true)
  }, [])

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  // Buscar contas conectadas
  const { data: accounts = [] } = useQuery({
    queryKey: ['ad-accounts'],
    queryFn: () => adAccountsAPI.listConnected(),
    enabled: mounted && !!token,
  })

  // Selecionar primeira conta se disponível
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId((accounts[0] as any).adAccountId)
    }
  }, [accounts, selectedAccountId])

  // Buscar dados do dashboard
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['ad-reports-dashboard', selectedAccountId, dateStart, dateEnd],
    queryFn: () =>
      adReportsAPI.getDashboard({
        adAccountId: selectedAccountId,
        dateStart,
        dateEnd,
      }),
    enabled: mounted && !!token && !!selectedAccountId,
  })

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  const metrics = dashboardData?.metrics || {
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

  const timeline = dashboardData?.timeline || []
  const funnel = dashboardData?.funnel || {
    impressions: 0,
    clicks: 0,
    messages: 0,
    conversions: 0,
  }
  const breakdown = dashboardData?.breakdown || []

  // Preparar dados para gráficos
  const funnelData = [
    { name: 'Impressões', value: funnel.impressions, color: COLORS[0] },
    { name: 'Cliques', value: funnel.clicks, color: COLORS[1] },
    { name: 'Mensagens', value: funnel.messages, color: COLORS[2] },
    { name: 'Conversões', value: funnel.conversions, color: COLORS[3] },
  ]

  const timelineChartData = timeline.map((item: any) => ({
    date: format(parseISO(item.date), 'dd/MM'),
    Investimento: item.spend,
    Impressões: item.impressions,
    Cliques: item.clicks,
    Mensagens: item.messages,
  }))

  const breakdownChartData = breakdown.slice(0, 10).map((item: any) => ({
    name: item.adName.length > 20 ? item.adName.substring(0, 20) + '...' : item.adName,
    Investimento: item.spend,
    Impressões: item.impressions,
    Cliques: item.clicks,
    Mensagens: item.messages,
  }))

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                Relatórios Meta Ads
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                Análise de desempenho das suas campanhas de anúncios
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">
                    Conta de Anúncio
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  >
                    {accounts.length === 0 ? (
                      <option value="">Nenhuma conta conectada</option>
                    ) : (
                      accounts.map((account: any) => (
                        <option key={account.id} value={account.adAccountId}>
                          {account.name} ({account.adAccountId})
                        </option>
                      ))
                    )}
                  </select>
                </div>
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
                  <label className="mb-2 block text-sm font-medium text-white">
                    Data Fim
                  </label>
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

          {!selectedAccountId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="mb-4 h-12 w-12 text-text-muted" />
                <p className="text-center text-text-muted">
                  Selecione uma conta de anúncio para visualizar os relatórios.
                </p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-center text-red-500">
                  Erro ao carregar dados. Tente novamente.
                </p>
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
                    <CardTitle className="text-sm font-medium text-text-muted">
                      Cliques
                    </CardTitle>
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
                    <CardTitle className="text-sm font-medium text-text-muted">
                      Mensagens
                    </CardTitle>
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
                    <CardTitle className="text-sm font-medium text-text-muted">
                      Conversões
                    </CardTitle>
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
                <Card>
                  <CardHeader>
                    <CardTitle>Desempenho por Anúncio</CardTitle>
                    <CardDescription>
                      Top 10 anúncios com melhor desempenho
                    </CardDescription>
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
              )}

              {/* Tabela de Breakdown */}
              {breakdown.length > 0 && (
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
                              <td className="px-4 py-2 text-white">{item.adName}</td>
                              <td className="px-4 py-2 text-right text-white">
                                R$ {item.spend.toFixed(2).replace('.', ',')}
                              </td>
                              <td className="px-4 py-2 text-right text-white">
                                {item.impressions.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-4 py-2 text-right text-white">
                                {item.clicks.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-4 py-2 text-right text-white">
                                {(item.ctr * 100).toFixed(2)}%
                              </td>
                              <td className="px-4 py-2 text-right text-white">
                                {item.messages.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-4 py-2 text-right text-white">
                                R$ {item.cpm.toFixed(2).replace('.', ',')}
                              </td>
                              <td className="px-4 py-2 text-right text-white">
                                R$ {item.cpc.toFixed(2).replace('.', ',')}
                              </td>
                              <td className="px-4 py-2 text-right text-white">
                                R$ {item.cpa.toFixed(2).replace('.', ',')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
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

