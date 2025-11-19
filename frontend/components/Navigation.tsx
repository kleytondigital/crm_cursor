'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
} from 'lucide-react'

const navigationItems = [
  { href: '/', label: 'Chats', icon: MessageCircle },
  { href: '/connections', label: 'Conexões', icon: Share2, adminOnly: true },
  { href: '/kanban', label: 'Pipeline', icon: Kanban },
  { href: '/pipeline', label: 'Estágios', icon: Sliders, adminOnly: true },
  { href: '/attendances', label: 'Atendimentos', icon: Headphones },
  { href: '/campanhas', label: 'Campanhas', icon: Calendar },
  { href: '/automacoes', label: 'Automações', icon: Bot, adminOnly: true },
  { href: '/gestor', label: 'Gestor', icon: LayoutDashboard, adminOnly: true },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | 'USER' | 'SUPER_ADMIN' | null>(null)

  useEffect(() => {
    // Obter role do usuário do localStorage
    if (typeof window !== 'undefined') {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          setUserRole(user.role || null)
        }
      } catch (error) {
        console.error('Erro ao obter role do usuário:', error)
      }
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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-background-muted/60 px-4 py-2 shadow-inner-glow">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/10 text-brand-secondary">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-text-muted">B2X CRM</p>
              <p className="text-sm font-semibold text-white">Soluções em atendimento</p>
            </div>
          </div>

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

        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full bg-brand-primary/80 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary/70"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </nav>
  )
}

