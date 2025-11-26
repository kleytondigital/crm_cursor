'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Plus, Power, PowerOff, Settings, Trash2, Link2, TestTube, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest, companiesAPI } from '@/lib/api'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'
import ConfigureTemplateModal from '@/components/admin/ConfigureTemplateModal'
import PromptConfigModal from '@/components/admin/PromptConfigModal'
import ManageAutomationConnectionsModal from '@/components/admin/ManageAutomationConnectionsModal'
import AutomationsPasswordModal from '@/components/admin/AutomationsPasswordModal'
import {
  AUTOMATIONS_UNLOCKED_KEY,
  AUTOMATIONS_UNLOCKED_EVENT,
} from '@/constants/automations'

interface WorkflowTemplate {
  id: string
  name: string
  description?: string
  category?: string
  icon?: string
  variables: Record<string, any>
}

interface WorkflowInstance {
  id: string
  name: string
  isActive: boolean
  webhookUrl?: string
  config?: Record<string, any>
  generatedPrompt?: string | null
  testMode?: boolean
  testPhone?: string | null
  template: {
    id: string
    name: string
    category?: string
    icon?: string
    variables?: Record<string, any>
  }
  aiAgent?: {
    id: string
    name: string
  }
  createdAt: string
}

export default function AutomacoesPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [view, setView] = useState<'instances' | 'templates'>('instances')
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [instances, setInstances] = useState<WorkflowInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [showConfigureModal, setShowConfigureModal] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [showConnectionsModal, setShowConnectionsModal] = useState(false)
  const [automationsEnabled, setAutomationsEnabled] = useState<boolean | null>(null)
  const [accessLoading, setAccessLoading] = useState(true)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const hasAutomationsAccess = (automationsEnabled ?? false) || isUnlocked

  useEffect(() => {
    setMounted(true)
    const storedToken = localStorage.getItem('token')
    setToken(storedToken)

    if (!storedToken) {
      router.push('/login')
      return
    }

    const unlocked = sessionStorage.getItem(AUTOMATIONS_UNLOCKED_KEY) === 'true'
    setIsUnlocked(unlocked)
    fetchAutomationsAccess()
  }, [router])

  useEffect(() => {
    if (!token || !hasAutomationsAccess) {
      return
    }
    loadData()
  }, [token, hasAutomationsAccess])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!event.shiftKey) return
      if (event.code === 'F2') {
        event.preventDefault()
        setShowPasswordModal(true)
      } else if (event.code === 'F4') {
        event.preventDefault()
        sessionStorage.removeItem(AUTOMATIONS_UNLOCKED_KEY)
        setIsUnlocked(false)
        window.dispatchEvent(
          new CustomEvent(AUTOMATIONS_UNLOCKED_EVENT, { detail: { unlocked: false } })
        )
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  const fetchAutomationsAccess = async () => {
    try {
      setAccessLoading(true)
      const response = await companiesAPI.getAutomationsAccess()
      const enabled = response?.automationsEnabled ?? false
      setAutomationsEnabled(enabled)

      if (enabled) {
        sessionStorage.setItem(AUTOMATIONS_UNLOCKED_KEY, 'true')
        setIsUnlocked(true)
        window.dispatchEvent(
          new CustomEvent(AUTOMATIONS_UNLOCKED_EVENT, { detail: { unlocked: true } })
        )
      }
    } catch (error) {
      console.error('Erro ao verificar acesso às automações:', error)
      setAutomationsEnabled(false)
    } finally {
      setAccessLoading(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar templates
      const templatesData = await apiRequest<WorkflowTemplate[]>('/workflow-templates')
      setTemplates(templatesData)

      // Carregar instâncias
      const instancesData = await apiRequest<WorkflowInstance[]>('/workflow-templates/instances/all')
      setInstances(instancesData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleActivateInstance = async (id: string, activate: boolean) => {
    try {
      const endpoint = activate ? 'activate' : 'deactivate'
      
      await apiRequest(`/workflow-templates/instances/${id}/${endpoint}`, {
        method: 'POST',
      })

      loadData()
    } catch (error) {
      console.error('Erro ao ativar/desativar:', error)
      alert('Erro ao alterar status da automação')
    }
  }

  const handleToggleTestMode = async (id: string, enabled: boolean) => {
    try {
      // Se estiver ativando, perguntar o telefone
      if (enabled) {
        const phone = prompt('Digite o telefone para modo teste (apenas números, ex: 5562999999999):')
        if (!phone) return // Usuário cancelou
        
        const cleanPhone = phone.replace(/[^\d]/g, '')
        if (cleanPhone.length !== 13 || !cleanPhone.startsWith('55')) {
          alert('Telefone inválido. Deve ter 13 dígitos no formato 5562999999999 (código do país + DDD + número)')
          return
        }

        await apiRequest(`/workflow-templates/instances/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            testMode: true,
            testPhone: `${cleanPhone}@c.us`,
          }),
        })
      } else {
        await apiRequest(`/workflow-templates/instances/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            testMode: false,
          }),
        })
      }

      await loadData()
    } catch (error: any) {
      console.error('Erro ao atualizar modo teste:', error)
      alert(error.message || 'Erro ao atualizar modo teste')
    }
  }

  const handleDeleteInstance = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta automação?')) {
      return
    }

    try {
      await apiRequest(`/workflow-templates/instances/${id}`, {
        method: 'DELETE',
      })

      loadData()
    } catch (error) {
      console.error('Erro ao remover:', error)
      alert('Erro ao remover automação')
    }
  }

  const handleConfigureTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
    setShowConfigureModal(true)
  }

  const handleConfigureSuccess = () => {
    loadData()
    setShowConfigureModal(false)
    setSelectedTemplate(null)
    setView('instances')
  }

  if (!mounted || !token) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 md:gap-6 px-3 md:px-6 pb-20 md:pb-8 pt-4 md:pt-6">
        {accessLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-2xl border border-white/10 bg-background-muted/80 px-6 py-8 text-center text-text-muted">
              Verificando permissões de automação...
            </div>
          </div>
        ) : !hasAutomationsAccess ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-2xl rounded-3xl border border-dashed border-white/10 bg-background-subtle/70 p-8 text-center shadow-inner-glow">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-secondary">
                <Lock className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-white">Automações bloqueadas</h1>
              <p className="mt-2 text-sm text-text-muted">
                Este tenant não possui acesso às automações ou ainda não foi autenticado com a
                senha de desbloqueio.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-sm text-text-muted">
                <p>• Pressione <span className="font-semibold text-white">Shift + F2</span> para abrir o menu de automações</p>
                <p>• Pressione <span className="font-semibold text-white">Shift + F4</span> para ocultar novamente</p>
              </div>
              <Button
                className="mt-6 gap-2 bg-brand-primary text-white"
                onClick={() => setShowPasswordModal(true)}
              >
                <Lock className="h-4 w-4" />
                Inserir senha de acesso
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">Automações</h1>
                <p className="text-sm text-text-muted">
                  Gerencie suas automações com IA e n8n
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 rounded-3xl border border-white/5 bg-background-subtle/80 p-1 shadow-inner-glow">
              <button
                onClick={() => setView('instances')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                  view === 'instances'
                    ? 'bg-brand-primary/20 text-white shadow-glow'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <Bot className="h-4 w-4" />
                Minhas Automações
              </button>
              <button
                onClick={() => setView('templates')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                  view === 'templates'
                    ? 'bg-brand-primary/20 text-white shadow-glow'
                    : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <Plus className="h-4 w-4" />
                Criar Nova
              </button>
            </div>

            {loading ? (
              <div className="text-center text-white">Carregando...</div>
            ) : view === 'instances' ? (
              /* Minhas Automações */
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                className="rounded-2xl border border-white/10 bg-background-card/80 p-6 shadow-glow backdrop-blur-xl"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      instance.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-text-muted'
                    }`}>
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{instance.name}</h3>
                      <span className="text-xs text-text-muted">
                        {instance.template.category || 'Automação'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">Status:</span>
                    <span className={instance.isActive ? 'text-green-400' : 'text-text-muted'}>
                      {instance.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  
                  {/* Modo Teste */}
                  <div className="flex items-center justify-between rounded-lg border border-white/5 bg-background-muted/40 p-2">
                    <div className="flex items-center gap-2">
                      <TestTube className={`h-4 w-4 ${instance.testMode ? 'text-yellow-400' : 'text-text-muted'}`} />
                      <span className="text-xs text-text-muted">Modo Teste:</span>
                      <span className={`text-xs font-medium ${instance.testMode ? 'text-yellow-400' : 'text-text-muted'}`}>
                        {instance.testMode ? 'Ativado' : 'Desativado'}
                      </span>
                      {instance.testMode && instance.testPhone && (
                        <span className="text-xs text-text-muted ml-1">
                          ({instance.testPhone.replace('@c.us', '')})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleTestMode(instance.id, !instance.testMode)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
                        instance.testMode ? 'bg-yellow-500' : 'bg-white/10'
                      }`}
                      title={instance.testMode ? 'Desativar modo teste' : 'Ativar modo teste'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          instance.testMode ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {instance.webhookUrl && (
                    <div className="rounded bg-white/5 p-2 text-xs text-text-muted">
                      <span className="font-semibold">Webhook:</span>{' '}
                      <span className="break-all">{instance.webhookUrl}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleActivateInstance(instance.id, !instance.isActive)}
                    size="sm"
                    className={`flex-1 gap-2 ${
                      instance.isActive
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                  >
                    {instance.isActive ? (
                      <>
                        <PowerOff className="h-4 w-4" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4" />
                        Ativar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setSelectedInstance(instance)
                      setShowConnectionsModal(true)
                    }}
                    title="Gerenciar Conexões"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      setSelectedInstance(instance)
                      setShowPromptModal(true)
                    }}
                    title="Configurar Prompt"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteInstance(instance.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                  </div>
                ))}

                {instances.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background-card/40 p-12 text-center">
                    <Bot className="mb-4 h-16 w-16 text-text-muted" />
                    <h3 className="mb-2 text-lg font-semibold text-white">
                      Nenhuma automação ainda
                    </h3>
                    <p className="mb-6 text-sm text-text-muted">
                      Crie sua primeira automação a partir de um template
                    </p>
                    <Button
                      onClick={() => setView('templates')}
                      className="gap-2 bg-brand-primary text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Ver Templates
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Templates Disponíveis */
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                className="rounded-2xl border border-white/10 bg-background-card/80 p-6 shadow-glow backdrop-blur-xl transition hover:border-brand-primary/30"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-secondary">
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{template.name}</h3>
                      {template.category && (
                        <span className="text-xs text-text-muted">{template.category}</span>
                      )}
                    </div>
                  </div>
                </div>

                {template.description && (
                  <p className="mb-4 text-sm text-text-muted line-clamp-3">
                    {template.description}
                  </p>
                )}

                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="text-xs text-text-muted">
                    {Object.keys(template.variables).length} variáveis
                  </span>
                </div>

                <Button
                  className="w-full gap-2 bg-brand-primary text-white"
                  onClick={() => handleConfigureTemplate(template)}
                >
                  <Plus className="h-4 w-4" />
                  Usar Template
                </Button>
                  </div>
                ))}

                {templates.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background-card/40 p-12 text-center">
                <Bot className="mb-4 h-16 w-16 text-text-muted" />
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Nenhum template disponível
                </h3>
                <p className="text-sm text-text-muted">
                  Entre em contato com o administrador do sistema
                </p>
              </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      <BottomNavigation />

            {/* Modal de Configuração */}
            {showConfigureModal && selectedTemplate && (
              <ConfigureTemplateModal
                template={selectedTemplate}
                onClose={() => {
                  setShowConfigureModal(false)
                  setSelectedTemplate(null)
                }}
                onSuccess={handleConfigureSuccess}
              />
            )}

            {/* Modal de Configuração de Prompt */}
            {showPromptModal && selectedInstance && (
              <PromptConfigModal
                instance={selectedInstance}
                onClose={() => {
                  setShowPromptModal(false)
                  setSelectedInstance(null)
                }}
                onSuccess={() => {
                  loadData()
                }}
              />
            )}

            {/* Modal de Gerenciar Conexões */}
            {showConnectionsModal && selectedInstance && (
              <ManageAutomationConnectionsModal
                instance={selectedInstance}
                onClose={() => {
                  setShowConnectionsModal(false)
                  setSelectedInstance(null)
                }}
                onSuccess={() => {
                  loadData()
                }}
              />
            )}

      {/* Modal de Senha de Automações */}
      <AutomationsPasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          setIsUnlocked(true)
          sessionStorage.setItem(AUTOMATIONS_UNLOCKED_KEY, 'true')
          window.dispatchEvent(
            new CustomEvent(AUTOMATIONS_UNLOCKED_EVENT, { detail: { unlocked: true } })
          )
        }}
      />
    </div>
  )
}

