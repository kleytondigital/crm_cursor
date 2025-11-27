'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CompaniesManager from '@/components/admin/CompaniesManager'
import UsersManager from '@/components/admin/UsersManager'
import WorkflowTemplatesManager from '@/components/admin/WorkflowTemplatesManager'
import ApiKeysManager from '@/components/admin/ApiKeysManager'
import SystemSettingsManager from '@/components/admin/SystemSettingsManager'
import { Building2, Users, LayoutDashboard, LogOut, Bot, Key, Sliders } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Section = 'settings' | 'companies' | 'users' | 'workflows' | 'api-keys'

export default function SaasDashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | 'USER' | 'SUPER_ADMIN' | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [selectedSection, setSelectedSection] = useState<Section>('settings')

  useEffect(() => {
    setMounted(true)
    const storedToken = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    setToken(storedToken)
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserRole(user.role || null)
        setUserName(user.name || '')
        
        // Apenas SUPER_ADMIN pode acessar esta página
        if (user.role !== 'SUPER_ADMIN') {
          router.push('/')
          return
        }
      } catch (error) {
        console.error('Erro ao obter dados do usuário:', error)
      }
    }
    
    if (!storedToken) {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!mounted || !token || userRole !== 'SUPER_ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-white">Carregando...</p>
        </div>
      </div>
    )
  }

  const sections = [
    { id: 'settings' as Section, label: 'Configurações', icon: Sliders },
    { id: 'companies' as Section, label: 'Empresas', icon: Building2 },
    { id: 'users' as Section, label: 'Usuários', icon: Users },
    { id: 'workflows' as Section, label: 'Automações', icon: Bot },
    { id: 'api-keys' as Section, label: 'API Keys', icon: Key },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header isolado para Super Admin */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background-subtle/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-secondary">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Gestão SaaS</h1>
              <p className="text-xs text-text-muted">Painel de Super Administrador</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{userName}</p>
              <p className="text-xs text-text-muted">Super Administrador</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="gap-2 text-text-muted hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 pb-8 pt-6">
        <div className="flex gap-4 rounded-3xl border border-white/5 bg-background-subtle/80 p-1 shadow-inner-glow">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = selectedSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-primary/20 text-white shadow-glow'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            )
          })}
        </div>

        <div className="rounded-3xl border border-white/5 bg-background-subtle/80 p-6 shadow-inner-glow">
          {selectedSection === 'settings' && <SystemSettingsManager />}
          {selectedSection === 'companies' && <CompaniesManager />}
          {selectedSection === 'users' && <UsersManager />}
          {selectedSection === 'workflows' && <WorkflowTemplatesManager />}
          {selectedSection === 'api-keys' && <ApiKeysManager />}
        </div>
      </main>
    </div>
  )
}




