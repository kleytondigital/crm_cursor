'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Kanban, Headphones, Calendar } from 'lucide-react'

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
]

export default function BottomNavigation() {
  const pathname = usePathname()

  // Filtrar itens baseado no role (se necessário)
  const filteredItems = navigationItems.filter((item) => {
    // Adicionar lógica de filtro se necessário
    return true
  })

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

