'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'
import MetricCard from '@/components/reports/MetricCard'
import ReportsFilters from '@/components/reports/ReportsFilters'
import DetailedTable from '@/components/reports/DetailedTable'
import PeriodComparison from '@/components/reports/PeriodComparison'
import AdditionalCharts from '@/components/reports/AdditionalCharts'
import CustomExportModal from '@/components/reports/CustomExportModal'
import SavedFilters from '@/components/reports/SavedFilters'
import {
  Users,
  TrendingUp,
  MessageSquare,
  Clock,
  Target,
  BarChart3,
  Download,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { reportsAPI, ReportsFilter } from '@/lib/api/reports'
import { schedulerAPI, usersAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6']

export default function ReportsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReportsFilter>({})
  const [overview, setOverview] = useState<any>(null)
  const [leadsData, setLeadsData] = useState<any>(null)
  const [conversionData, setConversionData] = useState<any>(null)
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [campaignsData, setCampaignsData] = useState<any>(null)
  const [journeyData, setJourneyData] = useState<any>(null)
  const [messagesData, setMessagesData] = useState<any>(null)
  const [scheduledData, setScheduledData] = useState<any>(null)
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([])
  
  // Estados para tabelas detalhadas
  const [leadsDetail, setLeadsDetail] = useState<any>(null)
  const [attendancesDetail, setAttendancesDetail] = useState<any>(null)
  const [messagesDetail, setMessagesDetail] = useState<any>(null)
  const [leadsPage, setLeadsPage] = useState(1)
  const [attendancesPage, setAttendancesPage] = useState(1)
  const [messagesPage, setMessagesPage] = useState(1)
  const [activeTable, setActiveTable] = useState<'leads' | 'attendances' | 'messages' | null>(null)
  const [showCustomExport, setShowCustomExport] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token) {
      router.push('/login')
      return
    }

    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.role === 'SUPER_ADMIN') {
          router.push('/saas')
          return
        }
        // Apenas ADMIN e MANAGER podem acessar
        if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
          router.push('/conversas')
          return
        }
      } catch (e) {
        console.error('Erro ao parsear usuário:', e)
      }
    }
  }, [router])

  useEffect(() => {
    if (mounted) {
      loadData()
      loadUsersAndCampaigns()
    }
  }, [filters, mounted])

  const loadUsersAndCampaigns = async () => {
    try {
      const [usersRes, campaignsRes] = await Promise.all([
        usersAPI.getAll().catch(() => []),
        schedulerAPI.getCampaigns().catch(() => []),
      ])
      
      if (Array.isArray(usersRes)) {
        setUsers(usersRes.map((u: any) => ({ id: u.id, name: u.name || u.email || 'Sem nome' })))
      }
      
      if (Array.isArray(campaignsRes)) {
        setCampaigns(campaignsRes.map((c: any) => ({ id: c.id, name: c.name || c.title || 'Sem nome' })))
      }
    } catch (error) {
      console.error('Erro ao carregar usuários e campanhas:', error)
    }
  }

  const loadLeadsDetail = async (page: number = 1) => {
    try {
      const { period, ...filtersWithoutPeriod } = filters
      const data = await reportsAPI.getLeadsDetail(filtersWithoutPeriod, page, 20)
      setLeadsDetail(data)
      setLeadsPage(page)
    } catch (error) {
      console.error('Erro ao carregar leads detalhados:', error)
    }
  }

  const loadAttendancesDetail = async (page: number = 1) => {
    try {
      const { period, ...filtersWithoutPeriod } = filters
      const data = await reportsAPI.getAttendancesDetail(filtersWithoutPeriod, page, 20)
      setAttendancesDetail(data)
      setAttendancesPage(page)
    } catch (error) {
      console.error('Erro ao carregar atendimentos detalhados:', error)
    }
  }

  const loadMessagesDetail = async (page: number = 1) => {
    try {
      const { period, ...filtersWithoutPeriod } = filters
      const data = await reportsAPI.getMessagesDetail(filtersWithoutPeriod, page, 20)
      setMessagesDetail(data)
      setMessagesPage(page)
    } catch (error) {
      console.error('Erro ao carregar mensagens detalhadas:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Carregando dados com filtros:', filters)
      
      // Remover period do filtro antes de enviar
      const { period, ...filtersWithoutPeriod } = filters
      const periodForLeads = period || 'day'
      
      const [
        overviewRes,
        leadsRes,
        conversionRes,
        attendanceRes,
        campaignsRes,
        journeyRes,
        messagesRes,
        scheduledRes,
      ] = await Promise.all([
        reportsAPI.getOverview(filtersWithoutPeriod).catch(err => {
          console.error('Erro ao carregar overview:', err)
          setError(err?.message || 'Erro ao carregar métricas gerais')
          return null
        }),
        reportsAPI.getLeads(filtersWithoutPeriod, periodForLeads).catch(err => {
          console.error('Erro ao carregar leads:', err)
          return null
        }),
        reportsAPI.getConversion(filtersWithoutPeriod).catch(err => {
          console.error('Erro ao carregar conversão:', err)
          return null
        }),
        reportsAPI.getAttendance(filtersWithoutPeriod).catch(err => {
          console.error('Erro ao carregar atendimento:', err)
          return null
        }),
        reportsAPI.getCampaigns(filtersWithoutPeriod).catch(err => {
          console.error('Erro ao carregar campanhas:', err)
          return null
        }),
        reportsAPI.getJourney(filtersWithoutPeriod).catch(err => {
          console.error('Erro ao carregar jornada:', err)
          return null
        }),
        reportsAPI.getMessages(filtersWithoutPeriod).catch(err => {
          console.error('Erro ao carregar mensagens:', err)
          return null
        }),
        reportsAPI.getScheduled(filtersWithoutPeriod).catch(err => {
          console.error('Erro ao carregar agendamentos:', err)
          return null
        }),
      ])

      console.log('Dados carregados:', {
        overviewRes,
        leadsRes,
        conversionRes,
        attendanceRes,
        campaignsRes,
        journeyRes,
        messagesRes,
        scheduledRes,
      })

      setOverview(overviewRes)
      setLeadsData(leadsRes)
      setConversionData(conversionRes)
      setAttendanceData(attendanceRes)
      setCampaignsData(campaignsRes)
      setJourneyData(journeyRes)
      setMessagesData(messagesRes)
      setScheduledData(scheduledRes)
    } catch (error: any) {
      console.error('Erro ao carregar relatórios:', error)
      setError(error?.message || 'Erro desconhecido ao carregar relatórios')
    } finally {
      setLoading(false)
    }
  }

  const handleResetFilters = () => {
    setFilters({})
  }

  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      await reportsAPI.export(filters, format)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      setError('Erro ao exportar relatório. Tente novamente.')
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-secondary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 md:gap-6 px-3 md:px-6 pt-4 md:pt-6 pb-16 md:pb-20 lg:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Relatórios Avançados</h1>
            <p className="text-sm text-text-muted mt-1">Análise detalhada de performance e métricas</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => loadData()}
              variant="outline"
              className="gap-2 border-white/10 bg-background-muted/80 text-text-primary hover:bg-background-soft"
              disabled={loading}
            >
              <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button
              onClick={() => handleExport('csv')}
              variant="outline"
              className="gap-2 border-white/10 bg-background-muted/80 text-text-primary hover:bg-background-soft"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
            <Button
              onClick={() => handleExport('excel')}
              variant="outline"
              className="gap-2 border-white/10 bg-background-muted/80 text-text-primary hover:bg-background-soft"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </Button>
            <Button
              onClick={() => setShowCustomExport(true)}
              variant="outline"
              className="gap-2 border-white/10 bg-background-muted/80 text-text-primary hover:bg-background-soft"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Personalizada</span>
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3">
          <ReportsFilters
            filters={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
            users={users}
            campaigns={campaigns}
          />
          
          {/* Seleção de Período para Gráficos e Filtros Salvos */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-background-subtle/60 p-3">
              <span className="text-xs md:text-sm text-text-muted">Período dos gráficos:</span>
              <div className="flex gap-2">
                {(['day', 'week', 'month'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      const newFilters = { ...filters, period }
                      setFilters(newFilters)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      filters.period === period
                        ? 'bg-brand-primary/20 text-brand-secondary border border-brand-secondary/40'
                        : 'bg-background-muted/80 text-text-muted border border-white/10 hover:border-brand-secondary/40'
                    }`}
                  >
                    {period === 'day' ? 'Dia' : period === 'week' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>
            </div>
            <SavedFilters filters={filters} onLoadFilter={setFilters} />
          </div>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Métricas Gerais */}
        {overview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
            <MetricCard
              title="Total de Leads"
              value={overview.totalLeads}
              icon={Users}
            />
            <MetricCard
              title="Convertidos"
              value={overview.totalConverted}
              icon={Target}
              subtitle={`${overview.conversionRate}% de conversão`}
            />
            <MetricCard
              title="Atendimentos"
              value={overview.totalAttendances}
              icon={MessageSquare}
            />
            <MetricCard
              title="Mensagens"
              value={overview.totalMessages}
              icon={MessageSquare}
            />
            <MetricCard
              title="Tempo Médio Resposta"
              value={`${overview.averageResponseTime} min`}
              icon={Clock}
            />
            <MetricCard
              title="Tempo Médio Atendimento"
              value={`${overview.averageAttendanceTime} min`}
              icon={Clock}
            />
          </div>
        ) : !loading && !error ? (
          <div className="flex items-center justify-center py-12 rounded-xl border border-white/5 bg-background-subtle/60">
            <div className="text-center">
              <p className="text-text-muted">Nenhum dado disponível. Tente ajustar os filtros ou verifique se há dados no sistema.</p>
            </div>
          </div>
        ) : null}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Leads por Período */}
          {leadsData && leadsData.byPeriod.length > 0 && (
            <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
              <h3 className="text-lg font-semibold text-white mb-4">Leads por Período</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leadsData.byPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name="Total"
                  />
                  <Line
                    type="monotone"
                    dataKey="converted"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Convertidos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Distribuição por Status */}
          {leadsData && leadsData.byStatus.length > 0 && (
            <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
              <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leadsData.byStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => {
                      const total = leadsData.byStatus.reduce((sum: number, item: any) => sum + item.count, 0)
                      const percentage = total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0'
                      return `${entry.status}: ${percentage}%`
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {leadsData.byStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Conversão por Atendente */}
          {conversionData && conversionData.byAttendant.length > 0 && (
            <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
              <h3 className="text-lg font-semibold text-white mb-4">Conversão por Atendente</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionData.byAttendant}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="userName"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="totalLeads" fill="#8B5CF6" name="Total Leads" />
                  <Bar dataKey="convertedLeads" fill="#10B981" name="Convertidos" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Distribuição por Origem */}
          {leadsData && leadsData.byOrigin.length > 0 && (
            <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
              <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Origem</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadsData.byOrigin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="origin"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#EC4899" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* Métricas de Campanhas */}
        {campaignsData && campaignsData.campaigns && campaignsData.campaigns.length > 0 && (
          <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
            <h3 className="text-lg font-semibold text-white mb-4">Métricas de Campanhas</h3>
            <div className="space-y-4">
              {campaignsData.campaigns.map((campaign: any) => (
                <div key={campaign.campaignId} className="border-b border-white/5 pb-4 last:border-0">
                  <h4 className="text-sm font-medium text-white mb-2">{campaign.campaignName}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Total Leads:</span>
                      <span className="ml-2 text-white font-semibold">{campaign.totalLeads}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Convertidos:</span>
                      <span className="ml-2 text-white font-semibold">{campaign.convertedLeads}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Taxa:</span>
                      <span className="ml-2 text-brand-secondary font-semibold">{campaign.conversionRate}%</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Leads/Dia:</span>
                      <span className="ml-2 text-white font-semibold">
                        {campaign.dailyLeads.length > 0
                          ? (campaign.totalLeads / campaign.dailyLeads.length).toFixed(1)
                          : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Jornada do Lead */}
        {journeyData && journeyData.steps && journeyData.steps.length > 0 && (
          <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
            <h3 className="text-lg font-semibold text-white mb-4">Jornada do Lead</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {journeyData.steps.map((step: any) => (
                  <div key={step.step} className="text-center p-4 rounded-xl border border-white/5 bg-background-muted/40">
                    <p className="text-xs text-text-muted mb-1">{step.step}</p>
                    <p className="text-2xl font-bold text-white mb-1">{step.count}</p>
                    <p className="text-xs text-brand-secondary">{step.percentage}%</p>
                  </div>
                ))}
              </div>
              {journeyData.flow && journeyData.flow.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <h4 className="text-sm font-medium text-white mb-2">Fluxo de Conversão</h4>
                  <div className="space-y-2">
                    {journeyData.flow.map((flow: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <span className="text-text-muted">{flow.from}</span>
                        <ArrowRight className="h-3 w-3 text-text-muted" />
                        <span className="text-text-muted">{flow.to}</span>
                        <span className="ml-auto text-white font-semibold">{flow.count} leads</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Métricas de Mensagens */}
        {messagesData && (
          <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
            <h3 className="text-lg font-semibold text-white mb-4">Métricas de Mensagens</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 rounded-xl border border-white/5 bg-background-muted/40">
                <p className="text-xs text-text-muted mb-1">Total</p>
                <p className="text-2xl font-bold text-white">{messagesData.total}</p>
              </div>
              <div className="text-center p-4 rounded-xl border border-white/5 bg-background-muted/40">
                <p className="text-xs text-text-muted mb-1">Manuais</p>
                <p className="text-2xl font-bold text-brand-secondary">{messagesData.manual}</p>
              </div>
              <div className="text-center p-4 rounded-xl border border-white/5 bg-background-muted/40">
                <p className="text-xs text-text-muted mb-1">Automáticas</p>
                <p className="text-2xl font-bold text-emerald-400">{messagesData.automatic}</p>
              </div>
            </div>
            {messagesData.byPeriod && messagesData.byPeriod.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={messagesData.byPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="manual" fill="#8B5CF6" name="Manuais" />
                  <Bar dataKey="automatic" fill="#10B981" name="Automáticas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        )}

        {/* Métricas de Agendamentos */}
        {scheduledData && scheduledData.scheduled && (
          <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
            <h3 className="text-lg font-semibold text-white mb-4">Métricas de Agendamentos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 rounded-xl border border-white/5 bg-background-muted/40">
                <p className="text-xs text-text-muted mb-1">Total</p>
                <p className="text-2xl font-bold text-white">{scheduledData.scheduled.total}</p>
              </div>
              <div className="text-center p-4 rounded-xl border border-white/5 bg-background-muted/40">
                <p className="text-xs text-text-muted mb-1">Executados</p>
                <p className="text-2xl font-bold text-emerald-400">{scheduledData.scheduled.executed}</p>
              </div>
              <div className="text-center p-4 rounded-xl border border-white/5 bg-background-muted/40">
                <p className="text-xs text-text-muted mb-1">Falhas</p>
                <p className="text-2xl font-bold text-red-400">{scheduledData.scheduled.failed}</p>
              </div>
              <div className="text-center p-4 rounded-xl border border-white/5 bg-background-muted/40">
                <p className="text-xs text-text-muted mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400">{scheduledData.scheduled.pending}</p>
              </div>
            </div>
            {scheduledData.scheduled.byPeriod && scheduledData.scheduled.byPeriod.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={scheduledData.scheduled.byPeriod}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="executed" fill="#10B981" name="Executados" />
                  <Bar dataKey="failed" fill="#EF4444" name="Falhas" />
                </BarChart>
              </ResponsiveContainer>
            )}
            {scheduledData.errors && scheduledData.errors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <h4 className="text-sm font-medium text-red-400 mb-2">Erros de Envio</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {scheduledData.errors.map((error: any, index: number) => (
                    <div key={index} className="text-xs text-text-muted">
                      <span className="font-medium">{error.date}:</span> {error.count} erro(s)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Métricas Detalhadas de Atendimento */}
        {attendanceData && attendanceData.byAttendant && attendanceData.byAttendant.length > 0 && (
          <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
            <h3 className="text-lg font-semibold text-white mb-4">Performance por Atendente</h3>
            <div className="space-y-3">
              {attendanceData.byAttendant.map((attendant: any) => (
                <div key={attendant.userId} className="border-b border-white/5 pb-3 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-white">{attendant.userName}</h4>
                    <span className="text-xs text-brand-secondary font-semibold">
                      {attendant.conversionRate}% conversão
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Atendimentos:</span>
                      <span className="ml-2 text-white">{attendant.totalAttendances}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Tempo Médio:</span>
                      <span className="ml-2 text-white">{attendant.averageTime} min</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Resposta Média:</span>
                      <span className="ml-2 text-white">{attendant.averageResponseTime} min</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Taxa Conversão:</span>
                      <span className="ml-2 text-brand-secondary">{attendant.conversionRate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tabelas Detalhadas */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={activeTable === 'leads' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTable(activeTable === 'leads' ? null : 'leads')
                if (activeTable !== 'leads') {
                  loadLeadsDetail(1)
                }
              }}
              className="border-white/10 bg-background-muted/80"
            >
              Ver Leads Detalhados
            </Button>
            <Button
              variant={activeTable === 'attendances' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTable(activeTable === 'attendances' ? null : 'attendances')
                if (activeTable !== 'attendances') {
                  loadAttendancesDetail(1)
                }
              }}
              className="border-white/10 bg-background-muted/80"
            >
              Ver Atendimentos Detalhados
            </Button>
            <Button
              variant={activeTable === 'messages' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTable(activeTable === 'messages' ? null : 'messages')
                if (activeTable !== 'messages') {
                  loadMessagesDetail(1)
                }
              }}
              className="border-white/10 bg-background-muted/80"
            >
              Ver Mensagens Detalhadas
            </Button>
          </div>

          {activeTable === 'leads' && leadsDetail && (
            <DetailedTable
              title="Leads Detalhados"
              data={leadsDetail.data}
              total={leadsDetail.total}
              page={leadsDetail.page}
              pageSize={leadsDetail.pageSize}
              totalPages={leadsDetail.totalPages}
              columns={[
                { key: 'name', label: 'Nome' },
                { key: 'phone', label: 'Telefone' },
                { key: 'status', label: 'Status' },
                { key: 'origin', label: 'Origem' },
                {
                  key: 'createdAt',
                  label: 'Criado em',
                  render: (value) => new Date(value).toLocaleDateString('pt-BR'),
                },
                { key: 'totalMessages', label: 'Mensagens' },
                { key: 'totalAttendances', label: 'Atendimentos' },
              ]}
              onPageChange={loadLeadsDetail}
              onRowClick={(row) => {
                window.location.href = `/?leadId=${row.id}`
              }}
            />
          )}

          {activeTable === 'attendances' && attendancesDetail && (
            <DetailedTable
              title="Atendimentos Detalhados"
              data={attendancesDetail.data}
              total={attendancesDetail.total}
              page={attendancesDetail.page}
              pageSize={attendancesDetail.pageSize}
              totalPages={attendancesDetail.totalPages}
              columns={[
                { key: 'leadName', label: 'Lead' },
                { key: 'leadPhone', label: 'Telefone' },
                { key: 'assignedUserName', label: 'Atendente' },
                { key: 'status', label: 'Status' },
                {
                  key: 'startedAt',
                  label: 'Iniciado em',
                  render: (value) => new Date(value).toLocaleString('pt-BR'),
                },
                {
                  key: 'duration',
                  label: 'Duração (min)',
                  render: (value) => value ? `${value} min` : 'Em andamento',
                },
                { key: 'totalMessages', label: 'Mensagens' },
              ]}
              onPageChange={loadAttendancesDetail}
              onRowClick={(row) => {
                window.location.href = `/?leadId=${row.leadId}`
              }}
            />
          )}

          {activeTable === 'messages' && messagesDetail && (
            <DetailedTable
              title="Mensagens Detalhadas"
              data={messagesDetail.data}
              total={messagesDetail.total}
              page={messagesDetail.page}
              pageSize={messagesDetail.pageSize}
              totalPages={messagesDetail.totalPages}
              columns={[
                { key: 'leadName', label: 'Lead' },
                { key: 'leadPhone', label: 'Telefone' },
                {
                  key: 'content',
                  label: 'Conteúdo',
                  render: (value) => (
                    <span className="truncate max-w-xs">{value}</span>
                  ),
                },
                { key: 'direction', label: 'Direção' },
                { key: 'contentType', label: 'Tipo' },
                {
                  key: 'createdAt',
                  label: 'Data',
                  render: (value) => new Date(value).toLocaleString('pt-BR'),
                },
                { key: 'senderName', label: 'Remetente' },
              ]}
              onPageChange={loadMessagesDetail}
              onRowClick={(row) => {
                window.location.href = `/?leadId=${row.leadId}`
              }}
            />
          )}
        </div>

        {/* Comparativo entre Períodos */}
        <PeriodComparison filters={filters} />

        {/* Gráficos Adicionais */}
        <AdditionalCharts
          leadsData={leadsData}
          conversionData={conversionData}
          attendanceData={attendanceData}
          messagesData={messagesData}
        />
      </main>
      <Footer />
      <BottomNavigation />
      
      {/* Modal de Exportação Personalizada */}
      <CustomExportModal
        isOpen={showCustomExport}
        onClose={() => setShowCustomExport(false)}
        filters={filters}
      />
    </div>
  )
}

