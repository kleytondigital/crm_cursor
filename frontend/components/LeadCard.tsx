'use client'

import { Draggable } from 'react-beautiful-dnd'
import { Lead } from '@/types'
import { Phone, Tag, Calendar, MessageSquare, FileText } from 'lucide-react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { useRouter } from 'next/navigation'

interface LeadCardProps {
  lead: Lead
  index: number
  onOpenChat?: (leadId: string) => void
}

export default function LeadCard({ lead, index, onOpenChat }: LeadCardProps) {
  const router = useRouter()

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
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`cursor-move rounded-2xl border border-white/10 bg-background-subtle/80 p-4 shadow-inner-glow transition-all ${
            snapshot.isDragging ? 'scale-[1.02] border-brand-secondary/50 shadow-glow' : ''
          }`}
        >
          <h3 className="mb-2 line-clamp-2 text-base font-semibold text-white">{getDisplayName()}</h3>

          <div className="mb-3 flex items-center text-sm text-text-muted">
            <Phone className="mr-2 h-4 w-4 text-brand-secondary" />
            <span className="truncate">{formatPhone(lead.phone)}</span>
          </div>

          {lead.tags && lead.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {lead.tags.slice(0, 3).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-wide text-text-muted"
                >
                  <Tag className="h-3 w-3 text-brand-secondary" />
                  {tag}
                </span>
              ))}
              {lead.tags.length > 3 && (
                <span className="text-xs text-text-muted">+{lead.tags.length - 3}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-white/5 pt-3 text-xs text-text-muted">
            <Calendar className="h-3 w-3 text-brand-secondary" />
            <span>Criado em {formatDate(lead.createdAt)}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => router.push(`/leads/${lead.id}`)}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-text-muted transition hover:border-brand-secondary/40 hover:text-brand-secondary"
            >
              <FileText className="h-3.5 w-3.5" />
              Ver dados
            </button>
            <button
              onClick={handleOpenChat}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-text-muted transition hover:border-brand-secondary/40 hover:text-brand-secondary"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Abrir chat
            </button>
          </div>
        </div>
      )}
    </Draggable>
  )
}
