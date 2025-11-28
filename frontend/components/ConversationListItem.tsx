'use client'

import { Conversation } from '@/types'
import { format, isToday, isYesterday } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { Bot, User, Building2, Flag } from 'lucide-react'
import { useConversationTags } from '@/hooks/useConversationTags'
import Tag from './ui/Tag'

interface ConversationListItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: () => void
  imageError: boolean
  onImageError: () => void
}

export default function ConversationListItem({
  conversation,
  isActive,
  onSelect,
  imageError,
  onImageError,
}: ConversationListItemProps) {
  const { stage, attendance } = useConversationTags(conversation)

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

  const showImage = conversation.lead?.profilePictureURL && !imageError
  const leadInitial = (conversation.lead?.name || conversation.lead?.phone || '?')
    .charAt(0)
    .toUpperCase()

  return (
    <button
      onClick={onSelect}
      className={`flex w-full gap-3 px-5 py-4 transition ${
        isActive
          ? 'bg-brand-primary/10 shadow-inner-glow'
          : 'hover:bg-white/5'
      }`}
    >
      {showImage ? (
        <img
          src={conversation.lead.profilePictureURL!}
          alt={conversation.lead?.name || conversation.lead?.phone || 'Contato'}
          className="h-12 w-12 flex-shrink-0 rounded-2xl object-cover"
          onError={onImageError}
        />
      ) : (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-primary/20 text-lg font-semibold text-brand-secondary">
          {leadInitial}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
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
        
        {/* Tags: Bot, Estágio, Atendente, Departamento, Prioridade */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {conversation.isBotAttending && (
            <Tag variant="bot" title="Sendo atendido por bot">
              <Bot className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Bot</span>
            </Tag>
          )}
          {stage && (
            <Tag variant="stage" color={stage.color} title={`Etapa: ${stage.name}`}>
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="truncate max-w-[80px]">{stage.name}</span>
            </Tag>
          )}
          {attendance?.assignedUser && (
            <Tag variant="user" title={`Atendente: ${attendance.assignedUser.name}`}>
              <User className="h-2.5 w-2.5" />
              <span className="truncate max-w-[60px]">{attendance.assignedUser.name.split(' ')[0]}</span>
            </Tag>
          )}
          {attendance?.department && (
            <Tag variant="department" title={`Departamento: ${attendance.department.name}`}>
              <Building2 className="h-2.5 w-2.5" />
              <span className="truncate max-w-[70px]">{attendance.department.name}</span>
            </Tag>
          )}
          {attendance?.priority && attendance.priority !== 'NORMAL' && (
            <Tag
              variant="priority"
              color={
                attendance.priority === 'HIGH'
                  ? '#EF4444'
                  : attendance.priority === 'LOW'
                  ? '#6B7280'
                  : undefined
              }
              title={`Prioridade: ${attendance.priority === 'HIGH' ? 'Alta' : 'Baixa'}`}
            >
              <Flag className="h-2.5 w-2.5" />
              <span className="truncate">
                {attendance.priority === 'HIGH' ? 'Alta' : 'Baixa'}
              </span>
            </Tag>
          )}
        </div>

        <p className="truncate text-xs text-text-muted">
          {conversation.lastMessage
            ? conversation.lastMessage.contentText ||
              (conversation.lastMessage.contentType === 'IMAGE'
                ? 'Imagem recebida'
                : conversation.lastMessage.contentType === 'AUDIO'
                ? 'Áudio recebido'
                : conversation.lastMessage.contentType === 'VIDEO'
                ? 'Vídeo recebido'
                : conversation.lastMessage.contentType === 'DOCUMENT'
                ? 'Documento recebido'
                : conversation.lastMessage.contentType.toLowerCase())
            : 'Sem mensagens recentes'}
        </p>
        {conversation.lead?.tags && conversation.lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {conversation.lead.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-text-muted"
              >
                {tag}
              </span>
            ))}
            {conversation.lead.tags.length > 2 && (
              <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-text-muted">
                +{conversation.lead.tags.length - 2}
              </span>
            )}
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
}

