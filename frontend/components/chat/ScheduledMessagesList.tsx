'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Trash2, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react'
import { ScheduledMessage, ScheduledMessageStatus } from '@/types'
import { schedulerAPI } from '@/lib/api'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { useSchedulerSocket } from '@/hooks/useSchedulerSocket'

interface ScheduledMessagesListProps {
  leadId: string
  onUpdate?: () => void
  onViewHistory?: () => void
}

export default function ScheduledMessagesList({
  leadId,
  onUpdate,
  onViewHistory,
}: ScheduledMessagesListProps) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  
  // Recuperar estado de minimizado do localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`scheduledMessagesMinimized_${leadId}`)
    if (savedState !== null) {
      setIsMinimized(savedState === 'true')
    }
  }, [leadId])

  const loadMessages = useCallback(async () => {
    if (!leadId) return
    try {
      setLoading(true)
      const data = await schedulerAPI.getScheduledMessages(leadId)
      setMessages(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('Erro ao carregar mensagens agendadas:', err)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  // Conectar ao WebSocket para receber atualizações em tempo real
  useSchedulerSocket({
    onScheduledSent: (data) => {
      // Recarregar mensagens quando uma mensagem agendada for enviada
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
      // Recarregar mensagens quando houver atualização
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
    if (leadId) {
      loadMessages()
    }
  }, [leadId, loadMessages])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-brand-secondary" />
      </div>
    )
  }

  const handleToggleMinimize = () => {
    const newState = !isMinimized
    setIsMinimized(newState)
    localStorage.setItem(`scheduledMessagesMinimized_${leadId}`, newState.toString())
  }

  const handleHide = () => {
    setIsMinimized(true)
    localStorage.setItem(`scheduledMessagesMinimized_${leadId}`, 'true')
    localStorage.setItem(`scheduledMessagesHidden_${leadId}`, 'true')
  }

  const pendingMessages = messages.filter((m) => m.status === 'PENDING')
  const hasPendingMessages = pendingMessages.length > 0

  if (messages.length === 0) {
    return null
  }

  return (
    <div className="border-t border-white/5 bg-background-subtle/40">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">
            Mensagens Agendadas {hasPendingMessages && `(${pendingMessages.length})`}
          </h3>
          {onViewHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewHistory}
              className="h-6 px-2 text-xs text-brand-secondary hover:text-brand-secondary/80"
            >
              Ver histórico
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleMinimize}
            className="h-6 w-6 p-0 text-text-muted hover:text-white"
            title={isMinimized ? 'Expandir' : 'Minimizar'}
          >
            {isMinimized ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHide}
            className="h-6 w-6 p-0 text-text-muted hover:text-white"
            title="Ocultar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {!isMinimized && (
        <div className="px-4 pb-4 space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-background-muted/60 p-3"
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
                    {message.status === 'PENDING' && (
                      <span className="text-xs text-text-muted">
                        ({formatDistanceToNow(new Date(message.scheduledFor), { locale: ptBR, addSuffix: true })})
                      </span>
                    )}
                  </div>
                  {message.contentType === 'TEXT' && message.content && (
                    <p className="text-xs text-text-muted mt-1 truncate">{message.content}</p>
                  )}
                  {message.status === 'FAILED' && message.errorMessage && (
                    <p className="text-xs text-rose-400 mt-1">{message.errorMessage}</p>
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
  )
}

