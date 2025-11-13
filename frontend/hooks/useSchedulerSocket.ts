'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSchedulerSocketOptions {
  onScheduledSent?: (data: any) => void
  onScheduledUpdated?: (data: any) => void
  onCampaignUpdated?: (data: any) => void
}

export function useSchedulerSocket(options: UseSchedulerSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null)
  const { onScheduledSent, onScheduledUpdated, onCampaignUpdated } = options

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      console.warn('[scheduler] Token não encontrado, não conectando ao WebSocket')
      return
    }

    // Usar NEXT_PUBLIC_WS_URL ao invés de NEXT_PUBLIC_API_URL para WebSocket
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`

    // Se já existe uma conexão ativa, não criar nova
    if (socketRef.current?.connected) {
      console.log('[scheduler] Socket já conectado, reutilizando conexão')
      return
    }

    // Desconectar socket anterior se existir
    if (socketRef.current) {
      console.log('[scheduler] Desconectando socket anterior')
      socketRef.current.disconnect()
      socketRef.current = null
    }

    console.log(`[scheduler] Conectando ao WebSocket: ${wsUrl}/scheduler`)

    const socket = io(`${wsUrl}/scheduler`, {
      auth: {
        token: bearerToken,
      },
      extraHeaders: {
        Authorization: bearerToken,
      },
      transports: ['websocket', 'polling'], // Fallback para polling se websocket falhar
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000, // Timeout de 20 segundos
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[scheduler] ✅ WebSocket conectado com sucesso')
    })

    socket.on('disconnect', (reason) => {
      console.log(`[scheduler] ❌ WebSocket desconectado: ${reason}`)
    })

    socket.on('connect_error', (error) => {
      console.error('[scheduler] ❌ Erro ao conectar ao WebSocket:', error.message)
      // Tentar reconectar automaticamente (já configurado acima)
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log(`[scheduler] ✅ Reconectado após ${attemptNumber} tentativas`)
    })

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[scheduler] 🔄 Tentativa de reconexão ${attemptNumber}`)
    })

    socket.on('reconnect_error', (error) => {
      console.error('[scheduler] ❌ Erro ao reconectar:', error.message)
    })

    socket.on('reconnect_failed', () => {
      console.error('[scheduler] ❌ Falha ao reconectar após todas as tentativas')
    })

    socket.on('scheduled:sent', (data) => {
      console.log('[scheduler] 📤 Mensagem agendada enviada:', data)
      if (onScheduledSent) {
        onScheduledSent(data)
      }
    })

    socket.on('scheduled:updated', (data) => {
      console.log('[scheduler] 📝 Mensagem agendada atualizada:', data)
      if (onScheduledUpdated) {
        onScheduledUpdated(data)
      }
    })

    socket.on('campaign:updated', (data) => {
      console.log('[scheduler] 🎯 Campanha atualizada:', data)
      if (onCampaignUpdated) {
        onCampaignUpdated(data)
      }
    })

    return () => {
      if (socketRef.current) {
        console.log('[scheduler] 🧹 Limpando conexão WebSocket')
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [onScheduledSent, onScheduledUpdated, onCampaignUpdated])

  return socketRef.current
}




