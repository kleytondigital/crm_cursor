import { io, Socket } from 'socket.io-client'
import { Message } from '@/types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000'

let socket: Socket | null = null

export const connectSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket
  }

  // Desconectar socket anterior se existir
  if (socket) {
    socket.disconnect()
  }

  socket = io(`${WS_URL}/messages`, {
    auth: {
      token: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    },
    extraHeaders: {
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    },
    // No Easypanel, pode ser necessário usar polling primeiro
    transports: ['polling', 'websocket'], // Polling primeiro, depois websocket
    upgrade: true, // Permitir upgrade de polling para websocket
    rememberUpgrade: true, // Lembrar upgrade para próximas conexões
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity, // Tentar reconectar indefinidamente
    timeout: 10000, // Timeout de 10 segundos
    forceNew: false, // Reutilizar conexão se possível
    path: '/socket.io/', // Caminho padrão do Socket.IO
    withCredentials: false, // Não enviar credenciais
  })

  socket.on('connect', () => {
    console.log('WebSocket conectado')
  })

  socket.on('disconnect', () => {
    console.log('WebSocket desconectado')
  })

  socket.on('connect_error', (error) => {
    console.error('Erro de conexão WebSocket:', error)
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const getSocket = (): Socket | null => {
  return socket
}

export const joinConversation = (conversationId: string) => {
  if (socket) {
    socket.emit('conversation:join', { conversationId })
  }
}

export const leaveConversation = (conversationId: string) => {
  if (socket) {
    socket.emit('conversation:leave', { conversationId })
  }
}

export const sendMessage = (message: {
  conversationId: string
  senderType: 'USER'
  contentType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'
  contentText?: string
  contentUrl?: string
}) => {
  if (socket) {
    socket.emit('message:send', message)
  }
}

export const onNewMessage = (
  callback: (data: { message: Message; conversation?: any; timestamp?: string }) => void,
) => {
  if (socket) {
    socket.on('message:new', callback)
  }
}

export const offNewMessage = (
  callback: (data: { message: Message; conversation?: any; timestamp?: string }) => void,
) => {
  if (socket) {
    socket.off('message:new', callback)
  }
}

export const onMessageSent = (callback: (data: { success: boolean; message: Message }) => void) => {
  if (socket) {
    socket.on('message:sent', callback)
  }
}

export const offMessageSent = (callback: (data: { success: boolean; message: Message }) => void) => {
  if (socket) {
    socket.off('message:sent', callback)
  }
}

export const onMessageError = (callback: (error: { success: boolean; error: string }) => void) => {
  if (socket) {
    socket.on('message:error', callback)
  }
}

export const offMessageError = (callback: (error: { success: boolean; error: string }) => void) => {
  if (socket) {
    socket.off('message:error', callback)
  }
}

