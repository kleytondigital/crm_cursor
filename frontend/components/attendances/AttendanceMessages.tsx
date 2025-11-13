'use client'

import { Message } from '@/types'
import MessageBubble from '@/components/MessageBubble'
import { useEffect, useRef } from 'react'

interface AttendanceMessagesProps {
  messages: Message[]
}

export default function AttendanceMessages({ messages }: AttendanceMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(0)

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
    // Se novas mensagens foram adicionadas, fazer scroll
    if (messages.length > lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length
      scrollToBottom(messages.length > 20 ? 'auto' : 'smooth')
    } else if (messages.length !== lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length
    }
  }, [messages])

  // Filtrar mensagens que são apenas números de WhatsApp (ex: 55999999999@c.us)
  const filteredMessages = messages.filter((message) => {
    if (message.contentType !== 'TEXT' || !message.contentText) {
      return true
    }
    // Remover mensagens que são apenas números de WhatsApp no formato @c.us
    const text = message.contentText.trim()
    // Verifica se é um padrão de número WhatsApp com @c.us no final (ex: 55999999999@c.us)
    // Isso filtra IDs de WhatsApp que aparecem como mensagens
    if (/^\d+@c\.us$/i.test(text)) {
      return false
    }
    return true
  })

  return (
    <div className="flex h-full w-full flex-col bg-background-subtle/40 rounded-2xl border border-white/5 overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
        style={{ maxHeight: '400px' }}
      >
        <div className="flex w-full flex-col gap-3">
          {filteredMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
              <p className="text-sm">Nenhuma mensagem ainda.</p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
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

