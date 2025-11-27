'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { LineChart, User, Calendar, Package } from 'lucide-react'
import { useSystemSettings } from '@/hooks/useSystemSettings'

export default function Footer() {
  const [userName, setUserName] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<string>('')
  const { settings } = useSystemSettings()
  const appVersion = settings.version || process.env.NEXT_PUBLIC_VERSION_APP || '1.0.0'

  useEffect(() => {
    // Obter nome do usuário do localStorage
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserName(user.name || user.email || 'Usuário')
      } catch (error) {
        console.error('Erro ao parsear usuário:', error)
        setUserName('Usuário')
      }
    }

    // Atualizar data atual
    setCurrentDate(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
  }, [])

  return (
    <footer className="sticky bottom-0 z-40 border-t border-white/5 bg-background-subtle/85 backdrop-blur-xl hidden lg:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 md:px-6 py-2 md:py-2.5">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          {/* Informações do usuário */}
          <div className="flex items-center gap-1.5 md:gap-2 rounded-lg border border-white/10 bg-background-muted/60 px-2 md:px-3 py-1 md:py-1.5 shadow-inner-glow">
            <User className="h-3 w-3 md:h-3.5 md:w-3.5 text-brand-secondary flex-shrink-0" />
            <span className="text-[10px] md:text-xs font-medium text-text-muted truncate max-w-[120px] md:max-w-none">
              {userName}
            </span>
          </div>

          {/* Data atual - esconder no mobile */}
          <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-background-muted/60 px-3 py-1.5 shadow-inner-glow md:flex">
            <Calendar className="h-3.5 w-3.5 text-brand-secondary" />
            <span className="text-xs font-medium text-text-muted">
              {currentDate}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          {/* Status do sistema */}
          <div className="flex items-center gap-1.5 md:gap-2 rounded-lg border border-white/10 bg-background-muted/60 px-2 md:px-3 py-1 md:py-1.5 shadow-inner-glow">
            <LineChart className="h-3 w-3 md:h-3.5 md:w-3.5 text-brand-secondary flex-shrink-0" />
            <span className="text-[10px] md:text-xs font-medium text-text-muted hidden sm:inline">
              Status:
            </span>
            <span className="text-[10px] md:text-xs font-semibold text-white truncate">
              Operação Estável
            </span>
          </div>

          {/* Versão do sistema */}
          <div className="flex items-center gap-1.5 md:gap-2 rounded-lg border border-white/10 bg-background-muted/60 px-2 md:px-3 py-1 md:py-1.5 shadow-inner-glow">
            <Package className="h-3 w-3 md:h-3.5 md:w-3.5 text-brand-secondary flex-shrink-0" />
            <span className="text-[10px] md:text-xs font-medium text-text-muted">
              v{appVersion}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

