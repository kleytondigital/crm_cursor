'use client'

import { Conversation } from '@/types'
import { format, isToday, isYesterday } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { Bot, User, Building2, Flag, Megaphone, Users } from 'lucide-react'
import { useConversationTags } from '@/hooks/useConversationTags'
import Tag from './ui/Tag'
import Image from 'next/image'
import { useMemo } from 'react'

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

  // Determinar provider da conversa
  const provider = conversation.provider || (conversation.lead?.phone?.startsWith('social_') ? null : 'WHATSAPP')

  // Verificar se origem é de anúncio (pode vir do campo origin ou tags)
  const isAdSource = useMemo(() => {
    const origin = conversation.lead?.origin?.toLowerCase() || ''
    const tags = conversation.lead?.tags || []
    return (
      origin.includes('anúncio') ||
      origin.includes('ad') ||
      origin.includes('facebook ads') ||
      origin.includes('instagram ads') ||
      origin.includes('meta ads') ||
      tags.some((tag) => tag.toLowerCase().includes('anúncio') || tag.toLowerCase().includes('ads'))
    )
  }, [conversation.lead?.origin, conversation.lead?.tags])

  // Obter ícone da plataforma
  const getPlatformIcon = () => {
    if (provider === 'INSTAGRAM') {
      return <Image src="/instagram.png" alt="Instagram" width={12} height={12} className="object-contain" />
    }
    if (provider === 'FACEBOOK') {
      return <Image src="/facebook.png" alt="Facebook" width={12} height={12} className="object-contain" />
    }
    if (provider === 'WHATSAPP') {
      return <Image src="/whatsapp.png" alt="WhatsApp" width={12} height={12} className="object-contain" />
    }
    return null
  }

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
        
        {/* Tags: Plataforma, Origem (Anúncio/Orgânico), Bot, Estágio, Atendente, Departamento, Prioridade */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tag de Plataforma */}
          {provider && (
            <Tag
              variant="default"
              title={`Plataforma: ${provider === 'INSTAGRAM' ? 'Instagram Direct' : provider === 'FACEBOOK' ? 'Facebook Messenger' : 'WhatsApp'}`}
              className={
                provider === 'INSTAGRAM'
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                  : provider === 'FACEBOOK'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-green-500/20 text-green-300 border-green-500/30'
              }
            >
              <div className="h-2.5 w-2.5 flex-shrink-0 relative">
                {getPlatformIcon()}
              </div>
              <span className="hidden sm:inline truncate">
                {provider === 'INSTAGRAM' ? 'Instagram' : provider === 'FACEBOOK' ? 'Facebook' : 'WhatsApp'}
              </span>
            </Tag>
          )}
          
          {/* Tag de Origem (Anúncio vs Orgânico) */}
          {isAdSource && (
            <Tag variant="default" title="Lead de anúncio" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              <Megaphone className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Anúncio</span>
            </Tag>
          )}
          {!isAdSource && conversation.lead?.origin && (
            <Tag variant="default" title="Lead orgânico" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              <Users className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Orgânico</span>
            </Tag>
          )}
          
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
          {attendance?.priority && (
            <Tag
              variant={
                attendance.priority === 'HIGH'
                  ? 'priorityHigh'
                  : attendance.priority === 'LOW'
                  ? 'priorityLow'
                  : 'priorityNormal'
              }
              title={`Prioridade: ${attendance.priority === 'HIGH' ? 'Alta' : attendance.priority === 'LOW' ? 'Baixa' : 'Normal'}`}
            >
              <Flag className="h-2.5 w-2.5" />
              <span className="truncate">
                {attendance.priority === 'HIGH' ? 'Alta' : attendance.priority === 'LOW' ? 'Baixa' : 'Normal'}
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

