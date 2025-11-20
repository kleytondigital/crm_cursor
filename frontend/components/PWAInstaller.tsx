'use client'

import { useEffect, useState } from 'react'
import { installPWA, canInstallPWA, BeforeInstallPromptEvent } from '@/lib/pwa'
import { Download, X } from 'lucide-react'

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Verificar se já foi instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return // Já está instalado
    }

    // Verificar se pode instalar
    canInstallPWA().then((prompt) => {
      if (prompt) {
        setDeferredPrompt(prompt)
        // Verificar se usuário já rejeitou antes (salvar em localStorage)
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (!dismissed) {
          setShowBanner(true)
        }
      }
    })

    // Listener para atualizar quando evento for disparado
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await installPWA()
        setShowBanner(false)
        localStorage.removeItem('pwa-install-dismissed')
      } catch (error) {
        console.error('Erro ao instalar PWA:', error)
      }
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
    // Reaparecer após 7 dias
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed')
    }, 7 * 24 * 60 * 60 * 1000)
  }

  if (!showBanner || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-safe md:hidden">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-background-subtle/95 backdrop-blur-xl p-4 shadow-glow">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-secondary/20">
              <Download className="h-5 w-5 text-brand-secondary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">Instalar B2X CRM</h3>
            <p className="mt-1 text-xs text-text-muted">
              Instale o app para acesso rápido e notificações
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 rounded-lg bg-brand-secondary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-secondary/90"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-text-muted transition hover:bg-white/10"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

