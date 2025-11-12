'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, Loader2, Image, FileText, Music, Check, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Conversation, Connection, ScheduledContentType } from '@/types'
import { schedulerAPI, connectionsAPI } from '@/lib/api'
import { format } from 'date-fns'

interface ScheduleMessageDialogProps {
  open: boolean
  onClose: () => void
  conversation: Conversation
  onSuccess?: () => void
}

interface ScheduledContentItem {
  id: string
  contentType: ScheduledContentType
  content: string
  caption?: string
  file?: File | null
}

export default function ScheduleMessageDialog({
  open,
  onClose,
  conversation,
  onSuccess,
}: ScheduleMessageDialogProps) {
  const [loading, setLoading] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedConnection, setSelectedConnection] = useState<string>('')
  const [contents, setContents] = useState<ScheduledContentItem[]>([])
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  useEffect(() => {
    if (open) {
      loadConnections()
      // Definir data/hora padrão (próxima hora)
      const now = new Date()
      now.setHours(now.getHours() + 1)
      now.setMinutes(0)
      setScheduledDate(format(now, 'yyyy-MM-dd'))
      setScheduledTime(format(now, 'HH:mm'))
      // Resetar formulário
      setContents([{ id: '1', contentType: 'TEXT', content: '', caption: '', file: null }])
      setError(null)
      setSelectedConnection('')
    }
  }, [open])

  const loadConnections = async () => {
    try {
      const data = await connectionsAPI.getAll()
      const activeConnections = Array.isArray(data)
        ? data.filter((conn: Connection) => conn.status === 'ACTIVE')
        : []
      setConnections(activeConnections)

      // Selecionar primeira conexão ativa automaticamente
      if (activeConnections.length > 0 && !selectedConnection) {
        setSelectedConnection(activeConnections[0].id)
      }
    } catch (err: any) {
      console.error('Erro ao carregar conexões:', err)
      setError('Erro ao carregar conexões')
    }
  }

  const addContentItem = () => {
    const newItem: ScheduledContentItem = {
      id: Math.random().toString(36).substring(7),
      contentType: 'TEXT',
      content: '',
      caption: '',
      file: null,
    }
    setContents((prev) => [...prev, newItem])
  }

  const removeContentItem = (id: string) => {
    if (contents.length > 1) {
      setContents((prev) => prev.filter((item) => item.id !== id))
    }
  }

  const updateContentItem = (id: string, updates: Partial<ScheduledContentItem>) => {
    setContents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    )
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    updateContentItem(itemId, { file: selectedFile })
    setUploading(itemId)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/messages/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do arquivo')
      }

      const data = await response.json()
      updateContentItem(itemId, { content: data.url })
      setUploading(null)
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err)
      setError('Erro ao fazer upload do arquivo')
      setUploading(null)
      updateContentItem(itemId, { file: null, content: '' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validar que há pelo menos um conteúdo
    if (contents.length === 0) {
      setError('Adicione pelo menos uma mensagem para agendar')
      return
    }

    // Validar todos os conteúdos
    for (const item of contents) {
      if (item.contentType === 'TEXT' && !item.content.trim()) {
        setError('Digite o conteúdo da mensagem de texto')
        return
      }

      if (item.contentType !== 'TEXT' && !item.content) {
        setError(`Selecione um arquivo para ${getContentTypeLabel(item.contentType).toLowerCase()}`)
        return
      }
    }

    if (!scheduledDate || !scheduledTime) {
      setError('Selecione data e hora')
      return
    }

    try {
      setLoading(true)

      // Combinar data e hora
      const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`)
      const now = new Date()

      if (scheduledFor <= now) {
        setError('A data/hora deve ser no futuro')
        setLoading(false)
        return
      }

      // Criar múltiplos agendamentos - um para cada conteúdo
      const schedulePromises = contents.map((item) =>
        schedulerAPI.schedule({
          leadId: conversation.leadId,
          connectionId: selectedConnection || undefined,
          contentType: item.contentType,
          content: item.content,
          caption: item.contentType !== 'TEXT' ? item.caption : undefined,
          scheduledFor: scheduledFor.toISOString(),
          conversationId: conversation.id,
        }),
      )

      await Promise.all(schedulePromises)

      // Limpar formulário
      setContents([{ id: '1', contentType: 'TEXT', content: '', caption: '', file: null }])
      setError(null)

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (err: any) {
      console.error('Erro ao agendar mensagens:', err)
      setError(err.response?.data?.message || 'Erro ao agendar mensagens')
    } finally {
      setLoading(false)
    }
  }

  const getContentTypeLabel = (type: ScheduledContentType) => {
    switch (type) {
      case 'TEXT':
        return 'Texto'
      case 'IMAGE':
        return 'Imagem'
      case 'AUDIO':
        return 'Áudio'
      case 'DOCUMENT':
        return 'Documento'
      default:
        return type
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-secondary" />
            Agendar Mensagens
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="connection">Conexão (opcional)</Label>
            <select
              id="connection"
              value={selectedConnection}
              onChange={(e) => setSelectedConnection(e.target.value)}
              className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
            >
              <option value="">Usar conexão padrão</option>
              {connections.map((conn) => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.sessionName})
                </option>
              ))}
            </select>
            <p className="text-xs text-text-muted">
              Se não selecionada, será usada a conexão da conversa ou a primeira conexão ativa
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label>Mensagens para Agendar</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addContentItem}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar Mensagem
              </Button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {contents.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-background-muted/30 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-semibold text-white">
                      Mensagem {index + 1} - {getContentTypeLabel(item.contentType)}
                    </Label>
                    {contents.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContentItem(item.id)}
                        className="h-6 w-6 p-0 text-text-muted hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">Tipo de Conteúdo *</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['TEXT', 'IMAGE', 'AUDIO', 'DOCUMENT'] as ScheduledContentType[]).map(
                          (type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                updateContentItem(item.id, {
                                  contentType: type,
                                  content: '',
                                  caption: '',
                                  file: null,
                                })
                              }}
                              className={`flex flex-col items-center gap-2 rounded-lg border p-2 text-xs transition-all ${
                                item.contentType === type
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

                    {item.contentType === 'TEXT' ? (
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`content-${item.id}`} className="text-xs">
                          Mensagem *
                        </Label>
                        <Textarea
                          id={`content-${item.id}`}
                          value={item.content}
                          onChange={(e) =>
                            updateContentItem(item.id, { content: e.target.value })
                          }
                          required
                          placeholder="Digite a mensagem..."
                          rows={3}
                          className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`file-${item.id}`} className="text-xs">
                            Arquivo *
                          </Label>
                          <input
                            ref={(el) => {
                              fileInputRefs.current[item.id] = el
                            }}
                            type="file"
                            id={`file-${item.id}`}
                            accept={
                              item.contentType === 'IMAGE'
                                ? 'image/*'
                                : item.contentType === 'AUDIO'
                                ? 'audio/*'
                                : '*/*'
                            }
                            onChange={(e) => handleFileChange(e, item.id)}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => fileInputRefs.current[item.id]?.click()}
                            disabled={uploading === item.id}
                            className="w-full gap-2"
                          >
                            {uploading === item.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando...
                              </>
                            ) : item.file ? (
                              <>
                                <Check className="h-4 w-4" />
                                {item.file.name}
                              </>
                            ) : item.content ? (
                              <>
                                <Check className="h-4 w-4" />
                                Arquivo selecionado
                              </>
                            ) : (
                              <>
                                {getContentTypeIcon(item.contentType)}
                                Selecionar Arquivo
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`caption-${item.id}`} className="text-xs">
                            Legenda (opcional)
                          </Label>
                          <Textarea
                            id={`caption-${item.id}`}
                            value={item.caption || ''}
                            onChange={(e) =>
                              updateContentItem(item.id, { caption: e.target.value })
                            }
                            placeholder="Digite uma legenda..."
                            rows={2}
                            className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date" className="flex items-center gap-2 text-xs">
                <Calendar className="h-4 w-4" />
                Data *
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                min={format(new Date(), 'yyyy-MM-dd')}
                className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="time" className="flex items-center gap-2 text-xs">
                <Clock className="h-4 w-4" />
                Hora *
              </Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
                className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              />
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            <p className="font-semibold">💡 Dica:</p>
            <p className="mt-1 text-xs">
              Cada mensagem será enviada separadamente no horário agendado. Você pode agendar
              múltiplos tipos de conteúdo (texto, imagem, áudio, documento) que serão enviados como
              mensagens individuais.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || uploading !== null}
              className="flex-1 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Agendando {contents.length} mensagem{contents.length > 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Agendar {contents.length} Mensagem{contents.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
