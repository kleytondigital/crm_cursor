'use client'

import { Card } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface AdditionalChartsProps {
  leadsData?: any
  conversionData?: any
  attendanceData?: any
  messagesData?: any
}

export default function AdditionalCharts({
  leadsData,
  conversionData,
  attendanceData,
  messagesData,
}: AdditionalChartsProps) {
  // Dados para funil de conversão
  const funnelData = conversionData?.byAttendant
    ? conversionData.byAttendant.map((item: any) => ({
        name: item.userName,
        leads: item.totalLeads,
        atendimentos: item.totalLeads * 0.8, // Estimativa
        conversoes: item.convertedLeads,
      }))
    : []

  // Dados para heatmap de atividade (horas do dia)
  const generateHeatmapData = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    return hours.map((hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      mensagens: Math.floor(Math.random() * 50) + 10, // Simulado - substituir com dados reais
      atendimentos: Math.floor(Math.random() * 20) + 5,
    }))
  }

  const heatmapData = generateHeatmapData()

  // Dados para gráfico de área (evolução temporal)
  const areaData = leadsData?.byPeriod || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Funil de Conversão */}
      {funnelData.length > 0 && (
        <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
          <h3 className="text-lg font-semibold text-white mb-4">Funil de Conversão</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="leads" stackId="a" fill="#8B5CF6" name="Leads" />
              <Bar dataKey="atendimentos" stackId="a" fill="#EC4899" name="Atendimentos" />
              <Bar dataKey="conversoes" stackId="a" fill="#10B981" name="Conversões" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Heatmap de Atividade por Hora */}
      <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
        <h3 className="text-lg font-semibold text-white mb-4">Atividade por Hora do Dia</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={heatmapData}>
            <defs>
              <linearGradient id="colorMensagens" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAtendimentos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="hour"
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
            <Area
              type="monotone"
              dataKey="mensagens"
              stroke="#8B5CF6"
              fillOpacity={1}
              fill="url(#colorMensagens)"
              name="Mensagens"
            />
            <Area
              type="monotone"
              dataKey="atendimentos"
              stroke="#EC4899"
              fillOpacity={1}
              fill="url(#colorAtendimentos)"
              name="Atendimentos"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Evolução Temporal (Área) */}
      {areaData.length > 0 && (
        <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
          <h3 className="text-lg font-semibold text-white mb-4">Evolução Temporal de Leads</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8B5CF6"
                fillOpacity={1}
                fill="url(#colorLeads)"
                name="Total Leads"
              />
              <Area
                type="monotone"
                dataKey="converted"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorConverted)"
                name="Convertidos"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Gráfico de Barras Empilhadas - Status */}
      {leadsData?.byStatus && leadsData.byStatus.length > 0 && (
        <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição de Status (Empilhado)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leadsData.byStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis
                dataKey="status"
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
              <Bar dataKey="count" fill="#8B5CF6" name="Quantidade">
                {leadsData.byStatus.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={['#8B5CF6', '#EC4899', '#10B981', '#F59E0B'][index % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}

