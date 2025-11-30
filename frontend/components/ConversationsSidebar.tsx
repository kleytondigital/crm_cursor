'use client'

import { useChat } from '@/contexts/ChatContext'
import { Search, MessageCircle, Filter, MessageSquare } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import ConversationListItem from './ConversationListItem'
import Image from 'next/image'

type PlatformTab = 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | 'ALL'

export default function ConversationsSidebar() {
  const { conversations, selectedConversation, selectConversation, loading } = useChat()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<PlatformTab>('ALL')
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  // Resetar erros de imagem quando o profilePictureURL mudar nas conversas
  useEffect(() => {
    // Limpar erros apenas para conversas que agora têm profilePictureURL
    setImageErrors((prev) => {
      const newErrors = { ...prev }
      conversations.forEach((conv) => {
        if (conv.lead?.profilePictureURL && newErrors[conv.lead.id]) {
          delete newErrors[conv.lead.id]
        }
      })
      return newErrors
    })
  }, [conversations])

  // Filtrar conversas por plataforma
  const conversationsByPlatform = useMemo(() => {
    const whatsapp = conversations.filter((conv) => {
      // WhatsApp: não é social (phone não começa com 'social_') e provider não é INSTAGRAM/FACEBOOK
      const isSocial = conv.lead?.phone?.startsWith('social_')
      return !isSocial && conv.provider !== 'INSTAGRAM' && conv.provider !== 'FACEBOOK'
    })
    
    const instagram = conversations.filter((conv) => conv.provider === 'INSTAGRAM')
    const facebook = conversations.filter((conv) => conv.provider === 'FACEBOOK')
    
    return {
      WHATSAPP: whatsapp,
      INSTAGRAM: instagram,
      FACEBOOK: facebook,
      ALL: conversations,
    }
  }, [conversations])

  // Contar conversas por plataforma
  const platformCounts = useMemo(() => {
    return {
      WHATSAPP: conversationsByPlatform.WHATSAPP.length,
      INSTAGRAM: conversationsByPlatform.INSTAGRAM.length,
      FACEBOOK: conversationsByPlatform.FACEBOOK.length,
      ALL: conversationsByPlatform.ALL.length,
    }
  }, [conversationsByPlatform])

  const normalizedSearch = searchTerm.toLowerCase().trim()

  // Filtrar conversas pela aba ativa e busca
  const filteredConversations = useMemo(() => {
    const platformConversations = conversationsByPlatform[activeTab] || conversationsByPlatform.ALL

    if (!normalizedSearch) {
      return platformConversations
    }

    return platformConversations.filter((conv) => {
      const leadName = conv.lead?.name ?? ''
      const leadPhone = conv.lead?.phone ?? ''

      return (
        leadName.toLowerCase().includes(normalizedSearch) ||
        leadPhone.includes(normalizedSearch)
      )
    })
  }, [conversationsByPlatform, activeTab, normalizedSearch])

  // Resetar aba ativa quando não há conversas da plataforma selecionada
  useEffect(() => {
    if (platformCounts[activeTab] === 0 && activeTab !== 'ALL') {
      // Se a aba ativa não tem conversas e há conversas em outras plataformas, mudar para ALL
      if (platformCounts.ALL > 0) {
        setActiveTab('ALL')
      } else if (platformCounts.WHATSAPP > 0) {
        setActiveTab('WHATSAPP')
      } else if (platformCounts.INSTAGRAM > 0) {
        setActiveTab('INSTAGRAM')
      } else if (platformCounts.FACEBOOK > 0) {
        setActiveTab('FACEBOOK')
      }
    }
  }, [platformCounts, activeTab])

  return (
    <div className="flex h-full w-full flex-col md:h-auto">
      <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-background-muted to-background-card px-3 pb-4 pt-4 md:px-5 md:pb-6 md:pt-8">
        <div className="absolute inset-0 bg-hero-grid opacity-70" />
        <div className="relative z-10 space-y-1">
          {/* <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Painel LiveOps</p> */}
          <h2 className="text-xl md:text-2xl font-bold text-white">Conversas</h2>
          <p className="hidden md:block text-sm text-text-muted">
            Acompanhe atendimentos em tempo real e priorize leads quentes.
          </p>
        </div>
      </div>

      {/* Abas de Plataforma */}
      <div className="border-b border-white/5 bg-background-subtle/70 px-3 pt-3 md:px-4 md:pt-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-brand-primary/20 text-white shadow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageCircle className="h-3 w-3 flex-shrink-0" />
            <span>Todas</span>
            {platformCounts.ALL > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                activeTab === 'ALL' ? 'bg-brand-primary/30' : 'bg-white/10'
              }`}>
                {platformCounts.ALL}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('WHATSAPP')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'WHATSAPP'
                ? 'bg-green-500/20 text-green-300 shadow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="h-3 w-3 flex-shrink-0 relative">
              <Image src="/whatsapp.png" alt="WhatsApp" width={12} height={12} className="object-contain" />
            </div>
            <span>WhatsApp</span>
            {platformCounts.WHATSAPP > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                activeTab === 'WHATSAPP' ? 'bg-green-500/30' : 'bg-white/10'
              }`}>
                {platformCounts.WHATSAPP}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('INSTAGRAM')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'INSTAGRAM'
                ? 'bg-pink-500/20 text-pink-300 shadow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="h-3 w-3 flex-shrink-0 relative">
              <Image src="/instagram.png" alt="Instagram" width={12} height={12} className="object-contain" />
            </div>
            <span>Instagram</span>
            {platformCounts.INSTAGRAM > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                activeTab === 'INSTAGRAM' ? 'bg-pink-500/30' : 'bg-white/10'
              }`}>
                {platformCounts.INSTAGRAM}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('FACEBOOK')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'FACEBOOK'
                ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="h-3 w-3 flex-shrink-0 relative">
              <Image src="/facebook.png" alt="Facebook" width={12} height={12} className="object-contain" />
            </div>
            <span>Facebook</span>
            {platformCounts.FACEBOOK > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                activeTab === 'FACEBOOK' ? 'bg-blue-500/30' : 'bg-white/10'
              }`}>
                {platformCounts.FACEBOOK}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="border-b border-white/5 bg-background-subtle/70 p-3 md:p-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 md:left-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-background-muted/80 py-1.5 md:py-2 pl-8 md:pl-10 pr-3 md:pr-4 text-xs md:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
            />
          </div>
          <button className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full border border-white/10 bg-background-muted/80 text-text-muted transition hover:text-white">
            <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ 
        maxHeight: 'calc(100vh - 180px)',
        WebkitOverflowScrolling: 'touch',
        overflowY: 'auto'
      }}>
        {loading && conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-muted">
            Carregando conversas...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 text-text-muted">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background-muted/60">
              <MessageCircle className="h-7 w-7" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">Nada por aqui ainda</p>
              <p className="text-sm text-text-muted">
                Quando novos leads entrarem, seus atendimentos aparecerão nesta lista.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredConversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isActive={selectedConversation?.id === conversation.id}
                onSelect={() => selectConversation(conversation)}
                imageError={imageErrors[conversation.lead?.id || ''] || false}
                onImageError={() => {
                  if (conversation.lead?.id) {
                    setImageErrors((prev) => ({ ...prev, [conversation.lead.id]: true }))
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

