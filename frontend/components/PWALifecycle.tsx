'use client'

import { useEffect, useState } from 'react'
import { registerServiceWorker } from '@/lib/pwa'

interface PWAUpdateState {
  updateAvailable: boolean
  updateReady: boolean
  installing: boolean
}

export default function PWALifecycle() {
  const [updateState, setUpdateState] = useState<PWAUpdateState>({
    updateAvailable: false,
    updateReady: false,
    installing: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Registrar service worker
    registerServiceWorker()
      .then((registration) => {
        if (!registration) return

        // Detectar atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          setUpdateState((prev) => ({ ...prev, installing: true }))

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Nova versão disponível
                setUpdateState((prev) => ({
                  ...prev,
                  updateAvailable: true,
                  installing: false,
                }))
              }
            }
          })
        })

        // Verificar atualização quando voltar online
        window.addEventListener('online', () => {
          registration.update().catch(() => {
            // Ignorar erros silenciosamente
          })
        })

        // Verificar se já há um service worker esperando
        if (registration.waiting) {
          setUpdateState((prev) => ({ ...prev, updateReady: true }))
        }

        // Escutar mensagens do service worker
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // Service worker foi atualizado, recarregar página
          window.location.reload()
        })
      })
      .catch((error) => {
        console.error('[PWA Lifecycle] Erro ao registrar service worker:', error)
      })
  }, [])

  const handleUpdate = () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting) {
        // Forçar atualização imediata
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        setUpdateState((prev) => ({ ...prev, updateReady: false }))
      }
    })
  }

  // Mostrar banner de atualização disponível
  if (updateState.updateAvailable && !updateState.updateReady) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
        <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 backdrop-blur-xl p-4 shadow-glow">
          <p className="text-sm font-semibold text-white mb-2">
            Nova versão disponível
          </p>
          <p className="text-xs text-text-muted mb-3">
            Uma nova versão do aplicativo está disponível. Recarregue a página para atualizar.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-lg bg-brand-secondary px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-secondary/90"
          >
            Atualizar Agora
          </button>
        </div>
      </div>
    )
  }

  return null
}

