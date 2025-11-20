'use client'

import { useState, useEffect } from 'react'
import { Conversation } from '@/types'
import ChatActionsMenu from './chat/ChatActionsMenu'
import EditableText from './EditableText'
import { useChat } from '@/contexts/ChatContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Calendar, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { leadsAPI } from '@/lib/api'

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

  // Resetar erro de imagem quando a conversa mudar
  useEffect(() => {
    setImageError(false)
  }, [conversation.leadId, conversation.lead.profilePictureURL])

  // Sincronizar estado quando a conversa mudar
  useEffect(() => {
    setLeadName(conversation.lead.name)
    setLeadPhone(conversation.lead.phone)
  }, [conversation.lead.id, conversation.lead.name, conversation.lead.phone])

  const showImage = conversation.lead.profilePictureURL && !imageError

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
          <EditableText
            value={leadName}
            onSave={handleUpdateName}
            placeholder="Sem nome"
            validate={validateName}
            className="group min-w-0"
            labelClassName="text-sm md:text-base lg:text-lg font-semibold text-white cursor-pointer hover:text-brand-secondary/80 transition-colors truncate block max-w-full"
            inputClassName="text-sm md:text-base lg:text-lg font-semibold w-full min-w-0 max-w-full"
            maxLength={100}
          />
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

