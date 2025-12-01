'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface ReachFrequencyChartProps {
  timeline: Array<{
    date: string
    impressions: number
    reach?: number
    frequency?: number
  }>
  totalImpressions: number
  impressionsDelta?: number
}

export default function ReachFrequencyChart({
  timeline,
  totalImpressions,
  impressionsDelta = 0,
}: ReachFrequencyChartProps) {
  const chartData = timeline.map((item) => ({
    date: format(parseISO(item.date), 'dd/MM'),
    impressoes: item.impressions || 0,
    alcance: item.reach || 0,
    frequencia: item.frequency || 0,
  }))

  const formatNumber = (value: number) => {
    return value.toLocaleString('pt-BR')
  }

  return (
    <Card className="bg-white/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Alcance e Frequência</CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{formatNumber(totalImpressions)}</div>
            {impressionsDelta !== 0 && (
              <div
                className={`text-sm ${impressionsDelta > 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {impressionsDelta > 0 ? '+' : ''}
                {impressionsDelta > 0 ? '+' : ''}
                {((impressionsDelta / totalImpressions) * 100).toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number) => formatNumber(value)}
            />
            <Bar dataKey="impressoes" fill="#3B82F6" radius={[8, 8, 0, 0]} maxBarSize={60}>
              <LabelList
                dataKey="frequencia"
                position="bottom"
                fill="#9CA3AF"
                style={{ fontSize: '12px' }}
                formatter={(value: number) => (value > 0 ? value.toFixed(2) : '')}
              />
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#3B82F6" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

