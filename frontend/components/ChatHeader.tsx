'use client'

import { useState, useEffect } from 'react'
import { Conversation } from '@/types'
import ChatActionsMenu from './chat/ChatActionsMenu'
import EditableText from './EditableText'
import { useChat } from '@/contexts/ChatContext'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { leadsAPI } from '@/lib/api'

interface ChatHeaderProps {
  conversation: Conversation
  onViewSchedulingHistory?: () => void
}

export default function ChatHeader({ conversation, onViewSchedulingHistory }: ChatHeaderProps) {
  const { loadConversations } = useChat()
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

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showImage ? (
          <img
            src={conversation.lead.profilePictureURL!}
            alt={leadName}
            className="h-12 w-12 rounded-2xl object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-secondary/20 text-lg font-semibold text-brand-secondary">
            {leadName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <EditableText
            value={leadName}
            onSave={handleUpdateName}
            placeholder="Sem nome"
            validate={validateName}
            className="group"
            labelClassName="text-lg font-semibold text-white cursor-pointer hover:text-brand-secondary/80 transition-colors"
            maxLength={100}
          />
          <EditableText
            value={leadPhone}
            onSave={handleUpdatePhone}
            placeholder="Sem telefone"
            validate={validatePhone}
            className="group"
            labelClassName="text-sm text-text-muted cursor-pointer hover:text-text-primary transition-colors"
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

