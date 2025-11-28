'use client'

import { useState } from 'react'
import { MessageCircle, Instagram, Facebook, Loader2 } from 'lucide-react'
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

interface CreateConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type ConnectionType = 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | null

export default function CreateConnectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateConnectionDialogProps) {
  const [connectionType, setConnectionType] = useState<ConnectionType>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!connectionType || !name.trim()) {
      setError('Selecione um tipo de conexão e informe um nome')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (connectionType === 'WHATSAPP') {
        // Criar conexão WhatsApp
        await connectionsAPI.create({ name: name.trim() })
        onSuccess?.()
        handleClose()
      } else {
        // Iniciar OAuth para Instagram ou Facebook
        const response = await connectionsAPI.startSocialOAuth(connectionType as 'INSTAGRAM' | 'FACEBOOK')
        
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <span className="font-medium text-sm">WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setConnectionType('INSTAGRAM')}
                disabled={loading}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition ${
                  connectionType === 'INSTAGRAM'
                    ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                    : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40'
                }`}
              >
                <Instagram className="h-6 w-6" />
                <span className="font-medium text-sm">Instagram</span>
              </button>
              <button
                type="button"
                onClick={() => setConnectionType('FACEBOOK')}
                disabled={loading}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition ${
                  connectionType === 'FACEBOOK'
                    ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                    : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40'
                }`}
              >
                <Facebook className="h-6 w-6" />
                <span className="font-medium text-sm">Facebook</span>
              </button>
            </div>
          </div>

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

