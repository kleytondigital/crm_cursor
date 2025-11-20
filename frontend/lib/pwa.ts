'use client'

/**
 * Tipo para o evento beforeinstallprompt
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Variável global para armazenar o deferredPrompt
let deferredPromptGlobal: BeforeInstallPromptEvent | null = null

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
  // Se já temos o deferredPrompt armazenado, retornar imediatamente
  if (deferredPromptGlobal) {
    return Promise.resolve(deferredPromptGlobal)
  }

  return new Promise((resolve) => {
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPromptGlobal = e as BeforeInstallPromptEvent
      window.removeEventListener('beforeinstallprompt', handler)
      resolve(deferredPromptGlobal)
    }
    window.addEventListener('beforeinstallprompt', handler)
    
    // Timeout de 2 segundos para evitar espera indefinida
    setTimeout(() => {
      window.removeEventListener('beforeinstallprompt', handler)
      resolve(deferredPromptGlobal || null)
    }, 2000)
  })
}

/**
 * Solicita instalação do PWA
 */
export async function installPWA(): Promise<boolean> {
  try {
    // Tentar usar o deferredPrompt global primeiro
    let deferredPrompt: BeforeInstallPromptEvent | null = deferredPromptGlobal
    
    // Se não houver, tentar obter um novo
    if (!deferredPrompt) {
      deferredPrompt = await canInstallPWA()
    }

    if (!deferredPrompt) {
      console.warn('[PWA] DeferredPrompt não disponível')
      // Para iOS, mostrar instruções
      if (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        alert('Para instalar no iOS:\n1. Toque no botão Compartilhar (ícone de caixa com seta)\n2. Toque em "Adicionar à Tela de Início"')
      }
      return false
    }

    // Mostrar prompt de instalação
    deferredPrompt.prompt()
    
    // Aguardar escolha do usuário
    const { outcome } = await deferredPrompt.userChoice
    
    // Limpar o deferredPrompt após uso
    deferredPromptGlobal = null
    
    if (outcome === 'accepted') {
      console.log('[PWA] Usuário aceitou instalar o PWA')
      return true
    } else {
      console.log('[PWA] Usuário rejeitou instalar o PWA')
      return false
    }
  } catch (error) {
    console.error('[PWA] Erro ao instalar PWA:', error)
    deferredPromptGlobal = null
    return false
  }
}

