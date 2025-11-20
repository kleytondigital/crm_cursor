'use client'

import { format, isToday, isYesterday, isSameYear } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

interface DateDividerProps {
  date: Date | string
}

export default function DateDivider({ date }: DateDividerProps) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  let dateText: string

  if (isToday(dateObj)) {
    dateText = 'Hoje'
  } else if (isYesterday(dateObj)) {
    dateText = 'Ontem'
  } else if (isSameYear(dateObj, new Date())) {
    // Mesmo ano: mostra dia e mês (ex: "15 de novembro")
    dateText = format(dateObj, "d 'de' MMMM", { locale: ptBR })
  } else {
    // Ano diferente: mostra dia, mês e ano (ex: "15 de novembro de 2024")
    dateText = format(dateObj, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  }

  return (
    <div className="flex items-center justify-center my-4 px-4">
      <div className="flex items-center gap-2 w-full max-w-[calc(100%-2rem)]">
        <div className="flex-1 h-px bg-white/10" />
        <div className="px-3 py-1.5 rounded-full bg-background-muted/60 border border-white/10 backdrop-blur-sm">
          <span className="text-xs font-medium text-text-muted whitespace-nowrap">
            {dateText}
          </span>
        </div>
        <div className="flex-1 h-px bg-white/10" />
      </div>
    </div>
  )
}

