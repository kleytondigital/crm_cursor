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

interface InvestmentMessagesChartProps {
  timeline: Array<{
    date: string
    spend: number
    messages: number
  }>
  totalInvestment: number
  investmentDelta?: number
}

export default function InvestmentMessagesChart({
  timeline,
  totalInvestment,
  investmentDelta = 0,
}: InvestmentMessagesChartProps) {
  const chartData = timeline.map((item) => ({
    date: format(parseISO(item.date), 'dd/MM'),
    fullDate: item.date,
    investimento: item.spend || 0,
    mensagens: item.messages || 0,
  }))

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`
  }

  return (
    <Card className="bg-white/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Investimento Diário e Mensagens Recebidas</CardTitle>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{formatCurrency(totalInvestment)}</div>
            {investmentDelta !== 0 && (
              <div
                className={`text-sm ${investmentDelta > 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {investmentDelta > 0 ? '+' : ''}
                {formatCurrency(investmentDelta)}
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
              yAxisId="left"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
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
              formatter={(value: number, name: string) => {
                if (name === 'investimento') {
                  return [formatCurrency(value), 'Investimento']
                }
                return [value, 'Mensagens']
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="investimento"
              fill="#10B981"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#10B981" />
              ))}
            </Bar>
            <Bar
              yAxisId="right"
              dataKey="mensagens"
              fill="#EC4899"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            >
              <LabelList
                dataKey="mensagens"
                position="top"
                fill="#FFFFFF"
                style={{ fontSize: '14px', fontWeight: 'bold' }}
              />
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#EC4899" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

