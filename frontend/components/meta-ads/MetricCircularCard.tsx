'use client'

import { Card, CardContent } from '@/components/ui/card'

interface MetricCircularCardProps {
  title: string
  value: string | number
  delta?: string | number
  deltaPositive?: boolean
  icon?: React.ReactNode
  color?: string
  bgColor?: string
}

export default function MetricCircularCard({
  title,
  value,
  delta,
  deltaPositive,
  icon,
  color = '#8B5CF6',
  bgColor,
}: MetricCircularCardProps) {
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

  return (
    <Card
      className="relative overflow-hidden bg-white/5"
      style={{
        background: bgColor
          ? `linear-gradient(135deg, ${bgColor}15 0%, ${bgColor}05 100%)`
          : undefined,
      }}
    >
      <CardContent className="flex flex-col items-center justify-center p-6">
        <div className="mb-4 flex items-center justify-center">
          {icon && (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}20` }}
            >
              <div style={{ color }}>{icon}</div>
            </div>
          )}
        </div>
        <div className="mb-2 text-center text-sm font-medium text-text-muted">{title}</div>
        <div
          className="mb-1 text-center text-3xl font-bold"
          style={{ color }}
        >
          {formatValue(value)}
        </div>
        {delta !== undefined && (
          <div
            className={`text-center text-sm font-semibold ${
              deltaPositive === true ? 'text-green-500' : deltaPositive === false ? 'text-red-500' : 'text-text-muted'
            }`}
          >
            {formatDelta(delta)}
          </div>
        )}
      </CardContent>
      {/* Circular gauge effect */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
          opacity: 0.3,
        }}
      />
    </Card>
  )
}

