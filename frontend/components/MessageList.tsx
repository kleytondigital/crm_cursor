'use client'

import { useChat } from '@/contexts/ChatContext'
import MessageBubble from './MessageBubble'
import { useEffect, useRef, useState } from 'react'
import { Message } from '@/types'
import { messagesAPI } from '@/lib/api'

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
  const setMessageRef = (messageId: string, element: HTMLDivElement | null) => {
    if (element) {
      messageRefsRef.current.set(messageId, element)
    } else {
      messageRefsRef.current.delete(messageId)
    }
  }

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

  useEffect(() => {
    // Se a conversa mudou, sempre fazer scroll
    if (selectedConversation?.id !== lastConversationIdRef.current) {
      lastConversationIdRef.current = selectedConversation?.id || null
      lastMessageCountRef.current = messages.length
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
    <div className="flex h-full w-full flex-col bg-background-subtle/40">
      {/* Área de mensagens (scrollável) */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
      >
        <div className="flex w-full flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
              <p className="text-sm">Nenhuma mensagem ainda. Comece a conversar!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                ref={(el) => setMessageRef(message.id, el)}
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
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
  

    </div>
  )
}