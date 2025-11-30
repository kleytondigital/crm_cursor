'use client'

import { useState, useEffect, useMemo } from 'react'
import { Conversation } from '@/types'
import ChatActionsMenu from './chat/ChatActionsMenu'
import EditableText from './EditableText'
import { useChat } from '@/contexts/ChatContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Calendar, ArrowLeft, Bot, User, Building2, Flag, Megaphone, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { leadsAPI } from '@/lib/api'
import { useConversationTags } from '@/hooks/useConversationTags'
import Tag from './ui/Tag'
import Image from 'next/image'

interface ChatHeaderProps {
  conversation: Conversation
  onViewSchedulingHistory?: () => void
}

export default function ChatHeader({ conversation, onViewSchedulingHistory }: ChatHeaderProps) {
  const { loadConversations, selectConversation, clearSelectedConversation } = useChat()
  const isMobile = useIsMobile()
  const [imageError, setImageError] = useState(false)
  const [leadName, setLeadName] = useState(conversation.lead.name)
  const [leadPhone, setLeadPhone] = useState(conversation.lead.phone)
  const { stage, attendance, loading: tagsLoading } = useConversationTags(conversation)

  // Resetar erro de imagem quando a conversa mudar
  useEffect(() => {
    setImageError(false)
  }, [conversation.leadId, conversation.lead.profilePictureURL])

  // Sincronizar estado quando a conversa mudar
  useEffect(() => {
    setLeadName(conversation.lead.name)
    setLeadPhone(conversation.lead.phone)
  }, [conversation.lead.id, conversation.lead.name, conversation.lead.phone])

  // Escutar evento de atualização do lead e attendance
  useEffect(() => {
    const handleUpdate = () => {
      // O hook useConversationTags já escuta mudanças via conversation.leadId e conversation.id
      // Mas podemos forçar reload se necessário
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('lead:updated', handleUpdate)
      window.addEventListener('attendance:updated', handleUpdate)
      return () => {
        window.removeEventListener('lead:updated', handleUpdate)
        window.removeEventListener('attendance:updated', handleUpdate)
      }
    }
  }, [])

  const showImage = conversation.lead.profilePictureURL && !imageError

  // Determinar provider da conversa
  const provider = conversation.provider || (conversation.lead?.phone?.startsWith('social_') ? null : 'WHATSAPP')

  // Verificar se origem é de anúncio
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

  // Função para formatar telefone
  const formatPhone = (phone: string) => {
    // Remove @c.us ou @s.whatsapp.net
    let cleanPhone = phone.replace(/@(c\.us|s\.whatsapp\.net)/, '')
    // Remove espaços e caracteres especiais
    cleanPhone = cleanPhone.replace(/\D/g, '')
    // Formatar: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (cleanPhone.length === 10) {
      return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return cleanPhone
  }

  // Função para limpar formatação do telefone
  const cleanPhone = (phone: string) => {
    return phone.replace(/\D/g, '')
  }

  // Validar telefone (deve ter 10 ou 11 dígitos)
  const validatePhone = (phone: string): boolean | string => {
    const cleaned = cleanPhone(phone)
    if (cleaned.length < 10) {
      return 'Telefone deve ter pelo menos 10 dígitos'
    }
    if (cleaned.length > 11) {
      return 'Telefone deve ter no máximo 11 dígitos'
    }
    return true
  }

  // Validar nome (não pode estar vazio)
  const validateName = (name: string): boolean | string => {
    if (!name || name.trim().length === 0) {
      return 'Nome não pode estar vazio'
    }
    if (name.trim().length < 2) {
      return 'Nome deve ter pelo menos 2 caracteres'
    }
    return true
  }

  // Handler para atualizar nome
  const handleUpdateName = async (newName: string) => {
    try {
      await leadsAPI.update(conversation.lead.id, { name: newName })
      setLeadName(newName)
      // Recarregar conversas para atualizar na lista
      await loadConversations()
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao atualizar nome')
    }
  }

  // Handler para atualizar telefone
  const handleUpdatePhone = async (newPhone: string) => {
    try {
      // Limpar formatação do telefone
      const cleanedPhone = cleanPhone(newPhone)
      
      // Validar tamanho
      if (cleanedPhone.length < 10 || cleanedPhone.length > 11) {
        throw new Error('Telefone deve ter 10 ou 11 dígitos')
      }

      // Adicionar sufixo WhatsApp se não tiver
      const formattedPhone = cleanedPhone.includes('@') 
        ? cleanedPhone 
        : `${cleanedPhone}@c.us`
      
      await leadsAPI.update(conversation.lead.id, { phone: formattedPhone })
      setLeadPhone(formattedPhone)
      // Recarregar conversas para atualizar na lista
      await loadConversations()
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Erro ao atualizar telefone')
    }
  }

  const handleBackToConversations = () => {
    // Limpar conversa selecionada para voltar à lista
    if (isMobile) {
      clearSelectedConversation()
    } else {
      selectConversation(null)
    }
  }

  return (
    <div className="flex items-center justify-between gap-1 md:gap-2 px-1 md:px-0 min-w-0 w-full max-w-full overflow-visible" style={{ overflow: 'visible' }}>
      <div className="flex items-center gap-1.5 md:gap-3 flex-1 min-w-0 overflow-visible max-w-full" style={{ overflow: 'visible' }}>
        {/* Botão voltar no mobile */}
        {isMobile && (
          <button
            onClick={handleBackToConversations}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-colors"
            title="Voltar para conversas"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {showImage ? (
          <img
            src={conversation.lead.profilePictureURL!}
            alt={leadName}
            className="h-10 w-10 md:h-12 md:w-12 rounded-2xl object-cover flex-shrink-0"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-brand-secondary/20 text-base md:text-lg font-semibold text-brand-secondary flex-shrink-0">
            {leadName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex flex-col gap-0.5 md:gap-1 min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <EditableText
              value={leadName}
              onSave={handleUpdateName}
              placeholder="Sem nome"
              validate={validateName}
              className="group min-w-0 flex-1"
              labelClassName="text-sm md:text-base lg:text-lg font-semibold text-white cursor-pointer hover:text-brand-secondary/80 transition-colors truncate block max-w-full"
              inputClassName="text-sm md:text-base lg:text-lg font-semibold w-full min-w-0 max-w-full"
              maxLength={100}
            />
            {/* Indicador de bot */}
            {conversation.isBotAttending && (
              <Tag variant="bot" title="Sendo atendido por bot">
                <Bot className="h-2.5 w-2.5" />
                <span className="hidden sm:inline">Bot</span>
              </Tag>
            )}
          </div>
          {/* Linha de tags: plataforma, origem, estágio, atendente, departamento, prioridade */}
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
                <span className="truncate">
                  {provider === 'INSTAGRAM' ? 'Instagram' : provider === 'FACEBOOK' ? 'Facebook' : 'WhatsApp'}
                </span>
              </Tag>
            )}
            
            {/* Tag de Origem (Anúncio vs Orgânico) */}
            {isAdSource && (
              <Tag variant="default" title="Lead de anúncio" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Megaphone className="h-2.5 w-2.5" />
                <span className="truncate">Anúncio</span>
              </Tag>
            )}
            {!isAdSource && conversation.lead?.origin && (
              <Tag variant="default" title="Lead orgânico" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                <Users className="h-2.5 w-2.5" />
                <span className="truncate">Orgânico</span>
              </Tag>
            )}
            
            {/* Tag do estágio */}
            {stage && (
              <Tag variant="stage" color={stage.color} title={`Etapa: ${stage.name}`}>
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="truncate">{stage.name}</span>
              </Tag>
            )}
            {/* Tag do atendente */}
            {attendance?.assignedUser && (
              <Tag variant="user" title={`Atendente: ${attendance.assignedUser.name}`}>
                <User className="h-2.5 w-2.5" />
                <span className="truncate">{attendance.assignedUser.name.split(' ')[0]}</span>
              </Tag>
            )}
            {/* Tag do departamento */}
            {attendance?.department && (
              <Tag variant="department" title={`Departamento: ${attendance.department.name}`}>
                <Building2 className="h-2.5 w-2.5" />
                <span className="truncate">{attendance.department.name}</span>
              </Tag>
            )}
            {/* Tag de prioridade */}
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
          <EditableText
            value={leadPhone}
            onSave={handleUpdatePhone}
            placeholder="Sem telefone"
            validate={validatePhone}
            className="group min-w-0"
            labelClassName="text-[10px] md:text-xs lg:text-sm text-text-muted cursor-pointer hover:text-text-primary transition-colors truncate block max-w-full"
            inputClassName="text-[10px] md:text-xs lg:text-sm w-full min-w-0 max-w-full"
            maxLength={20}
            getEditValue={(displayValue) => {
              // Ao entrar em modo de edição, mostrar apenas os números (sem @c.us)
              const cleaned = cleanPhone(displayValue)
              return cleaned.replace(/@.*$/, '')
            }}
            formatDisplayValue={(value) => {
              // Ao exibir, formatar o telefone
              return formatPhone(value)
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 relative" style={{ position: 'relative', overflow: 'visible' }}>
        {onViewSchedulingHistory && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewSchedulingHistory}
            className="h-8 md:h-9 gap-1 md:gap-2 text-text-muted hover:text-brand-secondary hidden sm:flex"
            title="Histórico de agendamentos"
          >
            <Calendar className="h-4 w-4" />
            <span className="text-xs hidden md:inline">Agendamentos</span>
          </Button>
        )}
        <div className="relative" style={{ position: 'relative', overflow: 'visible', zIndex: 10000 }}>
          <ChatActionsMenu conversation={conversation} onRefresh={loadConversations} />
        </div>
      </div>
    </div>
  )
}

