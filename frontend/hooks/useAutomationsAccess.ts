'use client'

import { useState, useEffect } from 'react'
import { companiesAPI } from '@/lib/api'
import { AUTOMATIONS_UNLOCKED_KEY } from '@/constants/automations'

export function useAutomationsAccess() {
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Verificar se está desbloqueado via senha
        const unlocked = sessionStorage.getItem(AUTOMATIONS_UNLOCKED_KEY) === 'true'
        if (unlocked) {
          setHasAccess(true)
          setLoading(false)
          return
        }

        // Verificar se a empresa tem acesso habilitado
        const response = await companiesAPI.getAutomationsAccess()
        const enabled = response?.automationsEnabled ?? false
        setHasAccess(enabled)
      } catch (error) {
        console.error('Erro ao verificar acesso às automações:', error)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()

    // Ouvir eventos de desbloqueio
    const handleUnlock = () => {
      setHasAccess(true)
    }

    const handleLock = () => {
      setHasAccess(false)
    }

    window.addEventListener('automations-unlocked', handleUnlock as EventListener)
    window.addEventListener('automations-menu-toggle', handleLock as EventListener)

    return () => {
      window.removeEventListener('automations-unlocked', handleUnlock as EventListener)
      window.removeEventListener('automations-menu-toggle', handleLock as EventListener)
    }
  }, [])

  return { hasAccess, loading }
}

