'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Conversation, Message } from '@/types'
import { conversationsAPI, messagesAPI } from '@/lib/api'
import {
  connectSocket,
  disconnectSocket,
  joinConversation,
  leaveConversation,
  sendMessage as sendSocketMessage,
  onNewMessage,
  offNewMessage,
  onMessageSent,
  offMessageSent,
  onMessageError,
  offMessageError,
} from '@/lib/socket'

interface ChatContextType {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  messages: Message[]
  loading: boolean
  error: string | null
  selectConversation: (conversation: Conversation) => void
  selectConversationByLeadId: (leadId: string) => Promise<void>
  sendMessage: (content: string, contentType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT', file?: File) => Promise<void>
  loadConversations: () => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedLeadIdRef = useRef<string | null>(null)
  const isLoadingMessagesRef = useRef(false)

  // Conectar ao WebSocket quando o componente monta
  // IMPORTANTE: Não incluir selectedConversation como dependência para evitar reconexões desnecessárias
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('[ChatContext] Token não encontrado, não conectando ao WebSocket')
      return
    }

    console.log('[ChatContext] Conectando ao WebSocket de mensagens')
    const socket = connectSocket(token)

    const handleNewMessage = (data: { message: Message; conversation?: Conversation }) => {
      console.log('[ChatContext] Nova mensagem recebida via WebSocket:', data)
      const { message, conversation } = data
      
      // Sempre adicionar mensagem se for da conversa selecionada
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        console.log('[ChatContext] Adicionando mensagem à conversa selecionada:', message.id)
        setMessages((prev) => {
          const exists = prev.some((item) => item.id === message.id)
          if (exists) {
            console.log('[ChatContext] Mensagem já existe, ignorando:', message.id)
            return prev
          }
          console.log('[ChatContext] Mensagem adicionada à lista:', message.id)
          return [...prev, message]
        })
      } else {
        console.log('[ChatContext] Mensagem não é da conversa selecionada, apenas atualizando lista de conversas')
      }

      // Sempre atualizar última mensagem na lista de conversas
      setConversations((prev) => {
        const exists = prev.some((conv) => conv.id === message.conversationId)
        const lastMessage = message
        const updatedAt =
          message.timestamp ||
          message.createdAt ||
          new Date().toISOString()

        if (exists) {
          const updatedList = prev.map((conv) =>
            conv.id === message.conversationId
              ? {
                  ...conv,
                  ...(conversation ? { ...conversation } : {}),
                  lastMessage,
                  updatedAt,
                }
              : conv
          )

          return updatedList.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
        }

        if (conversation) {
          const newConversation: Conversation = {
            ...conversation,
            lastMessage,
            updatedAt,
          }

          return [newConversation, ...prev]
        }

        return prev
      })

      // Atualizar conversa selecionada se for a mesma
      if (
        selectedConversation &&
        message.conversationId === selectedConversation.id
      ) {
        setSelectedConversation((prev) =>
          prev
            ? {
                ...prev,
                ...(conversation ? { ...conversation } : {}),
                lastMessage: message,
                updatedAt:
                  message.timestamp ||
                  message.createdAt ||
                  new Date().toISOString(),
              }
            : prev,
        )
      }
    }

    const handleMessageSent = (data: { success: boolean; message: Message }) => {
      console.log('[ChatContext] Mensagem enviada via WebSocket:', data)
      if (data.success) {
        setMessages((prev) => {
          const exists = prev.some((item) => item.id === data.message.id)
          if (exists) {
            return prev
          }
          return [...prev, data.message]
        })
      }
    }

    const handleMessageError = (error: { success: boolean; error: string }) => {
      console.error('[ChatContext] Erro ao enviar mensagem:', error)
      setError(error.error)
    }

    onNewMessage(handleNewMessage)
    onMessageSent(handleMessageSent)
    onMessageError(handleMessageError)

    return () => {
      console.log('[ChatContext] Limpando listeners do WebSocket')
      offNewMessage(handleNewMessage)
      offMessageSent(handleMessageSent)
      offMessageError(handleMessageError)
      // NÃO desconectar o socket aqui, pois pode estar sendo usado por outros componentes
      // disconnectSocket()
    }
  }, []) // Remover selectedConversation das dependências para evitar reconexões

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await conversationsAPI.getAll()
      // A API pode retornar um array diretamente ou um objeto com data
      const data = Array.isArray(response) ? response : (response?.data || response || [])
      setConversations(data)
    } catch (err: any) {
      console.error('Erro ao carregar conversas:', err)
      // Não exibir erro de permissão como erro crítico
      const errorMessage = err.response?.data?.message || 'Erro ao carregar conversas'
      if (!errorMessage.includes('permissão') && !errorMessage.includes('permission')) {
        setError(errorMessage)
      }
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (conversationId: string) => {
    if (isLoadingMessagesRef.current) return
    
    try {
      isLoadingMessagesRef.current = true
      setLoading(true)
      setError(null)
      const data = await messagesAPI.getByConversation(conversationId)
      setMessages(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar mensagens')
    } finally {
      setLoading(false)
      isLoadingMessagesRef.current = false
    }
  }, [])

  // Carregar mensagens quando a conversa selecionada mudar
  useEffect(() => {
    if (selectedConversation?.id) {
      console.log('[ChatContext] Carregando mensagens para conversa:', selectedConversation.id)
      loadMessages(selectedConversation.id)
    }
  }, [selectedConversation?.id, loadMessages]) // Apenas quando o ID da conversa mudar

  const selectConversation = useCallback((conversation: Conversation) => {
    // Se já está selecionada, não fazer nada
    if (selectedConversation?.id === conversation.id) {
      return
    }

    // Sair da conversa anterior
    if (selectedConversation) {
      leaveConversation(selectedConversation.id)
    }

    setSelectedConversation(conversation)
    setMessages([])
    selectedLeadIdRef.current = null

    // Entrar na nova conversa
    joinConversation(conversation.id)
    
    // Carregar mensagens
    loadMessages(conversation.id)
  }, [selectedConversation, loadMessages])

  const selectConversationByLeadId = useCallback(async (leadId: string) => {
    // Evitar seleção duplicada
    if (selectedLeadIdRef.current === leadId && selectedConversation?.leadId === leadId) {
      return
    }

    try {
      setError(null)
      selectedLeadIdRef.current = leadId
      
      // Buscar conversas do servidor para garantir que temos a mais recente
      const data = await conversationsAPI.getAll()
      
      // Buscar conversa pelo leadId
      const found = data.find((conv: Conversation) => conv.leadId === leadId)
      
      if (found) {
        // Atualizar lista de conversas
        setConversations((prev) => {
          const exists = prev.some((conv) => conv.id === found.id)
          if (exists) {
            return prev.map((conv) => (conv.id === found.id ? found : conv))
          }
          return [found, ...prev]
        })
        
        // Selecionar a conversa apenas se for diferente da atual
        if (selectedConversation?.id !== found.id) {
          if (selectedConversation) {
            leaveConversation(selectedConversation.id)
          }
          
          setSelectedConversation(found)
          setMessages([])
          joinConversation(found.id)
          loadMessages(found.id)
        }
      } else {
        setError(`Nenhuma conversa encontrada para o lead ${leadId}`)
        selectedLeadIdRef.current = null
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao buscar conversa')
      selectedLeadIdRef.current = null
    }
  }, [selectedConversation, loadMessages])

  const sendMessage = useCallback(
    async (
      content: string,
      contentType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT',
      file?: File
    ) => {
      if (!selectedConversation) return

      try {
        setError(null)

        let contentUrl: string | undefined
        let contentText = content

        if (file) {
          const upload = await messagesAPI.upload(file)
          contentUrl = upload.url
          contentText = upload.filename || content
        }

        const optimisticMessage = {
          id: crypto.randomUUID(),
          conversationId: selectedConversation.id,
          senderType: 'USER' as const,
          contentType,
          contentText,
          contentUrl,
          tenantId: selectedConversation.tenantId,
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          direction: 'OUTGOING' as const,
          sender: undefined,
        }

        setMessages((prev) => [...prev, optimisticMessage])

        await messagesAPI.send({
          conversationId: selectedConversation.id,
          senderType: 'USER',
          contentType,
          contentText,
          contentUrl,
        })
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erro ao enviar mensagem')
      }
    },
    [selectedConversation]
  )

  // Carregar conversas ao montar
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Recarregar conversas quando um atendimento for assumido
  useEffect(() => {
    const handleAttendanceClaimed = (event: CustomEvent) => {
      const { leadId } = event.detail || {}
      console.log('[ChatContext] Atendimento assumido, recarregando conversas...', leadId)
      // Aguardar um pouco para garantir que o backend processou a criação/atualização da conversa
      setTimeout(() => {
        loadConversations()
      }, 1000)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('attendance:claimed', handleAttendanceClaimed as EventListener)
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('attendance:claimed', handleAttendanceClaimed as EventListener)
      }
    }
  }, [loadConversations])

  return (
    <ChatContext.Provider
      value={{
        conversations,
        selectedConversation,
        messages,
        loading,
        error,
        selectConversation,
        selectConversationByLeadId,
        sendMessage,
        loadConversations,
        loadMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

