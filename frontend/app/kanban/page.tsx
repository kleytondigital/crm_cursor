'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Settings } from 'lucide-react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import PipelineStageModal from '@/components/admin/PipelineStageModal'
import { PipelineStage, pipelineStagesAPI } from '@/lib/api/pipeline-stages'

// Carregar KanbanBoard apenas no cliente (react-beautiful-dnd não funciona com SSR)
const KanbanBoard = dynamic(() => import('@/components/KanbanBoard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-500">Carregando Kanban...</p>
    </div>
  ),
})

export default function KanbanPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showStageModal, setShowStageModal] = useState(false)
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!token) {
      router.push('/login')
      return
    }
    
    // Super Admin não pode acessar o dashboard normal
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserRole(user.role)
        if (user.role === 'SUPER_ADMIN') {
          router.push('/saas')
          return
        }
      } catch (error) {
        console.error('Erro ao verificar role do usuário:', error)
      }
    }

    // Carregar estágios
    loadStages()
  }, [router])

  const loadStages = async () => {
    try {
      const data = await pipelineStagesAPI.getAll()
      setStages(data.sort((a, b) => a.order - b.order))
    } catch (error) {
      console.error('Erro ao carregar estágios:', error)
    }
  }

  const handleStageSuccess = () => {
    setShowStageModal(false)
    setSelectedStage(null)
    loadStages()
    // Forçar refresh do Kanban
    setRefreshKey(prev => prev + 1)
  }

  const isAdmin = userRole === 'ADMIN' || userRole === 'MANAGER'

  if (!mounted) {
    return null
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  if (!token) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 pb-8 pt-6">
        <section className="overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-r from-background-muted to-background-card p-8 shadow-inner-glow">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-text-muted">Pipeline Neural</p>
              <h1 className="mt-3 text-3xl font-bold text-white">Kanban de Leads</h1>
              <p className="mt-2 max-w-2xl text-sm text-text-muted">
                Arraste oportunidades entre estágios, sincronize com o CRM e visualize o desempenho da equipe em tempo real.
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <button
                  onClick={() => {
                    setSelectedStage(null)
                    setShowStageModal(true)
                  }}
                  className="flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-5 py-3 text-sm font-medium text-brand-secondary transition hover:bg-brand-primary/20 hover:border-brand-primary/50 shadow-glow"
                  title="Gerenciar estágios do pipeline"
                >
                  <Settings className="h-4 w-4" />
                  Gerenciar Estágios
                </button>
              )}
              <div className="rounded-3xl border border-white/10 bg-background-muted/60 px-5 py-4 shadow-inner-glow">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-brand-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                    {stages.length} Estágios
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Pipeline ativo</p>
                    <p className="text-lg font-semibold text-white">Tempo Real</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col">
          <KanbanBoard 
            key={refreshKey}
            onEditStage={(stage) => {
              setSelectedStage(stage)
              setShowStageModal(true)
            }}
          />
        </section>
      </main>
      <Footer />

      {/* Modal de Gerenciamento de Estágios */}
      {showStageModal && (
        <PipelineStageModal
          stage={selectedStage}
          onClose={() => {
            setShowStageModal(false)
            setSelectedStage(null)
          }}
          onSuccess={handleStageSuccess}
        />
      )}
    </div>
  )
}
