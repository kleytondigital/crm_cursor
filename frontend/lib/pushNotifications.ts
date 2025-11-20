'use client'

/**
 * Solicita permissão para notificações push
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission === 'denied') {
    return 'denied'
  }

  // Solicitar permissão
  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Verifica se notificações são suportadas
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Verifica se há permissão para notificações
 */
export function hasNotificationPermission(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }
  return Notification.permission === 'granted'
}

/**
 * Mostra uma notificação local
 */
export function showNotification(
  title: string,
  options: NotificationOptions = {}
): Notification | null {
  if (!hasNotificationPermission()) {
    console.warn('[Push Notifications] Sem permissão para notificações')
    return null
  }

  const defaultOptions: NotificationOptions = {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    requireInteraction: false,
    ...options,
  }

  try {
    return new Notification(title, defaultOptions)
  } catch (error) {
    console.error('[Push Notifications] Erro ao mostrar notificação:', error)
    return null
  }
}

/**
 * Mostra notificação de nova mensagem
 */
export function showNewMessageNotification(
  leadName: string,
  messageText: string,
  conversationId?: string
): Notification | null {
  const title = `Nova mensagem de ${leadName}`
  const body = messageText.length > 100 
    ? messageText.substring(0, 100) + '...'
    : messageText

  return showNotification(title, {
    body,
    tag: conversationId || 'new-message',
    data: {
      url: conversationId ? `/?leadId=${conversationId}` : '/',
      conversationId,
    },
    requireInteraction: false,
  })
}

/**
 * Fecha notificações por tag
 */
export async function closeNotificationsByTag(tag: string): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const notifications = await registration.getNotifications({ tag })
    notifications.forEach((notification) => notification.close())
  } catch (error) {
    console.error('[Push Notifications] Erro ao fechar notificações:', error)
  }
}

