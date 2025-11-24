'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'
import { AttendancesProvider, useAttendances } from '@/contexts/AttendancesContext'
import DepartmentManager from '@/components/attendances/DepartmentManager'
import UserManager from '@/components/attendances/UserManager'
import LeadStatusManager from '@/components/admin/LeadStatusManager'
import {
  LayoutDashboard,
  Building2,
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  Settings,
  HelpCircle,
  X,
  ShieldAlert,
  Bot,
  Menu,
  Share2,
  Tag,
} from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

type MenuSection = 'dashboard' | 'departments' | 'users' | 'automations' | 'connections' | 'lead-status' | null

interface MenuItem {
  id: MenuSection
  label: string
  icon: React.ReactNode
  hasSubmenu?: boolean
  submenu?: { id: string; label: string }[]
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    id: 'departments',
    label: 'Departamentos',
    icon: <Building2 className="h-4 w-4" />,
    hasSubmenu: true,
    submenu: [
      { id: 'departments-list', label: 'Gerenciar Departamentos' },
      { id: 'departments-users', label: 'Usuários dos Departamentos' },
    ],
  },
  {
    id: 'users',
    label: 'Usuários',
    icon: <Users className="h-4 w-4" />,
  },
  {
    id: 'connections',
    label: 'Conexões',
    icon: <Share2 className="h-4 w-4" />,
  },
  {
    id: 'automations',
    label: 'Automações',
    icon: <Bot className="h-4 w-4" />,
  },
  {
    id: 'lead-status',
    label: 'Status de Leads',
    icon: <Tag className="h-4 w-4" />,
  },
]

// Busca inteligente de configurações
const configHelpItems = [
  {
    keywords: ['departamento', 'criar', 'adicionar', 'organizar'],
    title: 'Como criar um departamento?',
    description: 'Departamentos ajudam a organizar sua equipe. Vá em Departamentos > Gerenciar Departamentos e clique em "Novo departamento".',
    section: 'departments',
  },
  {
    keywords: ['usuário', 'adicionar', 'criar', 'membro', 'equipe'],
    title: 'Como adicionar um usuário?',
    description: 'Vá em Usuários e clique em "Novo usuário". Preencha nome, e-mail, senha e perfil (Agente, Gestor ou Administrador).',
    section: 'users',
  },
  {
    keywords: ['departamento', 'usuário', 'adicionar', 'atribuir', 'membro'],
    title: 'Como adicionar usuários a um departamento?',
    description: 'Em Departamentos > Gerenciar Departamentos, clique em "Gerenciar" no departamento desejado e adicione os membros.',
    section: 'departments',
  },
  {
    keywords: ['permissão', 'admin', 'gestor', 'agente', 'função'],
    title: 'Quais são as diferenças entre os perfis?',
    description: 'Administrador: acesso total. Gestor: pode gerenciar departamentos e usuários. Agente: acesso básico para atendimento.',
    section: 'users',
  },
  {
    keywords: ['status', 'lead', 'estágio', 'pipeline', 'qualificação'],
    title: 'Como criar status customizados para leads?',
    description: 'Vá em Status de Leads e clique em "Novo Status". Defina nome, descrição (importante para o agente de automação) e cor. A descrição ajuda o bot a entender quando usar cada status.',
    section: 'lead-status',
  },
  {
    keywords: ['remover', 'deletar', 'excluir', 'apagar'],
    title: 'Como remover um departamento ou usuário?',
    description: 'Use os botões "Remover" nos cards de departamentos ou usuários. Esta ação não pode ser desfeita.',
    section: 'dashboard',
  },
]

function GestorContent() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [selectedSection, setSelectedSection] = useState<MenuSection>('dashboard')
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)

  const { departments, users, loadingList } = useAttendances()

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return configHelpItems.filter((item) =>
      item.keywords.some((keyword) => keyword.toLowerCase().includes(query)) ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const handleMenuClick = (itemId: MenuSection) => {
    if (itemId === 'departments' && menuItems.find((m) => m.id === 'departments')?.hasSubmenu) {
      setExpandedMenus((prev) => {
        const newSet = new Set(prev)
        if (newSet.has('departments')) {
          newSet.delete('departments')
        } else {
          newSet.add('departments')
        }
        return newSet
      })
    } else {
      setSelectedSection(itemId)
      setExpandedMenus(new Set())
    }
  }

  const handleSubmenuClick = (submenuId: string) => {
    if (submenuId === 'departments-list') {
      setSelectedSection('departments')
    } else if (submenuId === 'departments-users') {
      setSelectedSection('departments')
    }
    setExpandedMenus(new Set())
  }

  const handleSearchSelect = (result: typeof configHelpItems[0]) => {
    setSearchQuery('')
    setShowSearchResults(false)
    if (result.section === 'departments') {
      setSelectedSection('departments')
    } else if (result.section === 'users') {
      setSelectedSection('users')
    } else {
      setSelectedSection('dashboard')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <Navigation />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 md:gap-6 px-3 md:px-6 pb-20 md:pb-10 pt-4 md:pt-6">
        {/* Menu Mobile - Acordeon */}
        {isMobile && (
          <div className="w-full lg:hidden">
            <div className="rounded-2xl border border-white/10 bg-background-subtle/60 shadow-inner-glow overflow-hidden">
              {menuItems.map((item) => {
                const isExpanded = expandedMenus.has(item.id || '')
                const isSelected = selectedSection === item.id
                
                return (
                  <div key={item.id} className="border-b border-white/5 last:border-b-0">
                    <button
                      onClick={() => {
                        if (item.hasSubmenu) {
                          // Toggle submenu
                          setExpandedMenus((prev) => {
                            const newSet = new Set(prev)
                            if (newSet.has(item.id || '')) {
                              newSet.delete(item.id || '')
                            } else {
                              newSet.clear()
                              newSet.add(item.id || '')
                            }
                            return newSet
                          })
                          if (!isExpanded) {
                            setSelectedSection(item.id)
                          }
                        } else {
                          // Selecionar seção diretamente
                          handleMenuClick(item.id)
                          setExpandedMenus(new Set())
                        }
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition ${
                        isSelected
                          ? 'bg-brand-primary/20 text-white'
                          : 'text-text-muted hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {item.hasSubmenu && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    
                    {/* Submenu items */}
                    {item.hasSubmenu && isExpanded && item.submenu && (
                      <div className="bg-background-muted/40 px-4 pb-2 space-y-1">
                        {item.submenu.map((subitem) => (
                          <button
                            key={subitem.id}
                            onClick={() => {
                              handleSubmenuClick(subitem.id)
                              setExpandedMenus(new Set())
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted transition hover:bg-white/5 hover:text-white"
                          >
                            <ChevronRight className="h-3 w-3" />
                            <span>{subitem.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sidebar */}
        <aside className="hidden w-[280px] shrink-0 flex-col gap-4 rounded-3xl border border-white/5 bg-background-subtle/60 p-5 shadow-inner-glow lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Painel Gestor</p>
            <h1 className="mt-2 text-lg font-semibold text-white">Visão Administrativa</h1>
            <p className="mt-1 text-xs text-text-muted">
              Gerencie departamentos, usuários e configurações do sistema.
            </p>
          </div>

          {/* Busca Inteligente */}
          <div className="relative">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSearchResults(e.target.value.length > 0)
                }}
                onFocus={() => {
                  if (searchQuery.length > 0) setShowSearchResults(true)
                }}
                placeholder="Buscar configurações..."
                className="w-full rounded-full border border-white/10 bg-background-muted/80 py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setShowSearchResults(false)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Resultados da busca */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-white/10 bg-background-subtle/95 p-2 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-text-muted">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Sugestões
                </div>
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearchSelect(result)}
                    className="w-full rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-left text-sm text-text-primary transition hover:border-brand-secondary/40 hover:bg-white/10"
                  >
                    <p className="font-semibold text-white">{result.title}</p>
                    <p className="mt-1 text-xs text-text-muted">{result.description}</p>
                  </button>
                ))}
              </div>
            )}
            {showSearchResults && searchQuery && searchResults.length === 0 && (
              <div className="absolute top-full z-50 mt-2 w-full rounded-2xl border border-white/10 bg-background-subtle/95 p-3 text-center text-sm text-text-muted shadow-lg backdrop-blur-md">
                Nenhuma configuração encontrada.
              </div>
            )}
          </div>

          {/* Menu Navigation */}
          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => handleMenuClick(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    selectedSection === item.id
                      ? 'border-brand-secondary/40 bg-brand-primary/20 text-white shadow-glow'
                      : 'border-white/5 bg-white/5 text-text-muted hover:border-brand-secondary/40 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.hasSubmenu && (
                    <span>
                      {expandedMenus.has(item.id || '') ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </button>
                {item.hasSubmenu && expandedMenus.has(item.id || '') && (
                  <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-white/10 pl-2">
                    {item.submenu?.map((subitem) => (
                      <button
                        key={subitem.id}
                        onClick={() => handleSubmenuClick(subitem.id)}
                        className="rounded-lg px-3 py-1.5 text-left text-xs text-text-muted transition hover:bg-white/5 hover:text-white"
                      >
                        {subitem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Estatísticas rápidas */}
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
            <div className="flex items-center justify-between text-text-muted">
              <span>Departamentos</span>
              <span className="font-semibold text-white">{departments.length}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-text-muted">
              <span>Usuários</span>
              <span className="font-semibold text-white">{users.length}</span>
            </div>
          </div>
        </aside>

        {/* Conteúdo principal */}
        <main className="flex-1 rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
          {selectedSection === 'dashboard' && (
            <div className="flex flex-col gap-4">
              <header>
                <h2 className="text-xl md:text-2xl font-semibold text-white">Dashboard do Gestor</h2>
                <p className="mt-1 text-xs md:text-sm text-text-muted">
                  Visão geral das configurações e estatísticas do sistema.
                </p>
              </header>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="rounded-2xl border border-white/5 bg-background-muted/60 p-5 shadow-inner-glow">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-brand-primary/20 p-3">
                      <Building2 className="h-6 w-6 text-brand-secondary" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">Departamentos</p>
                      <p className="text-2xl font-semibold text-white">{departments.length}</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-2xl border border-white/5 bg-background-muted/60 p-5 shadow-inner-glow">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-brand-primary/20 p-3">
                      <Users className="h-6 w-6 text-brand-secondary" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-text-muted">Usuários</p>
                      <p className="text-2xl font-semibold text-white">{users.length}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="rounded-2xl border border-dashed border-white/10 bg-background-muted/50 p-6 text-sm text-text-muted">
                <div className="flex items-start gap-3">
                  <Settings className="h-5 w-5 text-brand-secondary" />
                  <div>
                    <p className="font-semibold text-white">Começando</p>
                    <p className="mt-1">
                      Use o menu lateral para navegar entre as seções. A busca inteligente pode ajudá-lo a encontrar
                      configurações rapidamente.
                    </p>
                    <ul className="mt-3 list-disc list-inside space-y-1 text-xs">
                      <li>Crie departamentos para organizar sua equipe</li>
                      <li>Adicione usuários e atribua-os aos departamentos</li>
                      <li>Configure permissões e funções</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {selectedSection === 'departments' && <DepartmentManager />}
          {selectedSection === 'users' && <UserManager />}
          {selectedSection === 'connections' && (
            <div className="flex flex-col gap-4">
              <header>
                <h2 className="text-xl md:text-2xl font-semibold text-white">Conexões WhatsApp</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Gerencie conexões do WhatsApp conectadas ao sistema.
                </p>
              </header>
              <Card className="rounded-2xl border border-white/5 bg-background-muted/60 p-4 md:p-6 shadow-inner-glow">
                <div className="flex items-center justify-center py-8 md:py-12">
                  <div className="text-center">
                    <Share2 className="mx-auto h-12 w-12 md:h-16 md:w-16 text-brand-secondary opacity-50" />
                    <h3 className="mt-3 md:mt-4 text-lg font-semibold text-white">Gerenciar Conexões</h3>
                    <p className="mt-1 md:mt-2 text-sm text-text-muted max-w-md">
                      Configure e gerencie as conexões do WhatsApp para atendimento.
                    </p>
                    <button
                      onClick={() => router.push('/connections')}
                      className="mt-4 md:mt-6 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary-dark shadow-glow"
                    >
                      Acessar Conexões
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
          {selectedSection === 'automations' && (
            <div className="flex flex-col gap-4">
              <header>
                <h2 className="text-2xl font-semibold text-white">Automações</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Gerencie workflows automatizados e integrações com n8n.
                </p>
              </header>

              <Card className="rounded-2xl border border-white/5 bg-background-muted/60 p-6 shadow-inner-glow">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Bot className="mx-auto h-16 w-16 text-brand-secondary opacity-50" />
                    <h3 className="mt-4 text-lg font-semibold text-white">Automações IA</h3>
                    <p className="mt-2 text-sm text-text-muted max-w-md">
                      Configure workflows inteligentes com n8n para automatizar seu atendimento.
                    </p>
                    <button
                      onClick={() => router.push('/automacoes')}
                      className="mt-6 rounded-full bg-brand-primary px-6 py-3 text-sm font-medium text-white hover:bg-brand-primary-dark shadow-glow"
                    >
                      Acessar Automações
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}
          {selectedSection === 'lead-status' && <LeadStatusManager />}
        </main>
      </div>
      <Footer />
      <BottomNavigation />
    </div>
  )
}

export default function GestorPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | 'USER' | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Verificar autenticação e role
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          const role = user.role || null
          setUserRole(role)
          
          // Apenas ADMIN e MANAGER têm acesso
          if (role === 'ADMIN' || role === 'MANAGER') {
            setIsAuthorized(true)
          } else {
            // Redirecionar usuários não autorizados
            router.push('/')
          }
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Erro ao verificar permissões:', error)
        router.push('/login')
      }
    }
  }, [router])

  if (!mounted || !isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-background-subtle/60 p-8 shadow-inner-glow">
          <ShieldAlert className="h-12 w-12 text-rose-400" />
          <h2 className="text-xl font-semibold text-white">Acesso Negado</h2>
          <p className="text-sm text-text-muted">
            Você não possui permissão para acessar esta página.
          </p>
        </div>
      </div>
    )
  }

  return (
    <AttendancesProvider>
      <GestorContent />
    </AttendancesProvider>
  )
}
