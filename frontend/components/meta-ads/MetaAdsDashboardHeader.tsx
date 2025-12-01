'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

interface MetaAdsDashboardHeaderProps {
  dateStart: string
  dateEnd: string
  onDateChange: (start: string, end: string) => void
  onReset?: () => void
}

export default function MetaAdsDashboardHeader({
  dateStart,
  dateEnd,
  onDateChange,
  onReset,
}: MetaAdsDashboardHeaderProps) {
  const [localDateStart, setLocalDateStart] = useState(dateStart)
  const [localDateEnd, setLocalDateEnd] = useState(dateEnd)

  const handleDateChange = () => {
    onDateChange(localDateStart, localDateEnd)
  }

  const formatDateRange = (start: string, end: string) => {
    try {
      const startDate = parseISO(start)
      const endDate = parseISO(end)
      return `${format(startDate, "d 'de' MMM 'de' yyyy")} - ${format(endDate, 'd')}`
    } catch {
      return `${start} - ${end}`
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center md:justify-between">
      {/* Logo à esquerda */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white md:text-3xl">MASTER INSIGHTS</h1>
      </div>

      {/* Filtros e botões */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filtro de Data */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={localDateStart}
            onChange={(e) => setLocalDateStart(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
          <span className="text-text-muted">até</span>
          <input
            type="date"
            value={localDateEnd}
            onChange={(e) => setLocalDateEnd(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
          />
          <Button
            size="sm"
            onClick={handleDateChange}
            className="bg-primary text-white hover:bg-primary/90"
          >
            Aplicar
          </Button>
        </div>

        {/* Placeholder para filtros futuros (Cliente, Campanha, Conjunto) */}
        {/* <select className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white">
          <option>Cliente</option>
        </select>
        <select className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white">
          <option>Campanha</option>
        </select>
        <select className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white">
          <option>Conjunto de anúncios</option>
        </select> */}

        {/* Botões */}
        <div className="flex items-center gap-2">
          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Redefinir
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

