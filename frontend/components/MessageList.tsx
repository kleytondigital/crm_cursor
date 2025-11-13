'use client'

import { useChat } from '@/contexts/ChatContext'
import MessageBubble from './MessageBubble'
import { useEffect, useRef } from 'react'

export default function MessageList() {
  const { messages, selectedConversation } = useChat()
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
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
              <MessageBubble 
                key={message.id} 
                message={message} 
                conversation={selectedConversation}
                allMessages={messages}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
  

    </div>
  )
}