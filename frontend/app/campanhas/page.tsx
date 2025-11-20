'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'
import { Campaign, CampaignStatus, ScheduledContentType } from '@/types'
import { schedulerAPI, connectionsAPI, leadsAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Trash2,
  Loader2,
  Image,
  FileText,
  Music,
  Edit,
} from 'lucide-react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { useSchedulerSocket } from '@/hooks/useSchedulerSocket'

export default function CampanhasPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [connections, setConnections] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    filterTags: [] as string[],
    filterStages: [] as string[],
    scheduledDate: '',
    scheduledTime: '',
    contentType: 'TEXT' as ScheduledContentType,
    content: '',
    caption: '',
    connectionId: '',
    useRandomConnection: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      const data = await schedulerAPI.getCampaigns()
      setCampaigns(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('Erro ao carregar campanhas:', err)
      setError('Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }, [])

  // Conectar ao WebSocket para receber atualizações em tempo real
  useSchedulerSocket({
    onCampaignUpdated: (data) => {
      // Atualizar campanha quando houver mudança
      if (data.campaign) {
        setCampaigns((prev) =>
          prev.map((campaign) =>
            campaign.id === data.campaign?.id ? { ...campaign, ...data.campaign } : campaign,
          ),
        )
      }
    },
    onScheduledSent: () => {
      // Recarregar campanhas quando uma mensagem for enviada (pode ter mudado o status)
      setTimeout(() => {
        loadCampaigns()
      }, 1000)
    },
  })

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    loadCampaigns()
    loadConnections()
    loadLeads()
  }, [router, loadCampaigns])

  const loadConnections = async () => {
    try {
      const data = await connectionsAPI.getAll()
      const activeConnections = Array.isArray(data)
        ? data.filter((conn: any) => conn.status === 'ACTIVE')
        : []
      setConnections(activeConnections)
      
      if (activeConnections.length > 0 && !formData.connectionId) {
        setFormData((prev) => ({ ...prev, connectionId: activeConnections[0].id }))
      }
    } catch (err: any) {
      console.error('Erro ao carregar conexões:', err)
    }
  }

  const loadLeads = async () => {
    try {
      const data = await leadsAPI.getAll()
      const leadsData = Array.isArray(data) ? data : []
      setLeads(leadsData)
      
      // Extrair tags únicas
      const uniqueTags = new Set<string>()
      leadsData.forEach((lead: any) => {
        if (lead.tags && Array.isArray(lead.tags)) {
          lead.tags.forEach((tag: string) => uniqueTags.add(tag))
        }
      })
      setTags(Array.from(uniqueTags))
    } catch (err: any) {
      console.error('Erro ao carregar leads:', err)
    }
  }

  const handleOpenDialog = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign)
      const scheduledDate = new Date(campaign.scheduledFor)
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        filterTags: campaign.filterTags || [],
        filterStages: campaign.filterStages || [],
        scheduledDate: format(scheduledDate, 'yyyy-MM-dd'),
        scheduledTime: format(scheduledDate, 'HH:mm'),
        contentType: campaign.contentType,
        content: campaign.content || '',
        caption: campaign.caption || '',
        connectionId: campaign.connectionId || '',
        useRandomConnection: campaign.useRandomConnection,
      })
    } else {
      setEditingCampaign(null)
      const now = new Date()
      now.setHours(now.getHours() + 1)
      now.setMinutes(0)
      setFormData({
        name: '',
        description: '',
        filterTags: [],
        filterStages: [],
        scheduledDate: format(now, 'yyyy-MM-dd'),
        scheduledTime: format(now, 'HH:mm'),
        contentType: 'TEXT',
        content: '',
        caption: '',
        connectionId: connections[0]?.id || '',
        useRandomConnection: false,
      })
    }
    setError(null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingCampaign(null)
    setFormData({
      name: '',
      description: '',
      filterTags: [],
      filterStages: [],
      scheduledDate: '',
      scheduledTime: '',
      contentType: 'TEXT',
      content: '',
      caption: '',
      connectionId: '',
      useRandomConnection: false,
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Digite o nome da campanha')
      return
    }

    if (!formData.scheduledDate || !formData.scheduledTime) {
      setError('Selecione data e hora')
      return
    }

    if (formData.contentType === 'TEXT' && !formData.content.trim()) {
      setError('Digite a mensagem')
      return
    }

    if (formData.contentType !== 'TEXT' && !formData.content) {
      setError('Selecione um arquivo')
      return
    }

    try {
      setSubmitting(true)

      const scheduledFor = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
      const now = new Date()

      if (scheduledFor <= now) {
        setError('A data/hora deve ser no futuro')
        setSubmitting(false)
        return
      }

      if (editingCampaign) {
        // TODO: Implementar edição de campanha
        setError('Edição de campanha ainda não implementada')
      } else {
        await schedulerAPI.createCampaign({
          name: formData.name,
          description: formData.description || undefined,
          filterTags: formData.filterTags,
          filterStages: formData.filterStages,
          scheduledFor: scheduledFor.toISOString(),
          contentType: formData.contentType,
          content: formData.content || undefined,
          caption: formData.caption || undefined,
          connectionId: formData.connectionId || undefined,
          useRandomConnection: formData.useRandomConnection,
        })
      }

      await loadCampaigns()
      handleCloseDialog()
    } catch (err: any) {
      console.error('Erro ao salvar campanha:', err)
      setError(err.response?.data?.message || 'Erro ao salvar campanha')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRunCampaign = async (id: string) => {
    if (!confirm('Tem certeza que deseja executar esta campanha agora?')) {
      return
    }

    try {
      await schedulerAPI.runCampaign(id)
      await loadCampaigns()
    } catch (err: any) {
      console.error('Erro ao executar campanha:', err)
      alert('Erro ao executar campanha: ' + (err.response?.data?.message || 'Erro desconhecido'))
    }
  }

  const handleCancelCampaign = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta campanha?')) {
      return
    }

    try {
      await schedulerAPI.cancelCampaign(id)
      await loadCampaigns()
    } catch (err: any) {
      console.error('Erro ao cancelar campanha:', err)
      alert('Erro ao cancelar campanha: ' + (err.response?.data?.message || 'Erro desconhecido'))
    }
  }

  const getStatusIcon = (status: CampaignStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-text-muted" />
      case 'RUNNING':
        return <Play className="h-5 w-5 text-blue-400" />
      case 'SCHEDULED':
        return <Clock className="h-5 w-5 text-amber-400" />
      default:
        return <Clock className="h-5 w-5 text-text-muted" />
    }
  }

  const getStatusLabel = (status: CampaignStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'Rascunho'
      case 'SCHEDULED':
        return 'Agendada'
      case 'RUNNING':
        return 'Em Execução'
      case 'COMPLETED':
        return 'Concluída'
      case 'CANCELLED':
        return 'Cancelada'
      default:
        return status
    }
  }

  const getContentTypeIcon = (type: ScheduledContentType) => {
    switch (type) {
      case 'IMAGE':
        return <Image className="h-4 w-4" />
      case 'AUDIO':
        return <Music className="h-4 w-4" />
      case 'DOCUMENT':
        return <FileText className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background-base">
      <Navigation />
      <main className="mx-auto max-w-7xl px-3 md:px-6 py-4 md:py-8 pb-20 md:pb-8">
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Campanhas</h1>
            <p className="text-xs md:text-sm text-text-muted">Gerencie campanhas de mensagens em massa</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nova Campanha
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-secondary" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background-subtle/40 p-12">
            <Calendar className="h-12 w-12 text-text-muted/60" />
            <p className="mt-4 text-sm text-text-muted">Nenhuma campanha cadastrada</p>
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="rounded-2xl border border-white/5 bg-background-muted/60 p-4 shadow-inner-glow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(campaign.status)}
                    <h3 className="font-semibold text-white">{campaign.name}</h3>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-text-muted" />
                    <span className="text-text-muted">
                      {campaign.totalLeads} {campaign.totalLeads === 1 ? 'lead' : 'leads'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-text-muted" />
                    <span className="text-text-muted">
                      {format(new Date(campaign.scheduledFor), "dd 'de' MMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getContentTypeIcon(campaign.contentType)}
                    <span className="text-text-muted capitalize">
                      {campaign.contentType.toLowerCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Status: </span>
                    <span
                      className={
                        campaign.status === 'COMPLETED'
                          ? 'text-emerald-400'
                          : campaign.status === 'RUNNING'
                          ? 'text-blue-400'
                          : campaign.status === 'SCHEDULED'
                          ? 'text-amber-400'
                          : 'text-text-muted'
                      }
                    >
                      {getStatusLabel(campaign.status)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {campaign.status === 'SCHEDULED' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRunCampaign(campaign.id)}
                      className="flex-1 gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Executar
                    </Button>
                  )}
                  {(campaign.status === 'SCHEDULED' || campaign.status === 'DRAFT') && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelCampaign(campaign.id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: Campanha de Boas-vindas"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da campanha..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Filtros por Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const newTags = formData.filterTags.includes(tag)
                            ? formData.filterTags.filter((t) => t !== tag)
                            : [...formData.filterTags, tag]
                          setFormData({ ...formData, filterTags: newTags })
                        }}
                        className={`rounded-full px-3 py-1 text-xs transition ${
                          formData.filterTags.includes(tag)
                            ? 'bg-brand-secondary text-white'
                            : 'bg-background-muted text-text-muted hover:bg-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Filtros por Estágio</Label>
                  <div className="flex flex-wrap gap-2">
                    {['NOVO', 'EM_ATENDIMENTO', 'AGUARDANDO', 'CONCLUIDO'].map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => {
                          const newStages = formData.filterStages.includes(stage)
                            ? formData.filterStages.filter((s) => s !== stage)
                            : [...formData.filterStages, stage]
                          setFormData({ ...formData, filterStages: newStages })
                        }}
                        className={`rounded-full px-3 py-1 text-xs transition ${
                          formData.filterStages.includes(stage)
                            ? 'bg-brand-secondary text-white'
                            : 'bg-background-muted text-text-muted hover:bg-white/10'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Tipo de Conteúdo *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['TEXT', 'IMAGE', 'AUDIO', 'DOCUMENT'] as ScheduledContentType[]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, contentType: type, content: '' })
                        }}
                        className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                          formData.contentType === type
                            ? 'border-brand-secondary bg-brand-primary/20 text-white'
                            : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {getContentTypeIcon(type)}
                        <span className="text-xs capitalize">{type.toLowerCase()}</span>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {formData.contentType === 'TEXT' ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="content">Mensagem *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    placeholder="Digite a mensagem..."
                    rows={4}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="content">URL do Arquivo *</Label>
                    <Input
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="caption">Legenda (opcional)</Label>
                    <Textarea
                      id="caption"
                      value={formData.caption}
                      onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                      placeholder="Digite uma legenda..."
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="connection">Conexão</Label>
                <select
                  id="connection"
                  value={formData.connectionId}
                  onChange={(e) => setFormData({ ...formData, connectionId: e.target.value })}
                  className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                >
                  <option value="">Selecione uma conexão (opcional)</option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name} ({conn.sessionName})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="useRandomConnection"
                    checked={formData.useRandomConnection}
                    onChange={(e) =>
                      setFormData({ ...formData, useRandomConnection: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-white/10 bg-background-muted text-brand-secondary focus:ring-brand-secondary"
                  />
                  <Label htmlFor="useRandomConnection" className="cursor-pointer text-sm">
                    Usar conexão aleatória
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    required
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="time">Hora *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="secondary" onClick={handleCloseDialog} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingCampaign ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  )
}

