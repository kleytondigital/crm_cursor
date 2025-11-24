'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from 'lucide-react'
import { ReportsFilter } from '@/lib/api/reports'
import { reportsAPI } from '@/lib/api/reports'
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
} from 'recharts'

interface PeriodComparisonProps {
  filters: ReportsFilter
}

export default function PeriodComparison({ filters }: PeriodComparisonProps) {
  const [period1, setPeriod1] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })
  const [period2, setPeriod2] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  })
  const [data1, setData1] = useState<any>(null)
  const [data2, setData2] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleCompare = async () => {
    if (!period1.start || !period1.end || !period2.start || !period2.end) {
      return
    }

    setLoading(true)
    try {
      const [overview1, overview2, leads1, leads2] = await Promise.all([
        reportsAPI.getOverview({ ...filters, startDate: period1.start, endDate: period1.end }),
        reportsAPI.getOverview({ ...filters, startDate: period2.start, endDate: period2.end }),
        reportsAPI.getLeads({ ...filters, startDate: period1.start, endDate: period1.end }, 'day'),
        reportsAPI.getLeads({ ...filters, startDate: period2.start, endDate: period2.end }, 'day'),
      ])

      setData1({ overview: overview1, leads: leads1 })
      setData2({ overview: overview2, leads: leads2 })
    } catch (error) {
      console.error('Erro ao comparar períodos:', error)
    } finally {
      setLoading(false)
    }
  }

  const comparisonData = data1 && data2
    ? [
        {
          metric: 'Total Leads',
          period1: data1.overview.totalLeads,
          period2: data2.overview.totalLeads,
          change: ((data2.overview.totalLeads - data1.overview.totalLeads) / data1.overview.totalLeads) * 100,
        },
        {
          metric: 'Convertidos',
          period1: data1.overview.totalConverted,
          period2: data2.overview.totalConverted,
          change: ((data2.overview.totalConverted - data1.overview.totalConverted) / (data1.overview.totalConverted || 1)) * 100,
        },
        {
          metric: 'Taxa Conversão',
          period1: data1.overview.conversionRate,
          period2: data2.overview.conversionRate,
          change: data2.overview.conversionRate - data1.overview.conversionRate,
        },
        {
          metric: 'Atendimentos',
          period1: data1.overview.totalAttendances,
          period2: data2.overview.totalAttendances,
          change: ((data2.overview.totalAttendances - data1.overview.totalAttendances) / (data1.overview.totalAttendances || 1)) * 100,
        },
        {
          metric: 'Mensagens',
          period1: data1.overview.totalMessages,
          period2: data2.overview.totalMessages,
          change: ((data2.overview.totalMessages - data1.overview.totalMessages) / (data1.overview.totalMessages || 1)) * 100,
        },
        {
          metric: 'Tempo Médio Resposta',
          period1: data1.overview.averageResponseTime,
          period2: data2.overview.averageResponseTime,
          change: data2.overview.averageResponseTime - data1.overview.averageResponseTime,
        },
      ]
    : []

  return (
    <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
      <h3 className="text-lg font-semibold text-white mb-4">Comparativo entre Períodos</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <label className="text-xs text-text-muted">Período 1</label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={period1.start}
              onChange={(e) => setPeriod1({ ...period1, start: e.target.value })}
              className="bg-background-muted/80 border-white/10 text-white"
            />
            <Input
              type="date"
              value={period1.end}
              onChange={(e) => setPeriod1({ ...period1, end: e.target.value })}
              className="bg-background-muted/80 border-white/10 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-text-muted">Período 2</label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={period2.start}
              onChange={(e) => setPeriod2({ ...period2, start: e.target.value })}
              className="bg-background-muted/80 border-white/10 text-white"
            />
            <Input
              type="date"
              value={period2.end}
              onChange={(e) => setPeriod2({ ...period2, end: e.target.value })}
              className="bg-background-muted/80 border-white/10 text-white"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={handleCompare}
        disabled={loading || !period1.start || !period1.end || !period2.start || !period2.end}
        className="w-full mb-4 bg-brand-primary text-white"
      >
        {loading ? 'Comparando...' : 'Comparar Períodos'}
      </Button>

      {comparisonData.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-text-muted">Métrica</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted">Período 1</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted">Período 2</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-text-muted">Variação</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((item) => (
                  <tr key={item.metric} className="border-b border-white/5">
                    <td className="py-3 px-4 text-sm text-white">{item.metric}</td>
                    <td className="py-3 px-4 text-sm text-white text-right">{item.period1.toFixed(2)}</td>
                    <td className="py-3 px-4 text-sm text-white text-right">{item.period2.toFixed(2)}</td>
                    <td className={`py-3 px-4 text-sm text-right font-semibold ${
                      item.change > 0 ? 'text-emerald-400' : item.change < 0 ? 'text-red-400' : 'text-text-muted'
                    }`}>
                      {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data1?.leads && data2?.leads && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-white mb-4">Leads por Período - Comparativo</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Período 1', leads: data1.overview.totalLeads, converted: data1.overview.totalConverted },
                  { name: 'Período 2', leads: data2.overview.totalLeads, converted: data2.overview.totalConverted },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="leads" fill="#8B5CF6" name="Total Leads" />
                  <Bar dataKey="converted" fill="#10B981" name="Convertidos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

