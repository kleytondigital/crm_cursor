'use client'

import { useChat } from '@/contexts/ChatContext'
import MessageBubble from './MessageBubble'
import DateDivider from './DateDivider'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Message } from '@/types'
import { messagesAPI } from '@/lib/api'
import { format, isSameDay } from 'date-fns'

interface MessageListProps {
  replyToMessage?: Message | null
  setReplyToMessage?: (message: Message | null) => void
  editMessage?: Message | null
  setEditMessage?: (message: Message | null) => void
}

export default function MessageList({ 
  replyToMessage, 
  setReplyToMessage,
  editMessage,
  setEditMessage,
}: MessageListProps = {}) {
  const { messages, selectedConversation, loadMessages } = useChat()
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageRefsRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const lastMessageCountRef = useRef(0)
  const lastConversationIdRef = useRef<string | null>(null)

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior,
      })
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior })
    }
  }

  // Função para fazer scroll até uma mensagem específica pelo ID
  const scrollToMessage = (messageId: string) => {
    // Tentar encontrar pelo ID interno primeiro
    let messageElement = messageRefsRef.current.get(messageId)
    
    // Se não encontrou pelo ID interno, tentar encontrar pelo messageId do WhatsApp
    if (!messageElement) {
      // Buscar na lista de mensagens para encontrar o ID interno correspondente
      const foundMessage = messages.find((m) => m.messageId === messageId || m.id === messageId)
      if (foundMessage) {
        messageElement = messageRefsRef.current.get(foundMessage.id)
      }
    }
    
    if (messageElement && containerRef.current) {
      // Calcular a posição da mensagem dentro do container
      const containerRect = containerRef.current.getBoundingClientRect()
      const messageRect = messageElement.getBoundingClientRect()
      const scrollTop = containerRef.current.scrollTop
      
      // Posição relativa da mensagem no container
      const messageTop = messageRect.top - containerRect.top + scrollTop
      
      // Scroll com offset para mostrar a mensagem um pouco acima do centro
      const offset = containerRef.current.clientHeight * 0.3 // 30% do viewport acima
      const targetScrollTop = messageTop - offset
      
      containerRef.current.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      })

      // Adicionar um highlight temporário na mensagem
      messageElement.classList.add('highlight-message')
      setTimeout(() => {
        messageElement.classList.remove('highlight-message')
      }, 2000)
    } else {
      console.warn(`Mensagem não encontrada para scroll: ${messageId}`)
    }
  }

  // Callback para registrar referências de mensagens
  const setMessageRef = useCallback((messageId: string, element: HTMLDivElement | null) => {
    if (!messageId) return
    
    if (element) {
      // Verificar se o elemento ainda está no DOM antes de adicionar
      if (element.isConnected) {
        messageRefsRef.current.set(messageId, element)
      }
    } else {
      // Remover ref apenas se o elemento foi desmontado
      messageRefsRef.current.delete(messageId)
    }
  }, [])

  // Handler para excluir mensagem
  const handleDeleteMessage = async (message: Message) => {
    if (!message.messageId || !selectedConversation) {
      console.error('Mensagem ou conversa não encontrada')
      return
    }

    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
      return
    }

    try {
      // Buscar connection e phone da conversa
      const leadPhone = selectedConversation.lead.phone
      
      // Enviar para o backend que vai buscar a connection automaticamente
      await messagesAPI.delete({
        idMessage: message.messageId,
        phone: leadPhone,
        session: '', // Será obtido automaticamente pelo backend
      })

      // Recarregar mensagens para atualizar a lista (mostrar como excluída)
      if (selectedConversation.id) {
        await loadMessages(selectedConversation.id)
      }
    } catch (error: any) {
      console.error('Erro ao excluir mensagem:', error)
      alert(error.response?.data?.message || 'Erro ao excluir mensagem')
    }
  }

  // Agrupar mensagens por data e adicionar divisores
  const messagesWithDividers = useMemo(() => {
    if (messages.length === 0) return []

    const result: Array<{ type: 'message' | 'divider'; data: Message | Date; key: string }> = []
    let lastDate: Date | null = null

    // Criar um Set para garantir unicidade de mensagens (por ID)
    const seenIds = new Set<string>()
    const uniqueMessages = messages.filter((msg) => {
      if (seenIds.has(msg.id)) {
        console.warn(`[MessageList] Mensagem duplicada detectada, removendo: id=${msg.id}`)
        return false
      }
      seenIds.add(msg.id)
      return true
    })

    uniqueMessages.forEach((message, index) => {
      // Obter data da mensagem (usar timestamp se disponível, senão createdAt)
      const messageDate = message.timestamp 
        ? new Date(message.timestamp) 
        : new Date(message.createdAt)
      
      // Verificar se precisa adicionar divisor de data
      // Adicionar divisor se:
      // 1. É a primeira mensagem
      // 2. A data mudou em relação à mensagem anterior
      const shouldAddDivider = index === 0 || 
        (lastDate && !isSameDay(messageDate, lastDate))

      if (shouldAddDivider) {
        // Usar uma key estável para o divisor baseada na data (formato YYYY-MM-DD)
        const dateKey = `${messageDate.getFullYear()}-${String(messageDate.getMonth() + 1).padStart(2, '0')}-${String(messageDate.getDate()).padStart(2, '0')}`
        result.push({ type: 'divider', data: messageDate, key: `divider-${dateKey}` })
        lastDate = messageDate
      }

      result.push({ type: 'message', data: message, key: message.id })
    })

    return result
  }, [messages])

  // Limpar refs de mensagens que não existem mais
  useEffect(() => {
    const currentMessageIds = new Set(messages.map((m) => m.id))
    
    // Remover refs de mensagens que não estão mais na lista
    messageRefsRef.current.forEach((_, messageId) => {
      if (!currentMessageIds.has(messageId)) {
        messageRefsRef.current.delete(messageId)
      }
    })
  }, [messages])

  useEffect(() => {
    // Se a conversa mudou, sempre fazer scroll e limpar refs
    if (selectedConversation?.id !== lastConversationIdRef.current) {
      lastConversationIdRef.current = selectedConversation?.id || null
      lastMessageCountRef.current = messages.length
      // Limpar todas as refs ao mudar de conversa
      messageRefsRef.current.clear()
      // Aguardar um pouco para garantir que o DOM foi atualizado
      setTimeout(() => scrollToBottom('auto'), 100)
      return
    }

    // Se novas mensagens foram adicionadas (não removidas), fazer scroll
    if (messages.length > lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length
      scrollToBottom(messages.length > 20 ? 'auto' : 'smooth')
    } else if (messages.length !== lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length
    }
  }, [messages, selectedConversation])

  return (
    <div className="flex h-full w-full flex-col bg-background-subtle/40" style={{ height: '100%', minHeight: 0, width: '100%' }}>
      {/* Área de mensagens (scrollável) */}
      <div
        ref={containerRef}
        className="w-full overflow-y-auto px-3 md:px-4 py-4 md:py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
        style={{ 
          WebkitOverflowScrolling: 'touch', 
          minHeight: 0, 
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative'
        }}
      >
        <div className="flex w-full flex-col gap-3" style={{ minHeight: 'min-content' }}>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
              <p className="text-sm">Nenhuma mensagem ainda. Comece a conversar!</p>
            </div>
          ) : (
            messagesWithDividers.map((item) => {
              if (item.type === 'divider') {
                return (
                  <DateDivider 
                    key={item.key}
                    date={item.data as Date}
                  />
                )
              }

              const message = item.data as Message
              // Garantir que a key seja estável e única
              // Usar message.id como key (garantir que seja string)
              const messageKey = String(message.id || message.tempId || `temp-${Date.now()}-${Math.random()}`)
              
              return (
                <div
                  key={messageKey}
                  ref={(el) => {
                    // Atualizar ref de forma segura
                    if (el && message.id) {
                      setMessageRef(message.id, el)
                    } else if (!el && message.id) {
                      // Elemento foi desmontado, limpar ref
                      setMessageRef(message.id, null)
                    }
                  }}
                  id={`message-${message.id}`}
                  data-message-id={message.id}
                  data-message-whatsapp-id={message.messageId || undefined}
                  className="message-item"
                >
                  <MessageBubble 
                    message={message} 
                    conversation={selectedConversation}
                    allMessages={messages}
                    onScrollToMessage={scrollToMessage}
                    onReply={(msg) => setReplyToMessage?.(msg)}
                    onEdit={(msg) => setEditMessage?.(msg)}
                    onDelete={handleDeleteMessage}
                  />
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
  

    </div>
  )
}