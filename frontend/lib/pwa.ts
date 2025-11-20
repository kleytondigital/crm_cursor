'use client'

/**
 * Registra o Service Worker para PWA
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.reject('Service Workers não são suportados')
  }

  return navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      console.log('[PWA] Service Worker registrado com sucesso:', registration.scope)

      // Verificar atualizações periodicamente
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000) // A cada 1 hora

      return registration
    })
    .catch((error) => {
      console.error('[PWA] Erro ao registrar Service Worker:', error)
      throw error
    })
}

/**
 * Verifica se o PWA pode ser instalado
 */
export function canInstallPWA(): Promise<BeforeInstallPromptEvent | null> {
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      e.preventDefault()
      window.removeEventListener('beforeinstallprompt', handler)
      resolve(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    
    // Timeout de 1 segundo para evitar espera indefinida
    setTimeout(() => resolve(null), 1000)
  })
}

/**
 * Solicita instalação do PWA
 */
export async function installPWA(): Promise<boolean> {
  try {
    const deferredPrompt = await canInstallPWA()
    if (!deferredPrompt) {
      return false
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('[PWA] Usuário aceitou instalar o PWA')
      return true
    } else {
      console.log('[PWA] Usuário rejeitou instalar o PWA')
      return false
    }
  } catch (error) {
    console.error('[PWA] Erro ao instalar PWA:', error)
    return false
  }
}

/**
 * Tipo para o evento beforeinstallprompt
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

