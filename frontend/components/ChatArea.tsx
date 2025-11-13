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
    <div className="flex min-h-0 flex-1 flex-col bg-background-subtle/40">
      <div className="border-b border-white/5 bg-background-subtle/80 px-6 py-5 shadow-inner-glow">
        <ChatHeader
          conversation={selectedConversation}
          onViewSchedulingHistory={() => setHistoryDialogOpen(true)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            Carregando mensagens...
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <MessageList
                replyToMessage={replyToMessage}
                setReplyToMessage={setReplyToMessage}
                editMessage={editMessage}
                setEditMessage={setEditMessage}
              />
            </div>
            <ScheduledMessagesList
              key={refreshKey}
              leadId={selectedConversation.leadId}
              onUpdate={handleScheduleSuccess}
              onViewHistory={() => setHistoryDialogOpen(true)}
            />
          </>
        )}
      </div>

      <div className="border-t border-white/5 bg-background-muted/60 px-6 py-4">
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

