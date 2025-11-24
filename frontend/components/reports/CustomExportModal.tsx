'use client'

import { useState } from 'react'
import { X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { reportsAPI, ReportsFilter } from '@/lib/api/reports'

interface CustomExportModalProps {
  isOpen: boolean
  onClose: () => void
  filters: ReportsFilter
}

const exportOptions = {
  overview: {
    label: 'Métricas Gerais',
    description: 'Total de leads, convertidos, atendimentos, mensagens, etc.',
    default: true,
  },
  leads: {
    label: 'Dados de Leads',
    description: 'Leads por período, status, origem',
    default: true,
  },
  conversion: {
    label: 'Dados de Conversão',
    description: 'Conversão por atendente, taxas',
    default: true,
  },
  attendance: {
    label: 'Dados de Atendimento',
    description: 'Métricas de atendimento por atendente',
    default: true,
  },
  campaigns: {
    label: 'Dados de Campanhas',
    description: 'Métricas de campanhas',
    default: false,
  },
  journey: {
    label: 'Jornada do Lead',
    description: 'Fluxo de conversão e etapas',
    default: false,
  },
  messages: {
    label: 'Dados de Mensagens',
    description: 'Mensagens manuais vs automáticas',
    default: false,
  },
  scheduled: {
    label: 'Dados de Agendamentos',
    description: 'Mensagens agendadas e execuções',
    default: false,
  },
}

export default function CustomExportModal({
  isOpen,
  onClose,
  filters,
}: CustomExportModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>(
    Object.keys(exportOptions).reduce((acc, key) => {
      acc[key] = exportOptions[key as keyof typeof exportOptions].default
      return acc
    }, {} as Record<string, boolean>)
  )
  const [format, setFormat] = useState<'csv' | 'excel'>('excel')
  const [exporting, setExporting] = useState(false)

  if (!isOpen) return null

  const toggleOption = (key: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleExport = async () => {
    const selectedCount = Object.values(selectedOptions).filter(Boolean).length
    if (selectedCount === 0) {
      alert('Selecione pelo menos uma opção para exportar')
      return
    }

    setExporting(true)
    try {
      // Por enquanto, vamos exportar tudo e depois podemos melhorar para exportar apenas o selecionado
      // Isso requereria mudanças no backend para aceitar quais métricas exportar
      await reportsAPI.export(filters, format)
      onClose()
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert('Erro ao exportar relatório. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/5 bg-background-subtle/90 p-6 shadow-inner-glow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Exportação Personalizada</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-white/10 bg-background-muted/80 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary flex items-center justify-center transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-semibold text-white mb-2 block">
              Formato de Exportação
            </label>
            <div className="flex gap-2">
              <Button
                variant={format === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('csv')}
                className="border-white/10 bg-background-muted/80"
              >
                CSV
              </Button>
              <Button
                variant={format === 'excel' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('excel')}
                className="border-white/10 bg-background-muted/80"
              >
                Excel
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-white mb-3 block">
              Selecione as Métricas para Exportar
            </label>
            <div className="space-y-2">
              {Object.entries(exportOptions).map(([key, option]) => (
                <div
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-background-muted/40 hover:border-brand-secondary/40 transition-colors cursor-pointer"
                  onClick={() => toggleOption(key)}
                >
                  <input
                    type="checkbox"
                    checked={selectedOptions[key]}
                    onChange={() => toggleOption(key)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-background-muted text-brand-primary focus:ring-brand-primary"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{option.label}</div>
                    <div className="text-xs text-text-muted mt-1">{option.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/10 bg-background-muted/80"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || Object.values(selectedOptions).every((v) => !v)}
            className="bg-brand-primary text-white gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

