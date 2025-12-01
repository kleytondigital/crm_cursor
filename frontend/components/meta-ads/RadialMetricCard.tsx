'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

interface RadialMetricCardProps {
  title: string
  value: string | number
  percentage: number // 0-100
  delta?: string | number
  deltaPositive?: boolean
  icon?: React.ReactNode
  color?: string
}

export default function RadialMetricCard({
  title,
  value,
  percentage,
  delta,
  deltaPositive,
  icon,
  color = '#8B5CF6',
}: RadialMetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString('pt-BR')
    }
    return val
  }

  const formatDelta = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 0) return `+${val.toFixed(1)}%`
      return `${val.toFixed(1)}%`
    }
    return val
  }

  const chartData = [
    {
      name: title,
      value: Math.min(percentage, 100),
      fill: color,
    },
  ]

  const chartConfig = {
    value: {
      label: title,
      color: color,
    },
  }

  return (
    <Card className="relative overflow-hidden bg-white/5">
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className="mb-4 flex items-center justify-center">
          {icon && (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}20` }}
            >
              <div style={{ color }}>{icon}</div>
            </div>
          )}
        </div>
        <div className="mb-2 text-center text-xs font-medium text-text-muted">{title}</div>
        
        {/* Radial Chart */}
        <div className="relative h-32 w-32">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <RadialBarChart
              data={chartData}
              startAngle={90}
              endAngle={-270}
              innerRadius={60}
              outerRadius={80}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={10}
                fill={color}
              />
              <ChartTooltip
                content={<ChartTooltipContent hideLabel />}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div
                className="text-2xl font-bold"
                style={{ color }}
              >
                {formatValue(value)}
              </div>
            </div>
          </div>
        </div>

        {delta !== undefined && (
          <div
            className={`mt-2 text-center text-xs font-semibold ${
              deltaPositive === true ? 'text-green-500' : deltaPositive === false ? 'text-red-500' : 'text-text-muted'
            }`}
          >
            {formatDelta(delta)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

