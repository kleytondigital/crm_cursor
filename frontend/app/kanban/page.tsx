'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

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
        if (user.role === 'SUPER_ADMIN') {
          router.push('/saas')
          return
        }
      } catch (error) {
        console.error('Erro ao verificar role do usuário:', error)
      }
    }
  }, [router])

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
            <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-background-muted/60 px-5 py-4 shadow-inner-glow">
              <div className="rounded-full bg-brand-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Tempo Real
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Quadros ativos</p>
                <p className="text-lg font-semibold text-white">4 pipelines por equipe</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col">
          <KanbanBoard />
        </section>
      </main>
      <Footer />
    </div>
  )
}
