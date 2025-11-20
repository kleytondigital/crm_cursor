'use client'

import { useChat } from '@/contexts/ChatContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import ConversationsSidebar from './ConversationsSidebar'
import ChatArea from './ChatArea'
import EmptyState from './EmptyState'

export default function ChatLayout() {
  const { selectedConversation } = useChat()
  const isMobile = useIsMobile()

  // No mobile: mostrar apenas lista OU chat (não ambos)
  // No desktop: mostrar ambos lado a lado
  const showSidebar = !isMobile || !selectedConversation
  const showChatArea = !isMobile || selectedConversation

  // Calcular altura no mobile considerando header e bottom nav
  const mobileHeight = isMobile 
    ? 'calc(100vh - 120px)' // Header menor no mobile + espaço para bottom nav
    : 'calc(100vh - 140px)' // Desktop

  return (
    <div 
      className="flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-background-subtle/80 backdrop-blur-xl shadow-glow lg:flex-row"
      style={{
        height: isMobile ? mobileHeight : 'calc(100vh - 140px)',
        minHeight: isMobile ? mobileHeight : 'calc(100vh - 140px)',
        maxHeight: isMobile ? mobileHeight : 'calc(100vh - 140px)',
      }}
    >
      {/* Sidebar - esconder no mobile quando chat estiver selecionado */}
      {showSidebar && (
        <div className={`flex w-full max-w-full border-b border-white/5 bg-background-muted/70 lg:h-full lg:w-[340px] lg:border-b-0 lg:border-r ${
          isMobile && selectedConversation ? 'hidden' : ''
        }`}>
          <ConversationsSidebar />
        </div>
      )}

      {/* Chat Area - esconder no mobile quando nenhum chat estiver selecionado */}
      {showChatArea && (
        <div className={`flex flex-1 flex-col ${
          isMobile && !selectedConversation ? 'hidden' : ''
        }`}>
          {selectedConversation ? <ChatArea /> : <EmptyState />}
        </div>
      )}
    </div>
  )
}

