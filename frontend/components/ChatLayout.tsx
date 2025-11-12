'use client'

import { useChat } from '@/contexts/ChatContext'
import ConversationsSidebar from './ConversationsSidebar'
import ChatArea from './ChatArea'
import EmptyState from './EmptyState'

export default function ChatLayout() {
  const { selectedConversation } = useChat()

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[calc(100vh-140px)] flex-col overflow-hidden rounded-3xl border border-white/5 bg-background-subtle/80 backdrop-blur-xl shadow-glow lg:flex-row">
      <div className="flex w-full max-w-full border-b border-white/5 bg-background-muted/70 lg:h-full lg:w-[340px] lg:border-b-0 lg:border-r">
        <ConversationsSidebar />
      </div>

      <div className="flex flex-1 flex-col">
        {selectedConversation ? <ChatArea /> : <EmptyState />}
      </div>
    </div>
  )
}

