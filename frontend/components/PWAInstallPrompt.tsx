'use client'

import { useEffect, useState } from 'react'
import { installPWA, canInstallPWA, BeforeInstallPromptEvent } from '@/lib/pwa'
import { Download, X, Smartphone } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Verificar se já está instalado
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true ||
                       document.referrer.includes('android-app://')
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                     (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)

    setIsStandalone(standalone)
    setIsIOS(isIOSDevice && isSafari)

    if (standalone) {
      console.log('[PWA Install] App já está instalado')
      return // Já está instalado
    }

    // Para iOS, mostrar instruções de instalação
    if (isIOSDevice && isSafari) {
      const dismissed = localStorage.getItem('pwa-install-dismissed-ios')
      if (!dismissed) {
        // Aguardar um pouco antes de mostrar
        const timer = setTimeout(() => {
          setShowBanner(true)
        }, 3000)
        return () => clearTimeout(timer)
      }
      return
    }

    // Para Android/Chrome, usar beforeinstallprompt
    const checkInstallPrompt = async () => {
      const prompt = await canInstallPWA()
      if (prompt) {
        setDeferredPrompt(prompt)
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (!dismissed) {
          setTimeout(() => setShowBanner(true), 3000)
        }
      }
    }

    // Verificar imediatamente
    checkInstallPrompt()

    // Listener para evento beforeinstallprompt (Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) {
        // Mostrar após 3 segundos
        setTimeout(() => setShowBanner(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (isIOS) {
      // iOS - apenas mostrar instruções
      return
    }

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
    if (isIOS) {
      localStorage.setItem('pwa-install-dismissed-ios', 'true')
      setTimeout(() => {
        localStorage.removeItem('pwa-install-dismissed-ios')
      }, 7 * 24 * 60 * 60 * 1000) // 7 dias
    } else {
      localStorage.setItem('pwa-install-dismissed', 'true')
      setTimeout(() => {
        localStorage.removeItem('pwa-install-dismissed')
      }, 7 * 24 * 60 * 60 * 1000) // 7 dias
    }
  }

  if (!showBanner || isStandalone) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-safe md:hidden">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-background-subtle/95 backdrop-blur-xl p-4 shadow-glow">
        {isIOS ? (
          // Instruções para iOS
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-secondary/20">
                <Smartphone className="h-5 w-5 text-brand-secondary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">Instalar B2X CRM</h3>
              <p className="mt-1 text-xs text-text-muted">
                Toque no botão <span className="font-semibold text-white">Compartilhar</span> e depois{' '}
                <span className="font-semibold text-white">Adicionar à Tela de Início</span>
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleDismiss}
                  className="flex-1 rounded-lg bg-brand-secondary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-secondary/90"
                >
                  Entendi
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
        ) : (
          // Prompt para Android/Chrome
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
        )}
      </div>
    </div>
  )
}

