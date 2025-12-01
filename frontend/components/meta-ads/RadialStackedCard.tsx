'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

interface RadialStackedCardProps {
  title: string
  data: Array<{
    name: string
    value: number
    color: string
  }>
}

export default function RadialStackedCard({ title, data }: RadialStackedCardProps) {
  const chartConfig = data.reduce((acc, item, index) => {
    acc[`value${index}`] = {
      label: item.name,
      color: item.color,
    }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
    <Card className="bg-white/5">
      <CardContent className="p-6">
        <div className="mb-4 text-center text-sm font-medium text-white">{title}</div>
        <div className="h-64 w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <RadialBarChart
              data={data}
              startAngle={90}
              endAngle={-270}
              innerRadius={50}
              outerRadius={90}
            >
              {data.map((entry, index) => (
                <RadialBar
                  key={`bar-${index}`}
                  dataKey="value"
                  stackId="a"
                  fill={entry.color}
                  cornerRadius={10}
                />
              ))}
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
            </RadialBarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}

