'use client'

import { useState, useEffect } from 'react'
import { useChat } from '@/contexts/ChatContext'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ChatHeader from './ChatHeader'
import ScheduleMessageDialog from './chat/ScheduleMessageDialog'
import ScheduledMessagesList from './chat/ScheduledMessagesList'
import SchedulingHistoryDialog from './chat/SchedulingHistoryDialog'

export default function ChatArea() {
  const { selectedConversation, loading, loadMessages } = useChat()
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [replyToMessage, setReplyToMessage] = useState<any>(null)
  const [editMessage, setEditMessage] = useState<any>(null)

  if (!selectedConversation) {
    return null
  }

  const handleScheduleSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div 
      className="flex h-full min-h-0 flex-1 flex-col bg-background-subtle/40" 
      style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
      data-chat-area
    >
      <div className="border-b border-white/5 bg-background-subtle/80 px-3 py-3 md:px-6 md:py-5 shadow-inner-glow flex-shrink-0" style={{ flexShrink: 0 }}>
        <ChatHeader
          conversation={selectedConversation}
          onViewSchedulingHistory={() => setHistoryDialogOpen(true)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" style={{ 
        WebkitOverflowScrolling: 'touch', 
        minHeight: 0, 
        flex: '1 1 0%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {loading ? (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            Carregando mensagens...
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto" style={{ 
              WebkitOverflowScrolling: 'touch', 
              minHeight: 0,
              flex: '1 1 0%',
              overflowY: 'auto',
              overflowX: 'hidden',
              position: 'relative',
              width: '100%',
              height: '100%'
            }}>
              <MessageList
                replyToMessage={replyToMessage}
                setReplyToMessage={setReplyToMessage}
                editMessage={editMessage}
                setEditMessage={setEditMessage}
              />
            </div>
            <div className="flex-shrink-0">
              <ScheduledMessagesList
                key={refreshKey}
                leadId={selectedConversation.leadId}
                onUpdate={handleScheduleSuccess}
                onViewHistory={() => setHistoryDialogOpen(true)}
              />
            </div>
          </>
        )}
      </div>

      <div 
        className="border-t border-white/5 bg-background-muted/60 px-2 md:px-3 lg:px-6 py-2 md:py-3 lg:py-4 flex-shrink-0" 
        style={{ 
          flexShrink: 0,
          paddingBottom: typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches 
            ? 'max(0.5rem, env(safe-area-inset-bottom))' 
            : '0.5rem',
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '100%',
          overflow: 'visible'
        }}
      >
        <MessageInput 
          onScheduleClick={() => setScheduleDialogOpen(true)}
          replyTo={replyToMessage}
          onReplyCancel={() => setReplyToMessage(null)}
          editMessage={editMessage}
          onEditCancel={() => setEditMessage(null)}
          onEditSuccess={() => {
            setEditMessage(null)
            if (selectedConversation?.id) {
              loadMessages(selectedConversation.id)
            }
          }}
        />
      </div>

      <ScheduleMessageDialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        conversation={selectedConversation}
        onSuccess={handleScheduleSuccess}
      />

      <SchedulingHistoryDialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        leadId={selectedConversation.leadId}
        onUpdate={handleScheduleSuccess}
      />
    </div>
  )
}

