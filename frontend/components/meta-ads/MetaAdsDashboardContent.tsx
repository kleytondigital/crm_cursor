'use client'

import { Loader2, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import MainInvestmentCard from './MainInvestmentCard'
import InvestmentMessagesChart from './InvestmentMessagesChart'
import ReachFrequencyChart from './ReachFrequencyChart'
import MetricCircularCard from './MetricCircularCard'
import ClicksMessagesLineChart from './ClicksMessagesLineChart'
import ConversionFunnel from './ConversionFunnel'
import CreativesTable from './CreativesTable'
import { MousePointerClick, Eye, DollarSign, TrendingUp } from 'lucide-react'

interface MetaAdsDashboardContentProps {
  metrics: any
  timeline: any[]
  breakdown: any[]
  loading: boolean
  error: any
  onRetry: () => void
}

export default function MetaAdsDashboardContent({
  metrics,
  timeline,
  breakdown,
  loading,
  error,
  onRetry,
}: MetaAdsDashboardContentProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <XCircle className="mb-4 h-12 w-12 text-red-500" />
          <p className="text-center text-red-500">
            Erro ao carregar métricas. Tente novamente.
          </p>
          <Button onClick={onRetry} className="mt-4">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Preparar dados de criativos
  const creatives = breakdown.map((item: any) => ({
    id: item.adId || `creative-${Math.random()}`,
    name: item.name || item.adName || 'Sem nome',
    cpa: item.cpa || 0,
    spend: item.spend || 0,
    messages: item.messages || 0,
    clicks: item.clicks || 0,
    ctr: item.ctr || 0,
    adUrl: item.adUrl,
  }))

  // Calcular deltas (simplificado - pode ser melhorado com dados históricos)
  const previousSpend = metrics.spend * 0.8 // Mock
  const investmentDelta = metrics.spend - previousSpend
  const impressionsDelta = metrics.impressions * 0.33 // Mock

  return (
    <div className="space-y-6">
      {/* Primeira linha: Card de Investimento + Gráfico de Investimento/Mensagens */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MainInvestmentCard investment={metrics.spend} delta={investmentDelta} />
        </div>
        <div className="lg:col-span-2">
          <InvestmentMessagesChart
            timeline={timeline}
            totalInvestment={metrics.spend}
            investmentDelta={investmentDelta}
          />
        </div>
      </div>

      {/* Segunda linha: Gráfico de Alcance + 4 Cards Circulares */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReachFrequencyChart
            timeline={timeline}
            totalImpressions={metrics.impressions}
            impressionsDelta={impressionsDelta}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MetricCircularCard
            title="Cliques"
            value={metrics.clicks}
            delta={`+${((metrics.clicks / metrics.impressions) * 100).toFixed(1)}%`}
            deltaPositive={true}
            icon={<MousePointerClick className="h-6 w-6" />}
            color="#EF4444"
          />
          <MetricCircularCard
            title="CPC"
            value={`R$ ${metrics.cpc.toFixed(2).replace('.', ',')}`}
            delta={`R$ ${(metrics.cpc * 0.1).toFixed(2).replace('.', ',')}`}
            icon={<DollarSign className="h-6 w-6" />}
            color="#3B82F6"
          />
          <MetricCircularCard
            title="CPM"
            value={`R$ ${metrics.cpm.toFixed(2).replace('.', ',')}`}
            delta={`R$ ${(metrics.cpm * 0.15).toFixed(2).replace('.', ',')}`}
            icon={<Eye className="h-6 w-6" />}
            color="#10B981"
          />
          <MetricCircularCard
            title="CTR"
            value={`${(metrics.ctr * 100).toFixed(1)}%`}
            delta={`+${((metrics.ctr * 100) * 0.1).toFixed(2)}%`}
            deltaPositive={true}
            icon={<TrendingUp className="h-6 w-6" />}
            color="#F59E0B"
          />
        </div>
      </div>

      {/* Terceira linha: Gráfico de Linha + Funil */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClicksMessagesLineChart timeline={timeline} />
        </div>
        <div className="lg:col-span-1">
          <ConversionFunnel
            reach={metrics.reach || metrics.impressions}
            clicks={metrics.clicks}
            messages={metrics.messages}
            conversionRate={metrics.conversionRate || 0}
            costPerMessage={metrics.costPerMessage || 0}
          />
        </div>
      </div>

      {/* Quarta linha: Tabela de Criativos */}
      <CreativesTable creatives={creatives} />
    </div>
  )
}

