'use client'

import { useState } from 'react'
import { Instagram, Facebook, Loader2 } from 'lucide-react'
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

interface ConnectSocialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function ConnectSocialDialog({
  open,
  onOpenChange,
  onSuccess,
}: ConnectSocialDialogProps) {
  const [provider, setProvider] = useState<'INSTAGRAM' | 'FACEBOOK' | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!provider || !name.trim()) {
      setError('Selecione um provedor e informe um nome')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Iniciar OAuth
      const response = await connectionsAPI.startSocialOAuth(provider)
      
      if (response.authUrl) {
        // Redirecionar para OAuth
        window.location.href = response.authUrl
      } else {
        throw new Error('URL de autenticação não retornada')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar conexão')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setProvider(null)
      setName('')
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Conectar Rede Social</DialogTitle>
          <DialogDescription>
            Conecte sua conta do Instagram ou Facebook para receber e enviar mensagens pelo CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Provedor</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('INSTAGRAM')}
                disabled={loading}
                className={`flex items-center gap-2 rounded-lg border p-4 transition ${
                  provider === 'INSTAGRAM'
                    ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                    : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40'
                }`}
              >
                <Instagram className="h-5 w-5" />
                <span className="font-medium">Instagram</span>
              </button>
              <button
                type="button"
                onClick={() => setProvider('FACEBOOK')}
                disabled={loading}
                className={`flex items-center gap-2 rounded-lg border p-4 transition ${
                  provider === 'FACEBOOK'
                    ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                    : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40'
                }`}
              >
                <Facebook className="h-5 w-5" />
                <span className="font-medium">Facebook</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome da Conexão</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Instagram Principal"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConnect} disabled={loading || !provider || !name.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Conectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

