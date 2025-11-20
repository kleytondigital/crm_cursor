'use client'

import { useState, useEffect } from 'react'

/**
 * Hook para detectar se o dispositivo é mobile
 * Retorna true quando a largura da tela é menor que 768px (breakpoint md do Tailwind)
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Função para verificar se é mobile
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Verificar no mount
    checkIsMobile()

    // Adicionar listener para mudanças de tamanho
    window.addEventListener('resize', checkIsMobile)

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  return isMobile
}

