'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/pwa'
import { requestNotificationPermission } from '@/lib/pushNotifications'

export default function PWASetup() {
  useEffect(() => {
    // Registrar Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      registerServiceWorker().catch((error) => {
        console.error('[PWA Setup] Erro ao registrar Service Worker:', error)
      })
    }

    // Solicitar permissão de notificações após um delay
    // (dar tempo para o usuário entender o app primeiro)
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          // Não solicitar automaticamente, apenas quando necessário
          // requestNotificationPermission()
        }
      }
    }, 5000) // 5 segundos após carregar

    return () => {
      clearTimeout(timer)
    }
  }, [])

  return null // Este componente não renderiza nada
}

