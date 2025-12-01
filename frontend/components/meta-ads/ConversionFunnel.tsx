'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatNumber } from '@/lib/utils'

interface ConversionFunnelProps {
  reach: number
  reachDelta?: number
  clicks: number
  clicksDelta?: number
  messages: number
  messagesDelta?: number
  conversionRate: number
  conversionRateDelta?: number
  costPerMessage: number
  costPerMessageDelta?: number
}

export default function ConversionFunnel({
  reach,
  reachDelta = 0,
  clicks,
  clicksDelta = 0,
  messages,
  messagesDelta = 0,
  conversionRate,
  conversionRateDelta = 0,
  costPerMessage,
  costPerMessageDelta = 0,
}: ConversionFunnelProps) {
  const funnelLevels = [
    {
      label: 'Pessoas Alcançadas',
      value: reach,
      delta: reachDelta,
      color: 'from-purple-500 to-purple-600',
      bgColor: '#8B5CF6',
      width: '100%',
    },
    {
      label: 'Cliques no Anúncio',
      value: clicks,
      delta: clicksDelta,
      color: 'from-red-500 to-red-600',
      bgColor: '#EF4444',
      width: `${(clicks / reach) * 100}%`,
    },
    {
      label: 'Mensagens',
      value: messages,
      delta: messagesDelta,
      color: 'from-orange-500 to-orange-600',
      bgColor: '#F59E0B',
      width: `${(messages / reach) * 100}%`,
    },
  ]

  const formatDelta = (delta: number) => {
    if (delta === 0) return '0'
    const sign = delta > 0 ? '+' : ''
    return `${sign}${formatNumber(delta)}`
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card do Funil */}
      <Card className="bg-white/5">
        <CardContent className="p-6">
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-white">Funil de Conversão</h3>
          </div>
          <div className="flex flex-col items-center gap-2">
            {funnelLevels.map((level, index) => (
              <div key={index} className="w-full">
                <div
                  className="relative flex items-center justify-between rounded-lg px-4 py-3 text-white"
                  style={{
                    width: level.width,
                    backgroundColor: level.bgColor,
                    margin: '0 auto',
                    transition: 'width 0.3s ease',
                  }}
                >
                  <div>
                    <div className="text-sm font-medium">{level.label}</div>
                    <div className="text-xl font-bold">{formatNumber(level.value)}</div>
                  </div>
                  {level.delta !== 0 && (
                    <div className="text-right text-sm">
                      <div
                        className={level.delta > 0 ? 'text-green-300' : 'text-red-300'}
                      >
                        {formatDelta(level.delta)}
                      </div>
                    </div>
                  )}
                </div>
                {index < funnelLevels.length - 1 && (
                  <div className="my-1 flex justify-center">
                    <div className="h-4 w-0.5 bg-white/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Taxa de Conversão */}
          <div className="mt-6 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-500 bg-green-500/20">
              <div className="text-center">
                <div className="text-xl font-bold text-white">
                  {formatPercentage(conversionRate)}
                </div>
                <div className="text-xs text-green-300">Conversão</div>
              </div>
            </div>
            {conversionRateDelta !== 0 && (
              <div
                className={`mt-2 text-sm ${conversionRateDelta > 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {formatDelta(conversionRateDelta)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card Custo por Mensagem */}
      <Card className="bg-white/5">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="mb-2 text-sm font-medium text-text-muted">Custo Mensagem</div>
            <div className="text-2xl font-bold text-white">
              R$ {costPerMessage.toFixed(2).replace('.', ',')}
            </div>
            {costPerMessageDelta !== 0 && (
              <div
                className={`mt-2 text-sm ${costPerMessageDelta > 0 ? 'text-red-500' : 'text-green-500'}`}
              >
                {formatDelta(costPerMessageDelta)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

