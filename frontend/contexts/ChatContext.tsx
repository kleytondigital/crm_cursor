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
  // Ref para rastrear mensagens já processadas via WebSocket para evitar duplicação
  const processedMessageIdsRef = useRef<Set<string>>(new Set())
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
      console.log('[ChatContext] Nova mensagem recebida via WebSocket (message:new):', data)
      const { message, conversation } = data
      
      // Verificar se esta mensagem já foi processada (evitar duplicação)
      if (processedMessageIdsRef.current.has(message.id)) {
        console.log('[ChatContext] Mensagem já foi processada anteriormente, ignorando:', message.id)
        return
      }
      
      // Usar ref para obter o valor atual de selectedConversation
      const currentSelectedConversation = selectedConversationRef.current
      
      // Sempre adicionar mensagem se for da conversa selecionada
      if (currentSelectedConversation && message.conversationId === currentSelectedConversation.id) {
        console.log('[ChatContext] Adicionando mensagem à conversa selecionada:', message.id, 'Conversa:', currentSelectedConversation.id)
        setMessages((prev) => {
          // Verificar se a mensagem já existe pelo ID interno
          const existsById = prev.some((item) => item.id === message.id)
          if (existsById) {
            console.log('[ChatContext] Mensagem já existe pelo ID (handleNewMessage), ignorando:', message.id)
            // Mensagem já existe, não adicionar novamente
            processedMessageIdsRef.current.add(message.id)
            return prev
          }
          
          // Verificar também pelo messageId se a mensagem já existe com outro ID
          if (message.messageId) {
            const existsByMessageId = prev.some((item) => item.messageId === message.messageId && item.id !== message.id)
            if (existsByMessageId) {
              console.log('[ChatContext] Mensagem já existe pelo messageId (handleNewMessage), substituindo:', message.messageId)
              processedMessageIdsRef.current.add(message.id)
              return prev.map((item) => (item.messageId === message.messageId && item.id !== message.id ? message : item))
            }
          }
          
          // Verificar se há uma mensagem otimista que corresponde a esta mensagem do servidor
          // Para mensagens de texto, verificar pelo contentText e timestamp
          // Para mensagens de mídia, verificar pelo contentUrl e timestamp
          const isTextMessage = message.contentType === 'TEXT' && message.contentText
          const isMediaMessage = message.contentUrl && !isTextMessage
          
          // Buscar mensagem otimista correspondente
          const optimisticIndex = prev.findIndex(
            (item) => {
              // Mensagem otimista não tem messageId (é gerada localmente antes de ser salva no servidor)
              // E não tem o mesmo ID interno (otimista tem UUID gerado localmente)
              const isOptimistic = !item.messageId && 
                                   item.id !== message.id &&
                                   item.conversationId === message.conversationId
              
              if (!isOptimistic) return false
              
              // Para mensagens de texto, comparar contentText exato
              if (isTextMessage && item.contentType === 'TEXT') {
                const textMatch = item.contentText === message.contentText
                const timeMatch = Math.abs(
                  new Date(item.timestamp || item.createdAt).getTime() -
                  new Date(message.timestamp || message.createdAt).getTime()
                ) < 15000 // Dentro de 15 segundos para dar mais margem
                const senderMatch = item.senderType === message.senderType
                
                if (textMatch && timeMatch && senderMatch) {
                  console.log('[ChatContext] Mensagem otimista encontrada (handleNewMessage):', {
                    optimisticId: item.id,
                    realId: message.id,
                    text: message.contentText?.substring(0, 30),
                  })
                }
                
                return textMatch && timeMatch && senderMatch
              }
              
              // Para mensagens de mídia, comparar contentUrl (quando disponível)
              if (isMediaMessage && item.contentUrl) {
                const urlMatch = item.contentUrl === message.contentUrl || 
                                (item.contentText === message.contentText && message.contentText)
                const timeMatch = Math.abs(
                  new Date(item.timestamp || item.createdAt).getTime() -
                  new Date(message.timestamp || message.createdAt).getTime()
                ) < 15000
                
                return urlMatch && timeMatch && item.senderType === message.senderType
              }
              
              return false
            }
          )
          
          if (optimisticIndex !== -1) {
            console.log('[ChatContext] Substituindo mensagem otimista pela mensagem real (handleNewMessage):', {
              optimisticIndex,
              optimisticId: prev[optimisticIndex].id,
              realId: message.id,
            })
            // Substituir a mensagem otimista pela mensagem real do servidor
            const updated = [...prev]
            updated[optimisticIndex] = message
            // Marcar mensagem como processada
            processedMessageIdsRef.current.add(message.id)
            return updated
          }
          
          console.log('[ChatContext] Mensagem adicionada à lista (handleNewMessage):', message.id)
          // Marcar mensagem como processada
          processedMessageIdsRef.current.add(message.id)
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
      console.log('[ChatContext] Mensagem enviada via WebSocket (message:sent):', data)
      if (data.success) {
        // Verificar se esta mensagem já foi processada via message:new (evitar duplicação)
        if (processedMessageIdsRef.current.has(data.message.id)) {
          console.log('[ChatContext] Mensagem já foi processada via message:new, ignorando (handleMessageSent):', data.message.id)
          return
        }
        
        const currentSelectedConversation = selectedConversationRef.current
        
        // Só processar se for da conversa selecionada
        if (!currentSelectedConversation || data.message.conversationId !== currentSelectedConversation.id) {
          console.log('[ChatContext] Mensagem (message:sent) não é da conversa selecionada, ignorando')
          return
        }
        
        setMessages((prev) => {
          // Verificar PRIMEIRO se a mensagem já existe pelo ID interno (pode ter chegado via message:new primeiro)
          // Esta é a verificação mais importante para evitar duplicação
          const existsById = prev.some((item) => item.id === data.message.id)
          if (existsById) {
            console.log('[ChatContext] Mensagem já existe pelo ID (handleMessageSent), ignorando (já processada via message:new):', data.message.id)
            // Mensagem já foi processada via message:new, não adicionar novamente
            processedMessageIdsRef.current.add(data.message.id)
            return prev
          }
          
          // Verificar também pelo messageId se a mensagem já existe com outro ID
          if (data.message.messageId) {
            const existsByMessageId = prev.some((item) => item.messageId === data.message.messageId && item.id !== data.message.id)
            if (existsByMessageId) {
              console.log('[ChatContext] Mensagem já existe pelo messageId (handleMessageSent), substituindo:', data.message.messageId)
              processedMessageIdsRef.current.add(data.message.id)
              return prev.map((item) => (item.messageId === data.message.messageId && item.id !== data.message.id ? data.message : item))
            }
          }
          
          // Verificar se há uma mensagem otimista que corresponde a esta mensagem do servidor
          // Para mensagens de texto, verificar pelo contentText e timestamp
          // Para mensagens de mídia, verificar pelo contentUrl e timestamp
          const isTextMessage = data.message.contentType === 'TEXT' && data.message.contentText
          const isMediaMessage = data.message.contentUrl && !isTextMessage
          
          // Buscar mensagem otimista correspondente
          const optimisticIndex = prev.findIndex(
            (item) => {
              // Mensagem otimista não tem messageId (é gerada localmente antes de ser salva no servidor)
              // E não tem o mesmo ID interno (otimista tem UUID gerado localmente)
              const isOptimistic = !item.messageId && 
                                   item.id !== data.message.id &&
                                   item.conversationId === data.message.conversationId
              
              if (!isOptimistic) return false
              
              // Para mensagens de texto, comparar contentText exato
              if (isTextMessage && item.contentType === 'TEXT') {
                const textMatch = item.contentText === data.message.contentText
                const timeMatch = Math.abs(
                  new Date(item.timestamp || item.createdAt).getTime() -
                  new Date(data.message.timestamp || data.message.createdAt).getTime()
                ) < 15000 // Dentro de 15 segundos para dar mais margem
                const senderMatch = item.senderType === data.message.senderType
                
                if (textMatch && timeMatch && senderMatch) {
                  console.log('[ChatContext] Mensagem otimista encontrada (handleMessageSent):', {
                    optimisticId: item.id,
                    realId: data.message.id,
                    text: data.message.contentText?.substring(0, 30),
                  })
                }
                
                return textMatch && timeMatch && senderMatch
              }
              
              // Para mensagens de mídia, comparar contentUrl (quando disponível)
              if (isMediaMessage && item.contentUrl) {
                const urlMatch = item.contentUrl === data.message.contentUrl || 
                                (item.contentText === data.message.contentText && data.message.contentText)
                const timeMatch = Math.abs(
                  new Date(item.timestamp || item.createdAt).getTime() -
                  new Date(data.message.timestamp || data.message.createdAt).getTime()
                ) < 15000
                
                return urlMatch && timeMatch && item.senderType === data.message.senderType
              }
              
              return false
            }
          )
          
          if (optimisticIndex !== -1) {
            console.log('[ChatContext] Substituindo mensagem otimista pela mensagem real (handleMessageSent):', {
              optimisticIndex,
              optimisticId: prev[optimisticIndex].id,
              realId: data.message.id,
            })
            // Substituir a mensagem otimista pela mensagem real do servidor
            const updated = [...prev]
            updated[optimisticIndex] = data.message
            // Marcar mensagem como processada
            processedMessageIdsRef.current.add(data.message.id)
            return updated
          }
          
          // Se não encontrou correspondência e não existe, adicionar (caso raro - quando message:sent chega antes de message:new)
          console.log('[ChatContext] Mensagem adicionada à lista (handleMessageSent - sem correspondência):', data.message.id)
          // Marcar mensagem como processada
          processedMessageIdsRef.current.add(data.message.id)
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
        let optimisticId: string | null = null
        if (contentType === 'TEXT' || !file) {
          optimisticId = crypto.randomUUID()
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

        // Enviar mensagem via API REST
        // A mensagem será emitida via WebSocket pelo backend quando for processada
        // Não precisamos processar a resposta aqui, pois a mensagem virá via WebSocket
        try {
          await messagesAPI.send({
            conversationId: selectedConversation.id,
            senderType: 'USER',
            contentType,
            contentText,
            contentUrl,
            replyTo: replyTo,
            action: action,
          })
        } catch (err) {
          // Se houver erro, remover mensagem otimista
          if (optimisticId) {
            setMessages((prev) => prev.filter((item) => item.id !== optimisticId))
          }
          throw err
        }
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

