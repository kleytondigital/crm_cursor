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
      return
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const socket = io(`${apiUrl}/scheduler`, {
      auth: {
        token: `Bearer ${token}`,
      },
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Conectado ao WebSocket do scheduler')
    })

    socket.on('disconnect', () => {
      console.log('Desconectado do WebSocket do scheduler')
    })

    socket.on('scheduled:sent', (data) => {
      console.log('Mensagem agendada enviada:', data)
      if (onScheduledSent) {
        onScheduledSent(data)
      }
    })

    socket.on('scheduled:updated', (data) => {
      console.log('Mensagem agendada atualizada:', data)
      if (onScheduledUpdated) {
        onScheduledUpdated(data)
      }
    })

    socket.on('campaign:updated', (data) => {
      console.log('Campanha atualizada:', data)
      if (onCampaignUpdated) {
        onCampaignUpdated(data)
      }
    })

    socket.on('connect_error', (error) => {
      console.error('Erro ao conectar ao WebSocket do scheduler:', error)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [onScheduledSent, onScheduledUpdated, onCampaignUpdated])

  return socketRef.current
}




