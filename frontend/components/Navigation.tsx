'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import {
  LogOut,
  MessageCircle,
  Kanban,
  Share2,
  Zap,
  Headphones,
  LayoutDashboard,
  Calendar,
  Bot,
  Sliders,
  User,
  BarChart3,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

const navigationItems = [
  { href: '/', label: 'Chats', icon: MessageCircle },
  { href: '/connections', label: 'Conexões', icon: Share2, adminOnly: true },
  { href: '/kanban', label: 'Pipeline', icon: Kanban },
  { href: '/attendances', label: 'Atendimentos', icon: Headphones },
  { href: '/campanhas', label: 'Campanhas', icon: Calendar },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3, adminOnly: true },
  { href: '/gestor', label: 'Gestor', icon: LayoutDashboard, adminOnly: true },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | 'USER' | 'SUPER_ADMIN' | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<string>('')

  useEffect(() => {
    // Obter role do usuário do localStorage
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          setUserRole(user.role || null)
          setUserName(user.name || user.email || 'Usuário')
        }
      } catch (error) {
        console.error('Erro ao obter role do usuário:', error)
      }
      
      // Atualizar data atual
      setCurrentDate(format(new Date(), "dd 'de' MMMM", { locale: ptBR }))
    }
  }, [])

  // Filtrar itens de navegação baseado no role
  // Super Admin não deve ver esta navegação (tem seu próprio dashboard)
  const filteredNavigationItems = useMemo(() => {
    if (userRole === 'SUPER_ADMIN') {
      return [] // Super Admin não vê itens do dashboard normal
    }
    const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER'
    return navigationItems.filter((item) => {
      if (item.adminOnly) return isAdmin
      return true
    })
  }, [userRole])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-background-subtle/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col px-3 py-2 md:px-6 md:py-4">
        {/* Primeira linha: Logo e Logout (sempre visível) */}
        <div className="flex items-center justify-between gap-2 mb-2 md:mb-0">
          <div className="flex items-center gap-1.5 md:gap-2 rounded-full border border-white/10 bg-background-muted/60 px-2 py-1.5 md:px-4 md:py-2 shadow-inner-glow flex-shrink-0">
            <div className="flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full bg-brand-primary/10 text-brand-secondary flex-shrink-0">
              <Zap className="h-3 w-3 md:h-4 md:w-4" />
            </div>
            <div className="hidden sm:block min-w-0">
              <p className="text-[10px] md:text-xs uppercase tracking-wide text-text-muted truncate">B2X CRM</p>
              <p className="text-xs md:text-sm font-semibold text-white truncate">Soluções em atendimento</p>
            </div>
          </div>

          {/* Mobile: Usuário e Data */}
          {isMobile && (
            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
              <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-background-muted/60 px-2 py-1 shadow-inner-glow">
                <User className="h-3.5 w-3.5 text-brand-secondary flex-shrink-0" />
                <span className="text-[10px] font-medium text-text-muted truncate max-w-[100px]">
                  {userName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-background-muted/60 px-2 py-1 shadow-inner-glow">
                <Calendar className="h-3.5 w-3.5 text-brand-secondary flex-shrink-0" />
                <span className="text-[10px] font-medium text-text-muted">
                  {currentDate}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 md:gap-2 rounded-full bg-brand-primary/80 px-3 py-1.5 md:px-5 md:py-2 text-xs md:text-sm font-semibold text-white transition hover:bg-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/70 flex-shrink-0"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

        {/* Segunda linha: Navegação desktop - esconder no mobile */}
        <div className="hidden items-center gap-1 rounded-full border border-white/5 bg-background-muted/60 p-1 shadow-inner-glow lg:flex">
          {filteredNavigationItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-primary/20 text-white shadow-glow'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

