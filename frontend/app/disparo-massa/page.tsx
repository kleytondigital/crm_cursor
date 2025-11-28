'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'
import { bulkMessagingAPI, connectionsAPI } from '@/lib/api'
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
  Upload,
  Play,
  Pause,
  Square,
  Trash2,
  Loader2,
  FileText,
  Image,
  Music,
  File,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

type BulkCampaignStatus = 'DRAFT' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ERROR'
type ScheduledContentType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT'

interface BulkCampaign {
  id: string
  name: string
  description?: string
  contentType: ScheduledContentType
  content?: string
  caption?: string
  connectionId: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  pendingCount: number
  status: BulkCampaignStatus
  delayBetweenMessages: number
  delayBetweenNumbers: number
  startedAt?: string
  completedAt?: string
  pausedAt?: string
  lastProcessedIndex: number
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
  connection?: {
    id: string
    name: string
    sessionName: string
    provider: string
  }
}

export default function DisparoMassaPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<BulkCampaign | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<BulkCampaign | null>(null)
  const [connections, setConnections] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contentType: 'TEXT' as ScheduledContentType,
    content: '',
    caption: '',
    connectionId: '',
    delayBetweenMessages: 2000,
    delayBetweenNumbers: 5000,
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      const response = await bulkMessagingAPI.list({ status: statusFilter || undefined })
      setCampaigns(Array.isArray(response.data) ? response.data : [])
    } catch (err: any) {
      console.error('Erro ao carregar campanhas:', err)
      setError('Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    loadCampaigns()
    loadConnections()
  }, [router, loadCampaigns])

  // Atualizar campanhas a cada 5 segundos se houver alguma em execução
  useEffect(() => {
    const hasRunning = campaigns.some((c) => c.status === 'RUNNING')
    if (hasRunning) {
      const interval = setInterval(() => {
        loadCampaigns()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [campaigns, loadCampaigns])

  const loadConnections = async () => {
    try {
      const data = await connectionsAPI.getAll()
      const activeConnections = Array.isArray(data)
        ? data.filter((conn: any) => conn.status === 'ACTIVE' && conn.provider === 'WHATSAPP')
        : []
      setConnections(activeConnections)

      if (activeConnections.length > 0 && !formData.connectionId) {
        setFormData((prev) => ({ ...prev, connectionId: activeConnections[0].id }))
      }
    } catch (err: any) {
      console.error('Erro ao carregar conexões:', err)
    }
  }

  const handleOpenDialog = (campaign?: BulkCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign)
      setFormData({
        name: campaign.name,
        description: campaign.description || '',
        contentType: campaign.contentType,
        content: campaign.content || '',
        caption: campaign.caption || '',
        connectionId: campaign.connectionId,
        delayBetweenMessages: campaign.delayBetweenMessages,
        delayBetweenNumbers: campaign.delayBetweenNumbers,
      })
    } else {
      setEditingCampaign(null)
      setFormData({
        name: '',
        description: '',
        contentType: 'TEXT',
        content: '',
        caption: '',
        connectionId: connections[0]?.id || '',
        delayBetweenMessages: 2000,
        delayBetweenNumbers: 5000,
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
      contentType: 'TEXT',
      content: '',
      caption: '',
      connectionId: '',
      delayBetweenMessages: 2000,
      delayBetweenNumbers: 5000,
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

    if (!formData.connectionId) {
      setError('Selecione uma conexão')
      return
    }

    if (formData.contentType === 'TEXT' && !formData.content.trim()) {
      setError('Digite a mensagem')
      return
    }

    try {
      setSubmitting(true)

      if (editingCampaign) {
        await bulkMessagingAPI.update(editingCampaign.id, formData)
      } else {
        await bulkMessagingAPI.create(formData)
      }

      handleCloseDialog()
      loadCampaigns()
    } catch (err: any) {
      console.error('Erro ao salvar campanha:', err)
      setError(err.message || 'Erro ao salvar campanha')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadFile = async () => {
    if (!selectedCampaign || !uploadFile) {
      setError('Selecione um arquivo')
      return
    }

    try {
      setUploading(true)
      setError(null)
      await bulkMessagingAPI.uploadRecipients(selectedCampaign.id, uploadFile)
      setUploadDialogOpen(false)
      setUploadFile(null)
      loadCampaigns()
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err)
      setError(err.message || 'Erro ao fazer upload do arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleStart = async (id: string) => {
    try {
      await bulkMessagingAPI.start(id)
      loadCampaigns()
    } catch (err: any) {
      console.error('Erro ao iniciar campanha:', err)
      setError(err.message || 'Erro ao iniciar campanha')
    }
  }

  const handlePause = async (id: string) => {
    try {
      await bulkMessagingAPI.pause(id)
      loadCampaigns()
    } catch (err: any) {
      console.error('Erro ao pausar campanha:', err)
      setError(err.message || 'Erro ao pausar campanha')
    }
  }

  const handleResume = async (id: string) => {
    try {
      await bulkMessagingAPI.resume(id)
      loadCampaigns()
    } catch (err: any) {
      console.error('Erro ao retomar campanha:', err)
      setError(err.message || 'Erro ao retomar campanha')
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta campanha?')) {
      return
    }

    try {
      await bulkMessagingAPI.cancel(id)
      loadCampaigns()
    } catch (err: any) {
      console.error('Erro ao cancelar campanha:', err)
      setError(err.message || 'Erro ao cancelar campanha')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) {
      return
    }

    try {
      await bulkMessagingAPI.delete(id)
      loadCampaigns()
    } catch (err: any) {
      console.error('Erro ao excluir campanha:', err)
      setError(err.message || 'Erro ao excluir campanha')
    }
  }

  const handleViewLogs = async (campaign: BulkCampaign) => {
    setSelectedCampaign(campaign)
    setLogsDialogOpen(true)
    setLoadingLogs(true)

    try {
      const response = await bulkMessagingAPI.getLogs(campaign.id)
      setLogs(Array.isArray(response.data) ? response.data : [])
    } catch (err: any) {
      console.error('Erro ao carregar logs:', err)
      setError('Erro ao carregar logs')
    } finally {
      setLoadingLogs(false)
    }
  }

  const getStatusColor = (status: BulkCampaignStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-500'
      case 'READY':
        return 'bg-blue-500'
      case 'RUNNING':
        return 'bg-green-500'
      case 'PAUSED':
        return 'bg-yellow-500'
      case 'COMPLETED':
        return 'bg-green-600'
      case 'CANCELLED':
        return 'bg-red-500'
      case 'ERROR':
        return 'bg-red-600'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: BulkCampaignStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'Rascunho'
      case 'READY':
        return 'Pronta'
      case 'RUNNING':
        return 'Em Execução'
      case 'PAUSED':
        return 'Pausada'
      case 'COMPLETED':
        return 'Concluída'
      case 'CANCELLED':
        return 'Cancelada'
      case 'ERROR':
        return 'Erro'
      default:
        return status
    }
  }

  const getContentTypeIcon = (type: ScheduledContentType) => {
    switch (type) {
      case 'TEXT':
        return <FileText className="h-4 w-4" />
      case 'IMAGE':
        return <Image className="h-4 w-4" />
      case 'AUDIO':
        return <Music className="h-4 w-4" />
      case 'DOCUMENT':
        return <File className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1 bg-background p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Disparo em Massa</h1>
              <p className="text-sm text-muted-foreground">
                Envie mensagens para uma lista de contatos carregada via Excel
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Filtros */}
          <div className="mb-4 flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="READY">Pronta</option>
              <option value="RUNNING">Em Execução</option>
              <option value="PAUSED">Pausada</option>
              <option value="COMPLETED">Concluída</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="ERROR">Erro</option>
            </select>
          </div>

          {/* Lista de Campanhas */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => {
                const progress =
                  campaign.totalRecipients > 0
                    ? ((campaign.sentCount + campaign.failedCount) / campaign.totalRecipients) * 100
                    : 0

                return (
                  <div
                    key={campaign.id}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                        {campaign.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {campaign.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium text-white ${getStatusColor(
                          campaign.status,
                        )}`}
                      >
                        {getStatusLabel(campaign.status)}
                      </span>
                    </div>

                    <div className="mb-3 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {getContentTypeIcon(campaign.contentType)}
                        <span className="capitalize">{campaign.contentType.toLowerCase()}</span>
                      </div>
                      <div>
                        <strong className="text-foreground">{campaign.totalRecipients}</strong>{' '}
                        destinatários
                      </div>
                      <div className="flex gap-4">
                        <span className="text-green-600">
                          <CheckCircle2 className="mr-1 inline h-3 w-3" />
                          {campaign.sentCount}
                        </span>
                        <span className="text-red-600">
                          <XCircle className="mr-1 inline h-3 w-3" />
                          {campaign.failedCount}
                        </span>
                        <span className="text-yellow-600">
                          <Clock className="mr-1 inline h-3 w-3" />
                          {campaign.pendingCount}
                        </span>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    {campaign.totalRecipients > 0 && (
                      <div className="mb-3">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Ações */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {campaign.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCampaign(campaign)
                            setUploadDialogOpen(true)
                          }}
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          Upload
                        </Button>
                      )}
                      {campaign.status === 'READY' && (
                        <Button size="sm" onClick={() => handleStart(campaign.id)}>
                          <Play className="mr-1 h-3 w-3" />
                          Iniciar
                        </Button>
                      )}
                      {campaign.status === 'RUNNING' && (
                        <Button size="sm" variant="outline" onClick={() => handlePause(campaign.id)}>
                          <Pause className="mr-1 h-3 w-3" />
                          Pausar
                        </Button>
                      )}
                      {campaign.status === 'PAUSED' && (
                        <Button size="sm" onClick={() => handleResume(campaign.id)}>
                          <Play className="mr-1 h-3 w-3" />
                          Retomar
                        </Button>
                      )}
                      {(campaign.status === 'RUNNING' || campaign.status === 'PAUSED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(campaign.id)}
                        >
                          <Square className="mr-1 h-3 w-3" />
                          Cancelar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewLogs(campaign)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Logs
                      </Button>
                      {campaign.status === 'DRAFT' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(campaign)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(campaign.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <BottomNavigation />

      {/* Dialog de Criar/Editar Campanha */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? 'Editar Campanha' : 'Nova Campanha de Disparo em Massa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="connectionId">Conexão *</Label>
                <select
                  id="connectionId"
                  value={formData.connectionId}
                  onChange={(e) => setFormData({ ...formData, connectionId: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  required
                >
                  <option value="">Selecione uma conexão</option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name} ({conn.sessionName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="contentType">Tipo de Mensagem</Label>
                <select
                  id="contentType"
                  value={formData.contentType}
                  onChange={(e) =>
                    setFormData({ ...formData, contentType: e.target.value as ScheduledContentType })
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                >
                  <option value="TEXT">Texto</option>
                  <option value="IMAGE">Imagem</option>
                  <option value="AUDIO">Áudio</option>
                  <option value="DOCUMENT">Documento</option>
                </select>
              </div>

              {formData.contentType === 'TEXT' && (
                <div>
                  <Label htmlFor="content">Mensagem *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={5}
                    required
                  />
                </div>
              )}

              {(formData.contentType === 'IMAGE' || formData.contentType === 'DOCUMENT') && (
                <>
                  <div>
                    <Label htmlFor="content">URL da Mídia *</Label>
                    <Input
                      id="content"
                      type="url"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="https://..."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="caption">Legenda</Label>
                    <Textarea
                      id="caption"
                      value={formData.caption}
                      onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                      rows={3}
                    />
                  </div>
                </>
              )}

              {formData.contentType === 'AUDIO' && (
                <div>
                  <Label htmlFor="content">URL do Áudio *</Label>
                  <Input
                    id="content"
                    type="url"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="https://..."
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delayBetweenMessages">
                    Delay entre mensagens (ms) *
                  </Label>
                  <Input
                    id="delayBetweenMessages"
                    type="number"
                    min="1000"
                    max="60000"
                    value={formData.delayBetweenMessages}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delayBetweenMessages: parseInt(e.target.value) || 2000,
                      })
                    }
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mínimo: 1000ms (1s), Máximo: 60000ms (60s)
                  </p>
                </div>

                <div>
                  <Label htmlFor="delayBetweenNumbers">
                    Delay entre números (ms) *
                  </Label>
                  <Input
                    id="delayBetweenNumbers"
                    type="number"
                    min="2000"
                    max="120000"
                    value={formData.delayBetweenNumbers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        delayBetweenNumbers: parseInt(e.target.value) || 5000,
                      })
                    }
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mínimo: 2000ms (2s), Máximo: 120000ms (2min)
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : editingCampaign ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Campanha'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Upload */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Lista de Contatos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Arquivo Excel (XLS ou XLSX) *</Label>
              <Input
                id="file"
                type="file"
                accept=".xls,.xlsx,.xlsm"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                O arquivo deve conter colunas: <strong>number</strong> (obrigatório) e{' '}
                <strong>name</strong> (opcional)
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleUploadFile}
              disabled={!uploadFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Logs */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Logs de Envio - {selectedCampaign?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhum log encontrado</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`rounded-lg border p-3 ${
                      log.status === 'SUCCESS'
                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                        : log.status === 'FAILED' || log.status === 'ERROR'
                          ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                          : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {log.status === 'SUCCESS' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-medium">{log.number}</span>
                          {log.name && (
                            <span className="text-sm text-muted-foreground">({log.name})</span>
                          )}
                        </div>
                        {log.message && (
                          <p className="mt-1 text-sm text-muted-foreground">{log.message}</p>
                        )}
                        {log.errorMessage && (
                          <p className="mt-1 text-sm text-red-600">{log.errorMessage}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

