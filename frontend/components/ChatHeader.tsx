'use client'

import { useState, useEffect } from 'react'
import { Conversation } from '@/types'
import ChatActionsMenu from './chat/ChatActionsMenu'
import { useChat } from '@/contexts/ChatContext'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatHeaderProps {
  conversation: Conversation
  onViewSchedulingHistory?: () => void
}

export default function ChatHeader({ conversation, onViewSchedulingHistory }: ChatHeaderProps) {
  const { loadConversations } = useChat()
  const [imageError, setImageError] = useState(false)

  // Resetar erro de imagem quando a conversa mudar
  useEffect(() => {
    setImageError(false)
  }, [conversation.leadId, conversation.lead.profilePictureURL])

  const showImage = conversation.lead.profilePictureURL && !imageError

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showImage ? (
          <img
            src={conversation.lead.profilePictureURL!}
            alt={conversation.lead.name}
            className="h-12 w-12 rounded-2xl object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-secondary/20 text-lg font-semibold text-brand-secondary">
            {conversation.lead.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-white">{conversation.lead.name}</h2>
          <p className="text-sm text-text-muted">{conversation.lead.phone}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onViewSchedulingHistory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewSchedulingHistory}
            className="h-9 gap-2 text-text-muted hover:text-brand-secondary"
            title="Histórico de agendamentos"
          >
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Agendamentos</span>
          </Button>
        )}
        <ChatActionsMenu conversation={conversation} onRefresh={loadConversations} />
      </div>
    </div>
  )
}

