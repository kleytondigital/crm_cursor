'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, CheckCircle2, XCircle, Trash2, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScheduledMessage, ScheduledMessageStatus } from '@/types'
import { schedulerAPI } from '@/lib/api'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSchedulerSocket } from '@/hooks/useSchedulerSocket'

interface SchedulingHistoryDialogProps {
  open: boolean
  onClose: () => void
  leadId: string
  onUpdate?: () => void
}

export default function SchedulingHistoryDialog({
  open,
  onClose,
  leadId,
  onUpdate,
}: SchedulingHistoryDialogProps) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SENT' | 'FAILED'>('ALL')

  const loadMessages = useCallback(async () => {
    if (!leadId || !open) return
    try {
      setLoading(true)
      const data = await schedulerAPI.getScheduledMessages(leadId)
      const allMessages = Array.isArray(data) ? data : []
      setMessages(allMessages)
    } catch (err: any) {
      console.error('Erro ao carregar histórico de agendamentos:', err)
    } finally {
      setLoading(false)
    }
  }, [leadId, open])

  // Conectar ao WebSocket para receber atualizações em tempo real
  useSchedulerSocket({
    onScheduledSent: (data) => {
      if (data && (data.leadId === leadId || data.message?.leadId === leadId)) {
        setTimeout(() => {
          loadMessages()
          if (onUpdate) {
            onUpdate()
          }
        }, 500)
      }
    },
    onScheduledUpdated: (data) => {
      if (data && (data.leadId === leadId || data.message?.leadId === leadId)) {
        setTimeout(() => {
          loadMessages()
          if (onUpdate) {
            onUpdate()
          }
        }, 500)
      }
    },
  })

  useEffect(() => {
    if (open) {
      loadMessages()
    }
  }, [open, loadMessages])

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta mensagem agendada?')) {
      return
    }

    try {
      setCancelling(id)
      await schedulerAPI.cancel(id)
      await loadMessages()
      if (onUpdate) {
        onUpdate()
      }
    } catch (err: any) {
      console.error('Erro ao cancelar mensagem:', err)
      alert('Erro ao cancelar mensagem: ' + (err.response?.data?.message || 'Erro desconhecido'))
    } finally {
      setCancelling(null)
    }
  }

  const getStatusIcon = (status: ScheduledMessageStatus) => {
    switch (status) {
      case 'SENT':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-rose-400" />
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-text-muted" />
      default:
        return <Clock className="h-4 w-4 text-amber-400" />
    }
  }

  const getStatusLabel = (status: ScheduledMessageStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente'
      case 'SENT':
        return 'Enviada'
      case 'FAILED':
        return 'Falhou'
      case 'CANCELLED':
        return 'Cancelada'
      default:
        return status
    }
  }

  const getContentTypeLabel = (contentType: string) => {
    switch (contentType) {
      case 'TEXT':
        return 'Texto'
      case 'IMAGE':
        return 'Imagem'
      case 'AUDIO':
        return 'Áudio'
      case 'DOCUMENT':
        return 'Documento'
      default:
        return contentType
    }
  }

  const filteredMessages = messages.filter((message) => {
    if (filter === 'ALL') return true
    return message.status === filter
  })

  const statusCounts = {
    ALL: messages.length,
    PENDING: messages.filter((m) => m.status === 'PENDING').length,
    SENT: messages.filter((m) => m.status === 'SENT').length,
    FAILED: messages.filter((m) => m.status === 'FAILED').length,
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-brand-secondary" />
            Histórico de Agendamentos
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          {(['ALL', 'PENDING', 'SENT', 'FAILED'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilter(status)}
              className="gap-2"
            >
              {status === 'ALL' ? 'Todos' : getStatusLabel(status)}
              {statusCounts[status] > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
                  {statusCounts[status]}
                </span>
              )}
            </Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-secondary" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-text-muted/40 mb-4" />
              <p className="text-sm text-text-muted">
                {filter === 'ALL'
                  ? 'Nenhuma mensagem agendada'
                  : `Nenhuma mensagem com status "${getStatusLabel(filter)}"`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-background-muted/60 p-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(message.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {getContentTypeLabel(message.contentType)}
                        </span>
                        <span
                          className={`text-xs ${
                            message.status === 'PENDING'
                              ? 'text-amber-400'
                              : message.status === 'SENT'
                              ? 'text-emerald-400'
                              : message.status === 'FAILED'
                              ? 'text-rose-400'
                              : 'text-text-muted'
                          }`}
                        >
                          {getStatusLabel(message.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-text-muted" />
                        <span className="text-xs text-text-muted">
                          {format(new Date(message.scheduledFor), "dd 'de' MMM 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                        {message.sentAt && (
                          <span className="text-xs text-text-muted">
                            • Enviada: {format(new Date(message.sentAt), "dd 'de' MMM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        )}
                        {message.status === 'PENDING' && (
                          <span className="text-xs text-text-muted">
                            ({formatDistanceToNow(new Date(message.scheduledFor), {
                              locale: ptBR,
                              addSuffix: true,
                            })})
                          </span>
                        )}
                      </div>
                      {message.contentType === 'TEXT' && message.content && (
                        <p className="text-sm text-text-muted mt-2">{message.content}</p>
                      )}
                      {message.contentType !== 'TEXT' && message.caption && (
                        <p className="text-sm text-text-muted mt-2">{message.caption}</p>
                      )}
                      {message.status === 'FAILED' && message.errorMessage && (
                        <p className="text-xs text-rose-400 mt-2">{message.errorMessage}</p>
                      )}
                      {message.user && (
                        <p className="text-xs text-text-muted mt-2">
                          Agendado por: {message.user.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {message.status === 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(message.id)}
                      disabled={cancelling === message.id}
                      className="ml-2 h-8 w-8 p-0 text-text-muted hover:text-rose-400"
                    >
                      {cancelling === message.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}




