'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

// Componente wrapper para carregar ECharts apenas no cliente
function EChartsWrapper({ option }: { option: any }) {
  const [EChartsComponent, setEChartsComponent] = useState<any>(null)

  useEffect(() => {
    import('echarts-for-react').then((mod) => {
      setEChartsComponent(() => mod.default)
    })
  }, [])

  if (!EChartsComponent) {
    return <div className="flex h-[400px] items-center justify-center text-text-muted">Carregando gráfico...</div>
  }

  return (
    <EChartsComponent
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  )
}

interface ConversionFunnelEChartsProps {
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

export default function ConversionFunnelECharts({
  reach,
  clicks,
  messages,
  conversionRate,
  costPerMessage,
}: ConversionFunnelEChartsProps) {
  // Calcular porcentagens para o funil (valores reais e esperados)
  const maxValue = reach || 100
  const reachPercent = 100
  
  // Valores esperados (pode vir de metas/configurações - mock por enquanto)
  const expectedClicksPercent = 20 // 20% dos alcançados
  const expectedMessagesPercent = 5 // 5% dos alcançados
  const expectedConversionsPercent = 2 // 2% dos alcançados
  
  // Valores reais (atual)
  const actualClicksPercent = maxValue > 0 ? (clicks / maxValue) * 100 : 0
  const actualMessagesPercent = maxValue > 0 ? (messages / maxValue) * 100 : 0
  const actualConversionsPercent = conversionRate * 100

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b} : {c}%',
      backgroundColor: 'rgba(31, 41, 55, 0.95)',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
      },
    },
    legend: {
      data: ['Esperado', 'Real'],
      textStyle: {
        color: '#9CA3AF',
      },
      bottom: 10,
    },
    series: [
      {
        name: 'Esperado',
        type: 'funnel',
        left: '10%',
        width: '80%',
        min: 0,
        max: 100,
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          formatter: '{b} Esperado',
          position: 'outside',
          color: '#9CA3AF',
        },
        labelLine: {
          show: false,
        },
        itemStyle: {
          opacity: 0.7,
          borderColor: '#fff',
          borderWidth: 1,
        },
        emphasis: {
          label: {
            position: 'inside',
            formatter: '{b} Esperado: {c}%',
            color: '#fff',
          },
        },
        data: [
          { value: reachPercent, name: 'Pessoas Alcançadas' },
          { value: expectedClicksPercent, name: 'Cliques no Anúncio' },
          { value: expectedMessagesPercent, name: 'Mensagens' },
          { value: expectedConversionsPercent, name: 'Conversões' },
        ],
      },
      {
        name: 'Real',
        type: 'funnel',
        left: '10%',
        width: '80%',
        maxSize: '80%',
        min: 0,
        max: 100,
        minSize: '0%',
        sort: 'descending',
        gap: 2,
        label: {
          position: 'inside',
          formatter: '{c}%',
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold',
        },
        itemStyle: {
          opacity: 0.5,
          borderColor: '#fff',
          borderWidth: 2,
        },
        emphasis: {
          label: {
            position: 'inside',
            formatter: '{b} Real: {c}%',
            color: '#fff',
            fontSize: 14,
          },
        },
        data: [
          {
            value: reachPercent,
            name: 'Pessoas Alcançadas',
            itemStyle: { color: '#8B5CF6' },
          },
          {
            value: actualClicksPercent,
            name: 'Cliques no Anúncio',
            itemStyle: { color: '#EF4444' },
          },
          {
            value: actualMessagesPercent,
            name: 'Mensagens',
            itemStyle: { color: '#F59E0B' },
          },
          {
            value: actualConversionsPercent,
            name: 'Conversões',
            itemStyle: { color: '#10B981' },
          },
        ],
        // Ensure outer shape will not be over inner shape when hover.
        z: 100,
      },
    ],
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card do Funil */}
      <Card className="bg-white/5">
        <CardHeader>
          <CardTitle className="text-white">Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '400px', width: '100%' }}>
            <EChartsWrapper option={option} />
          </div>
          {/* Taxa de Conversão - abaixo do gráfico */}
          <div className="mt-4 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border-4 border-green-500 bg-green-500/20">
              <div className="text-center">
                <div className="text-lg font-bold text-white">
                  {conversionRate.toFixed(1)}%
                </div>
                <div className="text-xs text-green-300">Conversão</div>
              </div>
            </div>
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

