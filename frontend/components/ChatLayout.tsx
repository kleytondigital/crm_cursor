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

  // No mobile quando chat está selecionado, ocupar 100vh (fullscreen)
  // No desktop ou lista: altura normal
  const getContainerStyle = () => {
    if (isMobile && selectedConversation) {
      // Fullscreen no mobile quando chat selecionado
      return {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100dvh', // Usar dynamic viewport height para mobile
        width: '100dvw', // Usar dynamic viewport width para mobile
        maxHeight: '100dvh',
        maxWidth: '100dvw',
        zIndex: 1000,
        borderRadius: 0,
      }
    }
    // Altura normal para desktop ou lista
    const mobileHeight = isMobile 
      ? 'calc(100vh - 120px)'
      : 'calc(100vh - 140px)'
    return {
      height: isMobile ? mobileHeight : 'calc(100vh - 140px)',
      minHeight: isMobile ? mobileHeight : 'calc(100vh - 140px)',
      maxHeight: isMobile ? mobileHeight : 'calc(100vh - 140px)',
    }
  }

  return (
    <div 
      className={`flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-background-subtle/80 backdrop-blur-xl shadow-glow lg:flex-row ${
        isMobile && selectedConversation ? 'fixed inset-0 z-[1000] rounded-none' : ''
      }`}
      style={getContainerStyle()}
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
        <div className={`flex flex-1 flex-col h-full ${
          isMobile && !selectedConversation ? 'hidden' : ''
        }`} style={{ minHeight: 0, height: '100%' }}>
          {selectedConversation ? <ChatArea /> : <EmptyState />}
        </div>
      )}
    </div>
  )
}

