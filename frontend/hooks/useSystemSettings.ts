'use client'

import { useState, useEffect } from 'react'
import { systemSettingsAPI } from '@/lib/api'

interface SystemSettings {
  crmName: string
  slogan: string
  version: string
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    crmName: 'B2X CRM',
    slogan: 'Soluções em atendimento',
    version: '1.0.0',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await systemSettingsAPI.getPublic()
      setSettings(data)
    } catch (error) {
      console.error('Erro ao carregar configurações do sistema:', error)
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    setLoading(true)
    loadSettings()
  }

  return { settings, loading, refresh, setSettings }
}

