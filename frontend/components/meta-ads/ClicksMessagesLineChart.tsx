'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface ClicksMessagesLineChartProps {
  timeline: Array<{
    date: string
    clicks: number
    messages: number
  }>
}

export default function ClicksMessagesLineChart({ timeline }: ClicksMessagesLineChartProps) {
  const chartData = timeline.map((item) => ({
    date: format(parseISO(item.date), 'dd/MM'),
    fullDate: item.date,
    cliques: item.clicks || 0,
    mensagens: item.messages || 0,
  }))

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#8B5CF6" stroke="#fff" strokeWidth={2} />
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight="bold"
        >
          {payload.cliques}
        </text>
      </g>
    )
  }

  const CustomDotMessages = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload.mensagens || payload.mensagens === 0) return null
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#F59E0B" stroke="#fff" strokeWidth={2} />
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight="bold"
        >
          {payload.mensagens}
        </text>
      </g>
    )
  }

  return (
    <Card className="bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Clicou no anúncio e mandou mensagem</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Line
              type="monotone"
              dataKey="cliques"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={<CustomDot />}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="mensagens"
              stroke="#F59E0B"
              strokeWidth={3}
              dot={<CustomDotMessages />}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

