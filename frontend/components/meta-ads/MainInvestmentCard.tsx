'use client'

import { Card, CardContent } from '@/components/ui/card'
import { DollarSign } from 'lucide-react'

interface MainInvestmentCardProps {
  investment: number
  delta?: number
}

export default function MainInvestmentCard({ investment, delta = 0 }: MainInvestmentCardProps) {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`
  }

  return (
    <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-text-muted">Investimento</span>
            </div>
            <div className="text-3xl font-bold text-white">{formatCurrency(investment)}</div>
            {delta !== 0 && (
              <div
                className={`mt-2 text-sm font-semibold ${
                  delta > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {delta > 0 ? '+' : ''}
                {formatCurrency(Math.abs(delta))}
              </div>
            )}
          </div>
          <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

