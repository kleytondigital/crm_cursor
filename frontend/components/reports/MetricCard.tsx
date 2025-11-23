import { Card } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
}: MetricCardProps) {
  return (
    <Card className="rounded-2xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm font-medium text-text-muted mb-1">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-white mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-muted">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${
              trend.isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className="rounded-full bg-brand-primary/10 p-2 md:p-3">
          <Icon className="h-5 w-5 md:h-6 md:w-6 text-brand-secondary" />
        </div>
      </div>
    </Card>
  )
}

