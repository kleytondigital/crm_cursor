'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { MessageCircle, Kanban, Headphones, Calendar, LayoutDashboard, BarChart3 } from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navigationItems: NavItem[] = [
  { href: '/', label: 'Conversas', icon: MessageCircle },
  { href: '/kanban', label: 'Pipeline', icon: Kanban },
  { href: '/attendances', label: 'Atendimentos', icon: Headphones },
  { href: '/campanhas', label: 'Campanhas', icon: Calendar },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart3, adminOnly: true },
  { href: '/gestor', label: 'Gestor', icon: LayoutDashboard, adminOnly: true },
]

export default function BottomNavigation() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | 'USER' | 'SUPER_ADMIN' | null>(null)

  useEffect(() => {
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

  // Filtrar itens baseado no role
  const filteredItems = useMemo(() => {
    if (userRole === 'SUPER_ADMIN') {
      return [] // Super Admin não vê itens do dashboard normal
    }
    const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER'
    return navigationItems.filter((item) => {
      if (item.adminOnly) return isAdmin
      return true
    })
  }, [userRole])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-background-subtle/95 backdrop-blur-xl lg:hidden">
      {/* Safe area para iOS */}
      <div
        className="flex items-center justify-around px-2 py-2"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[60px] flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                isActive
                  ? 'text-brand-secondary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title={item.label}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-brand-secondary' : ''}`} />
              <span className={`text-[10px] font-medium ${isActive ? 'text-brand-secondary' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-secondary" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

