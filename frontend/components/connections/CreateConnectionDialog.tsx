'use client'

import { useState } from 'react'
import { MessageCircle, Zap, Loader2, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { connectionsAPI } from '@/lib/api'
import Image from 'next/image'

interface CreateConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type ConnectionType = 'WHATSAPP' | 'META_API' | null

type MetaService = 'WHATSAPP_API' | 'INSTAGRAM_DIRECT' | 'FACEBOOK_MESSENGER' | 'META_ADS'

export default function CreateConnectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateConnectionDialogProps) {
  const [connectionType, setConnectionType] = useState<ConnectionType>(null)
  const [name, setName] = useState('')
  const [selectedServices, setSelectedServices] = useState<MetaService[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const metaServices: Array<{ id: MetaService; label: string; description: string }> = [
    {
      id: 'WHATSAPP_API',
      label: 'WhatsApp API Oficial',
      description: 'Envio e recebimento de mensagens via WhatsApp Business API',
    },
    {
      id: 'INSTAGRAM_DIRECT',
      label: 'Instagram Direct',
      description: 'Mensagens diretas do Instagram',
    },
    {
      id: 'FACEBOOK_MESSENGER',
      label: 'Facebook Messenger',
      description: 'Mensagens do Facebook Messenger',
    },
    {
      id: 'META_ADS',
      label: 'Meta Ads',
      description: 'Relatórios e métricas de campanhas de anúncios',
    },
  ]

  const toggleService = (serviceId: MetaService) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    )
  }

  const handleCreate = async () => {
    if (!connectionType || !name.trim()) {
      setError('Selecione um tipo de conexão e informe um nome')
      return
    }

    if (connectionType === 'META_API' && selectedServices.length === 0) {
      setError('Selecione pelo menos um serviço Meta')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (connectionType === 'WHATSAPP') {
        // Criar conexão WhatsApp (WAHA)
        await connectionsAPI.create({ name: name.trim() })
        onSuccess?.()
        handleClose()
      } else {
        // Iniciar OAuth para Meta API com serviços selecionados
        const response = await connectionsAPI.startMetaApiOAuth({
          name: name.trim(),
          services: selectedServices,
        })

        if (response.authUrl) {
          // Redirecionar para OAuth
          window.location.href = response.authUrl
        } else {
          throw new Error('URL de autenticação não retornada')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conexão')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setConnectionType(null)
      setName('')
      setSelectedServices([])
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Conexão</DialogTitle>
          <DialogDescription>
            Escolha o tipo de conexão que deseja criar e configure um nome para identificá-la.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de Conexão</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConnectionType('WHATSAPP')}
                disabled={loading}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition ${
                  connectionType === 'WHATSAPP'
                    ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                    : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40'
                }`}
              >
                <MessageCircle className="h-6 w-6" />
                <span className="font-medium text-sm">WAHA API</span>
              </button>
              <button
                type="button"
                onClick={() => setConnectionType('META_API')}
                disabled={loading}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition ${
                  connectionType === 'META_API'
                    ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                    : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40'
                }`}
              >
                <Zap className="h-6 w-6" />
                <span className="font-medium text-sm">Meta API</span>
              </button>
            </div>
          </div>

          {/* Seleção de Serviços Meta API */}
          {connectionType === 'META_API' && (
            <div className="space-y-2">
              <Label>Serviços Meta</Label>
              <div className="space-y-2">
                {metaServices.map((service) => {
                  const isSelected = selectedServices.includes(service.id)
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      disabled={loading}
                      className={`w-full flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? 'border-brand-secondary bg-brand-secondary/10'
                          : 'border-white/10 bg-background-muted/50 hover:border-brand-secondary/40'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border ${
                          isSelected
                            ? 'border-brand-secondary bg-brand-secondary'
                            : 'border-white/20 bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-white">{service.label}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{service.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conexão</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                connectionType === 'WHATSAPP'
                  ? 'Ex: WhatsApp Principal'
                  : connectionType === 'INSTAGRAM'
                  ? 'Ex: Instagram Principal'
                  : connectionType === 'FACEBOOK'
                  ? 'Ex: Facebook Principal'
                  : 'Ex: Minha Conexão'
              }
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading || !connectionType || !name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {connectionType === 'WHATSAPP' ? 'Criar' : 'Conectar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

