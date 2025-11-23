'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'
import MetricCard from '@/components/reports/MetricCard'
import ReportsFilters from '@/components/reports/ReportsFilters'
import {
  Users,
  TrendingUp,
  MessageSquare,
  Clock,
  Target,
  BarChart3,
  Download,
  Loader2,
} from 'lucide-react'
import { reportsAPI, ReportsFilter } from '@/lib/api/reports'
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
  const [filters, setFilters] = useState<ReportsFilter>({})
  const [overview, setOverview] = useState<any>(null)
  const [leadsData, setLeadsData] = useState<any>(null)
  const [conversionData, setConversionData] = useState<any>(null)
  const [attendanceData, setAttendanceData] = useState<any>(null)

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

    loadData()
  }, [router, filters])

  const loadData = async () => {
    try {
      setLoading(true)
      const [overviewRes, leadsRes, conversionRes, attendanceRes] = await Promise.all([
        reportsAPI.getOverview(filters),
        reportsAPI.getLeads({ ...filters, period: 'day' }),
        reportsAPI.getConversion(filters),
        reportsAPI.getAttendance(filters),
      ])

      setOverview(overviewRes)
      setLeadsData(leadsRes)
      setConversionData(conversionRes)
      setAttendanceData(attendanceRes)
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetFilters = () => {
    setFilters({})
  }

  const handleExport = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      const blob = await reportsAPI.export(filters, format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erro ao exportar:', error)
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
          </div>
        </div>

        {/* Filtros */}
        <ReportsFilters
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
        />

        {/* Métricas Gerais */}
        {overview && (
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
        )}

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
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
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
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  )
}

