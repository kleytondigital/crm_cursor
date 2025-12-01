'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface CreativeItem {
  id: string
  name: string
  cpa: number
  spend: number
  messages: number
  clicks: number
  ctr: number
  adUrl?: string
}

interface CreativesTableProps {
  creatives: CreativeItem[]
}

export default function CreativesTable({ creatives }: CreativesTableProps) {
  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  const getHeatmapColor = (index: number, total: number) => {
    // Efeito heatmap: vermelho/laranja mais intenso no topo
    const intensity = 1 - index / total
    const red = Math.floor(239 + (255 - 239) * (1 - intensity))
    const green = Math.floor(68 + (149 - 68) * (1 - intensity))
    const blue = Math.floor(68 + (246 - 68) * (1 - intensity))
    return `rgba(${red}, ${green}, ${blue}, 0.15)`
  }

  return (
    <Card className="bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Criativo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                  Criativo
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-text-muted">
                  Ação
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">CPA</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                  Investim.
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">Men.</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                  Cliques
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">CTR</th>
              </tr>
            </thead>
            <tbody>
              {creatives.map((creative, index) => (
                <tr
                  key={creative.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/5"
                  style={{
                    backgroundColor: getHeatmapColor(index, creatives.length),
                  }}
                >
                  <td className="px-4 py-4 text-white">{creative.name}</td>
                  <td className="px-4 py-4 text-center">
                    {creative.adUrl ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary hover:text-primary/80"
                        onClick={() => window.open(creative.adUrl, '_blank')}
                      >
                        Ver agora
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-white">{formatCurrency(creative.cpa)}</td>
                  <td className="px-4 py-4 text-right text-white">
                    {formatCurrency(creative.spend)}
                  </td>
                  <td className="px-4 py-4 text-right text-white">{creative.messages}</td>
                  <td className="px-4 py-4 text-right text-white">{creative.clicks}</td>
                  <td className="px-4 py-4 text-right text-white">
                    {formatPercentage(creative.ctr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {creatives.length === 0 && (
            <div className="py-12 text-center text-text-muted">
              Nenhum criativo encontrado para o período selecionado.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

