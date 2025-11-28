'use client'

import { Draggable } from 'react-beautiful-dnd'
import { Lead } from '@/types'
import { Phone, Tag, Calendar, MessageSquare, FileText, Bot, User, Building2, Flag } from 'lucide-react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { useRouter } from 'next/navigation'
import { useConversationTags } from '@/hooks/useConversationTags'
import TagComponent from './ui/Tag'

interface LeadCardProps {
  lead: Lead
  index: number
  onOpenChat?: (leadId: string) => void
  isDragDisabled?: boolean
}

export default function LeadCard({ lead, index, onOpenChat, isDragDisabled = false }: LeadCardProps) {
  const router = useRouter()
  // Criar uma conversa fake para usar o hook (precisa de conversation.leadId)
  const fakeConversation = lead.conversations?.[0] || {
    id: '',
    leadId: lead.id,
    status: 'ACTIVE' as const,
    tenantId: lead.tenantId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    lead: {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      tags: lead.tags,
    },
  }
  const { stage, attendance } = useConversationTags(fakeConversation)

  const handleOpenChat = () => {
    if (onOpenChat) {
      onOpenChat(lead.id)
    } else {
      router.push(`/?leadId=${lead.id}`)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
  }

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

  const getDisplayName = () => {
    // Se o nome existe e não está vazio (após trim), usar o nome
    if (lead.name && lead.name.trim().length > 0) {
      return lead.name.trim()
    }
    // Caso contrário, formatar o telefone
    return formatPhone(lead.phone)
  }

  return (
    <Draggable draggableId={lead.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`w-full max-w-full rounded-xl border border-white/10 bg-background-subtle/80 p-2 shadow-inner-glow transition-all ${
            isDragDisabled 
              ? 'cursor-default opacity-75' 
              : 'cursor-move'
          } ${
            snapshot.isDragging ? 'scale-[1.02] border-brand-secondary/50 shadow-glow' : ''
          }`}
          style={{ maxWidth: '100%' }}
        >
          {/* Nome e Bot */}
          <div className="mb-1.5 flex items-center justify-between gap-1.5 min-w-0">
            <h3 className="text-xs font-semibold text-white flex-1 min-w-0 truncate" title={getDisplayName()}>{getDisplayName()}</h3>
            {lead.conversations?.some((conv) => conv.isBotAttending) && (
              <TagComponent variant="bot" title="Sendo atendido por bot">
                <Bot className="h-2 w-2" />
              </TagComponent>
            )}
          </div>

          {/* Tags de indicadores visuais */}
          {(stage || attendance?.assignedUser || attendance?.department || attendance?.priority) && (
            <div className="mb-1.5 flex items-center gap-1 flex-wrap">
              {stage && (
                <TagComponent variant="stage" color={stage.color} title={`Etapa: ${stage.name}`}>
                  <div className="h-1 w-1 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                  <span className="truncate max-w-[60px]">{stage.name}</span>
                </TagComponent>
              )}
              {attendance?.assignedUser && (
                <TagComponent variant="user" title={`Atendente: ${attendance.assignedUser.name}`}>
                  <User className="h-2 w-2 flex-shrink-0" />
                  <span className="truncate max-w-[40px]">{attendance.assignedUser.name.split(' ')[0]}</span>
                </TagComponent>
              )}
              {attendance?.department && (
                <TagComponent variant="department" title={`Departamento: ${attendance.department.name}`}>
                  <Building2 className="h-2 w-2 flex-shrink-0" />
                  <span className="truncate max-w-[50px]">{attendance.department.name}</span>
                </TagComponent>
              )}
              {attendance?.priority && (
                <TagComponent
                  variant={
                    attendance.priority === 'HIGH'
                      ? 'priorityHigh'
                      : attendance.priority === 'LOW'
                      ? 'priorityLow'
                      : 'priorityNormal'
                  }
                  title={`Prioridade: ${attendance.priority === 'HIGH' ? 'Alta' : attendance.priority === 'LOW' ? 'Baixa' : 'Normal'}`}
                >
                  <Flag className="h-2 w-2 flex-shrink-0" />
                  <span className="truncate">
                    {attendance.priority === 'HIGH' ? 'Alta' : attendance.priority === 'LOW' ? 'Baixa' : 'Normal'}
                  </span>
                </TagComponent>
              )}
            </div>
          )}

          {/* Telefone */}
          <div className="mb-1.5 flex items-center text-[10px] text-text-muted">
            <Phone className="mr-1 h-3 w-3 text-brand-secondary" />
            <span className="truncate">{formatPhone(lead.phone)}</span>
          </div>

          {/* Tags do lead */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {lead.tags.slice(0, 2).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="inline-flex items-center gap-0.5 rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-text-muted"
                >
                  <Tag className="h-2.5 w-2.5 text-brand-secondary" />
                  {tag}
                </span>
              ))}
              {lead.tags.length > 2 && (
                <span className="text-[9px] text-text-muted">+{lead.tags.length - 2}</span>
              )}
            </div>
          )}

          {/* Data de criação */}
          <div className="mb-1.5 flex items-center gap-1 border-t border-white/5 pt-1.5 text-[9px] text-text-muted">
            <Calendar className="h-2.5 w-2.5 text-brand-secondary" />
            <span>Criado em {formatDate(lead.createdAt)}</span>
          </div>

          {/* Botões */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/leads/${lead.id}`)
              }}
              className="inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wide text-text-muted transition hover:border-brand-secondary/40 hover:text-brand-secondary"
            >
              <FileText className="h-2.5 w-2.5" />
              Ver dados
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleOpenChat()
              }}
              className="inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wide text-text-muted transition hover:border-brand-secondary/40 hover:text-brand-secondary"
            >
              <MessageSquare className="h-2.5 w-2.5" />
              Abrir chat
            </button>
          </div>
        </div>
      )}
    </Draggable>
  )
}
