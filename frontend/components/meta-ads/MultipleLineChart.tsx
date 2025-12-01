'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { format, parseISO } from 'date-fns'

interface MultipleLineChartProps {
  title: string
  description?: string
  data: Array<{
    date: string
    [key: string]: string | number
  }>
  lines: Array<{
    key: string
    label: string
    color: string
  }>
  height?: number
}

export default function MultipleLineChart({
  title,
  description,
  data,
  lines,
  height = 300,
}: MultipleLineChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    date: format(parseISO(item.date), 'dd/MM'),
  }))

  const chartConfig = lines.reduce((acc, line) => {
    acc[line.key] = {
      label: line.label,
      color: line.color,
    }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
    <Card className="bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        {description && <p className="text-sm text-text-muted">{description}</p>}
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} style={{ fontSize: '12px' }} />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: line.color }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

