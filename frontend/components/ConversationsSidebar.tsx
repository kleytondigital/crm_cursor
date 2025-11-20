'use client'

import { useChat } from '@/contexts/ChatContext'
import { format, isToday, isYesterday } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { Search, MessageCircle, Filter } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function ConversationsSidebar() {
  const { conversations, selectedConversation, selectConversation, loading } = useChat()
  const [searchTerm, setSearchTerm] = useState('')
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  // Resetar erros de imagem quando o profilePictureURL mudar nas conversas
  useEffect(() => {
    // Limpar erros apenas para conversas que agora têm profilePictureURL
    setImageErrors((prev) => {
      const newErrors = { ...prev }
      conversations.forEach((conv) => {
        if (conv.lead?.profilePictureURL && newErrors[conv.lead.id]) {
          delete newErrors[conv.lead.id]
        }
      })
      return newErrors
    })
  }, [conversations])

  const normalizedSearch = searchTerm.toLowerCase().trim()

  const filteredConversations = conversations.filter((conv) => {
    const leadName = conv.lead?.name ?? ''
    const leadPhone = conv.lead?.phone ?? ''

    if (!normalizedSearch) {
      return true
    }

    return (
      leadName.toLowerCase().includes(normalizedSearch) ||
      leadPhone.includes(normalizedSearch)
    )
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    }
    if (isYesterday(date)) {
      return 'Ontem'
    }
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  }

  return (
    <div className="flex h-full w-full flex-col md:h-auto">
      <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-background-muted to-background-card px-3 pb-4 pt-4 md:px-5 md:pb-6 md:pt-8">
        <div className="absolute inset-0 bg-hero-grid opacity-70" />
        <div className="relative z-10 space-y-1">
          {/* <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Painel LiveOps</p> */}
          <h2 className="text-xl md:text-2xl font-bold text-white">Conversas</h2>
          <p className="hidden md:block text-sm text-text-muted">
            Acompanhe atendimentos em tempo real e priorize leads quentes.
          </p>
        </div>
      </div>

      <div className="border-b border-white/5 bg-background-subtle/70 p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 md:left-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-background-muted/80 py-1.5 md:py-2 pl-8 md:pl-10 pr-3 md:pr-4 text-xs md:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
            />
          </div>
          <button className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full border border-white/10 bg-background-muted/80 text-text-muted transition hover:text-white">
            <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 200px)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {loading && conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-muted">
            Carregando conversas...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 text-text-muted">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background-muted/60">
              <MessageCircle className="h-7 w-7" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">Nada por aqui ainda</p>
              <p className="text-sm text-text-muted">
                Quando novos leads entrarem, seus atendimentos aparecerão nesta lista.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredConversations.map((conversation) => {
              const active = selectedConversation?.id === conversation.id
              return (
                <button
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className={`flex w-full gap-3 px-5 py-4 transition ${
                    active
                      ? 'bg-brand-primary/10 shadow-inner-glow'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {conversation.lead?.profilePictureURL && !imageErrors[conversation.lead.id] ? (
                    <img
                      src={conversation.lead.profilePictureURL}
                      alt={conversation.lead?.name || conversation.lead?.phone || 'Contato'}
                      className="h-12 w-12 flex-shrink-0 rounded-2xl object-cover"
                      onError={() => {
                        setImageErrors((prev) => ({ ...prev, [conversation.lead!.id]: true }))
                      }}
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-primary/20 text-lg font-semibold text-brand-secondary">
                      {(conversation.lead?.name || conversation.lead?.phone || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">
                        {conversation.lead?.name || conversation.lead?.phone || 'Contato sem nome'}
                      </p>
                      {conversation.lastMessage && (
                        <span className="flex-shrink-0 text-xs text-text-muted">
                          {formatDate(conversation.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-text-muted">
                      {conversation.lastMessage
                        ? conversation.lastMessage.contentText ||
                          conversation.lastMessage.contentType.toLowerCase()
                        : 'Sem mensagens recentes'}
                    </p>
                    {conversation.lead?.tags && conversation.lead.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {conversation.lead.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {conversation.unreadCount && conversation.unreadCount > 0 && (
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-secondary/30 text-xs font-semibold text-brand-secondary">
                      {conversation.unreadCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

