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
  sendMessage: (content: string, contentType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT', file?: File, replyTo?: string, action?: 'reply') => Promise<void>
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
  // Ref para manter o valor atual de selectedConversation no closure do WebSocket
  const selectedConversationRef = useRef<Conversation | null>(null)

  // Atualizar a ref quando selectedConversation mudar
  useEffect(() => {
    selectedConversationRef.current = selectedConversation
  }, [selectedConversation])

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
      
      // Usar ref para obter o valor atual de selectedConversation
      const currentSelectedConversation = selectedConversationRef.current
      
      // Sempre adicionar mensagem se for da conversa selecionada
      if (currentSelectedConversation && message.conversationId === currentSelectedConversation.id) {
        console.log('[ChatContext] Adicionando mensagem à conversa selecionada:', message.id, 'Conversa:', currentSelectedConversation.id)
        setMessages((prev) => {
          // Verificar se a mensagem já existe pelo ID
          const existsById = prev.some((item) => item.id === message.id)
          if (existsById) {
            console.log('[ChatContext] Mensagem já existe pelo ID, substituindo:', message.id)
            // Substituir a mensagem existente (pode ser otimista ou do servidor)
            return prev.map((item) => (item.id === message.id ? message : item))
          }
          
          // Verificar se há uma mensagem otimista que corresponde a esta mensagem do servidor
          // Procurar por mensagem otimista com mesmo conversationId, contentText e timestamp aproximado
          // Ou usar messageId se disponível
          if (message.messageId) {
            // Se a mensagem tem messageId do WhatsApp, verificar se há uma mensagem otimista sem messageId
            const optimisticIndex = prev.findIndex(
              (item) =>
                !item.messageId && // Mensagem otimista sem messageId
                item.conversationId === message.conversationId &&
                (item.contentText === message.contentText || 
                 (item.contentUrl === message.contentUrl && message.contentUrl)) && // Considerar URL para mídia
                item.senderType === message.senderType &&
                Math.abs(
                  new Date(item.timestamp || item.createdAt).getTime() -
                    new Date(message.timestamp || message.createdAt).getTime()
                ) < 10000 // Dentro de 10 segundos para dar mais margem
            )
            
            if (optimisticIndex !== -1) {
              console.log('[ChatContext] Substituindo mensagem otimista pela mensagem real:', message.id)
              // Substituir a mensagem otimista pela mensagem real do servidor
              const updated = [...prev]
              updated[optimisticIndex] = message
              return updated
            }
          }
          
          // Verificar também pelo messageId se a mensagem já existe com outro ID
          if (message.messageId) {
            const existsByMessageId = prev.some((item) => item.messageId === message.messageId)
            if (existsByMessageId) {
              console.log('[ChatContext] Mensagem já existe pelo messageId, substituindo:', message.messageId)
              return prev.map((item) => (item.messageId === message.messageId ? message : item))
            }
          }
          
          console.log('[ChatContext] Mensagem adicionada à lista:', message.id)
          return [...prev, message]
        })
      } else {
        console.log('[ChatContext] Mensagem não é da conversa selecionada. Conversa atual:', currentSelectedConversation?.id, 'Mensagem:', message.conversationId)
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

      // Atualizar conversa selecionada se for a mesma (usar ref para obter valor atual)
      if (
        currentSelectedConversation &&
        message.conversationId === currentSelectedConversation.id
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
          // Verificar se a mensagem já existe pelo ID
          const existsById = prev.some((item) => item.id === data.message.id)
          if (existsById) {
            console.log('[ChatContext] Mensagem já existe pelo ID, substituindo:', data.message.id)
            // Substituir a mensagem existente (pode ser otimista ou do servidor)
            return prev.map((item) => (item.id === data.message.id ? data.message : item))
          }
          
          // Verificar se há uma mensagem otimista que corresponde a esta mensagem do servidor
          // Procurar por mensagem otimista com mesmo conversationId, contentText e timestamp aproximado
          if (data.message.messageId) {
            // Se a mensagem tem messageId do WhatsApp, verificar se há uma mensagem otimista sem messageId
            const optimisticIndex = prev.findIndex(
              (item) =>
                !item.messageId && // Mensagem otimista sem messageId
                item.conversationId === data.message.conversationId &&
                (item.contentText === data.message.contentText || 
                 (item.contentUrl === data.message.contentUrl && data.message.contentUrl)) && // Considerar URL para mídia
                item.senderType === data.message.senderType &&
                Math.abs(
                  new Date(item.timestamp || item.createdAt).getTime() -
                    new Date(data.message.timestamp || data.message.createdAt).getTime()
                ) < 10000 // Dentro de 10 segundos para dar mais margem
            )
            
            if (optimisticIndex !== -1) {
              console.log('[ChatContext] Substituindo mensagem otimista pela mensagem real do servidor:', data.message.id)
              // Substituir a mensagem otimista pela mensagem real do servidor
              const updated = [...prev]
              updated[optimisticIndex] = data.message
              return updated
            }
            
            // Verificar também pelo messageId se a mensagem já existe com outro ID
            const existsByMessageId = prev.some((item) => item.messageId === data.message.messageId)
            if (existsByMessageId) {
              console.log('[ChatContext] Mensagem já existe pelo messageId (handleMessageSent), substituindo:', data.message.messageId)
              return prev.map((item) => (item.messageId === data.message.messageId ? data.message : item))
            }
          }
          
          console.log('[ChatContext] Mensagem adicionada à lista (handleMessageSent):', data.message.id)
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
      
      // Verificar se há mensagens novas recebidas via WebSocket que não estão no servidor
      // Mesclar as mensagens do servidor com as mensagens locais (recebidas via WebSocket)
      const currentSelectedConversation = selectedConversationRef.current
      const serverMessages = Array.isArray(data) ? data : []
      
      setMessages((prevMessages) => {
        // Se não é a conversa selecionada, usar dados do servidor
        if (!currentSelectedConversation || currentSelectedConversation.id !== conversationId) {
          return serverMessages
        }
        
        // Se há mensagens locais, mesclar com as do servidor
        // Manter mensagens locais que não estão no servidor (mais recentes recebidas via WebSocket)
        const serverMessageIds = new Set(serverMessages.map((msg: Message) => msg.id))
        const localMessagesNotInServer = prevMessages.filter((msg) => 
          msg.conversationId === conversationId && !serverMessageIds.has(msg.id)
        )
        
        // Combinar mensagens do servidor com mensagens locais não presentes no servidor
        const allMessages = [...serverMessages, ...localMessagesNotInServer]
        
        // Remover duplicatas usando Map (última ocorrência vence)
        const messageMap = new Map<string, Message>()
        allMessages.forEach((msg) => {
          messageMap.set(msg.id, msg)
        })
        
        // Converter de volta para array e ordenar por timestamp
        const uniqueMessages = Array.from(messageMap.values()).sort((a, b) => {
          const aTime = new Date(a.timestamp || a.createdAt || 0).getTime()
          const bTime = new Date(b.timestamp || b.createdAt || 0).getTime()
          return aTime - bTime
        })
        
        console.log('[ChatContext] Mensagens mescladas:', {
          servidor: serverMessages.length,
          locais: localMessagesNotInServer.length,
          total: uniqueMessages.length,
          conversationId,
        })
        
        return uniqueMessages
      })
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
      file?: File,
      replyTo?: string,
      action?: 'reply',
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

        // Buscar a mensagem original se for uma resposta para incluir nos dados otimistas
        let replyMessageId: string | null = null
        let replyText: string | null = null
        if (replyTo) {
          // Buscar a mensagem original na lista de mensagens atual
          const originalMessage = messages.find((m) => m.messageId === replyTo || m.id === replyTo)
          if (originalMessage) {
            replyMessageId = originalMessage.id
            replyText = originalMessage.contentText || null
          }
        }

        // Criar mensagem otimista apenas para mensagens de texto (mídia será adicionada quando o upload terminar)
        // Para mídia, a mensagem otimista será criada após o upload ou quando chegar via WebSocket
        if (contentType === 'TEXT' || !file) {
          const optimisticId = crypto.randomUUID()
          const optimisticMessage: Message = {
            id: optimisticId,
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
            reply: !!replyTo,
            replyMessageId: replyMessageId,
            replyText: replyText,
          }

          setMessages((prev) => [...prev, optimisticMessage])
        }

        await messagesAPI.send({
          conversationId: selectedConversation.id,
          senderType: 'USER',
          contentType,
          contentText,
          contentUrl,
          replyTo: replyTo,
          action: action,
        })
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erro ao enviar mensagem')
      }
    },
    [selectedConversation, messages]
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

