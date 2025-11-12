'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { leadsAPI } from '@/lib/api'
import { Lead } from '@/types'
import { Loader2, MessageSquare, Phone, Tag, Calendar, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function LeadDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLead = async () => {
      try {
        setLoading(true)
        const response = await leadsAPI.getById(params.id)
        const data = response?.data ?? response
        setLead(data)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Não foi possível carregar os dados do lead')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchLead()
    }
  }, [params.id])

  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <Navigation />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 pb-10 pt-6">
        <button
          onClick={() => router.back()}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-text-muted transition hover:border-brand-secondary/40 hover:text-brand-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>

        <section className="rounded-3xl border border-white/5 bg-background-subtle/70 p-6 shadow-inner-glow">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-brand-secondary" />
              Carregando dados do lead...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : lead ? (
            <div className="flex flex-col gap-6">
              <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Lead</p>
                  <h1 className="text-3xl font-semibold text-white">{lead.name}</h1>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-brand-secondary/40 bg-brand-secondary/10 px-3 py-1 text-xs uppercase tracking-wide text-brand-secondary">
                    {lead.status.replace('_', ' ')}
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/?leadId=${lead.id}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-secondary px-4 py-2 text-sm font-semibold text-background transition hover:bg-brand-secondary/90"
                >
                  <MessageSquare className="h-4 w-4" />
                  Abrir chat
                </button>
              </header>

              <div className="grid gap-4 rounded-2xl border border-white/5 bg-white/5 p-5 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-brand-secondary" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Telefone</p>
                    <p className="text-white">{lead.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-brand-secondary" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Criado em</p>
                    <p className="text-white">{formatDate(lead.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-brand-secondary" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-text-muted">Atualizado em</p>
                    <p className="text-white">{formatDate(lead.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {lead.tags?.length ? (
                <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-wide text-text-muted">Tags</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {lead.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded-full bg-background-muted/70 px-3 py-1 text-[11px] uppercase tracking-wide text-text-muted"
                      >
                        <Tag className="h-3 w-3 text-brand-secondary" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-dashed border-white/10 bg-background-muted/40 px-4 py-6 text-sm text-text-muted">
                Informações adicionais, histórico de oportunidades e anexos poderão ser adicionados aqui em futuras
                iterações.
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}

