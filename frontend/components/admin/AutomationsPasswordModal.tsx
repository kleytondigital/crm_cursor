'use client'

import { useState } from 'react'
import { companiesAPI } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Lock } from 'lucide-react'

interface AutomationsPasswordModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AutomationsPasswordModal({
  open,
  onClose,
  onSuccess,
}: AutomationsPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      setLoading(true)
      const response = await companiesAPI.verifyAutomationsPassword(password)
      if (response?.valid) {
        setPassword('')
        onSuccess()
        onClose()
      } else {
        setError('Senha incorreta. Verifique com o gestor responsável.')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao validar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-brand-secondary" />
            Desbloquear Automações
          </DialogTitle>
          <DialogDescription>
            Insira a senha fornecida pelo gestor de automação para acessar os recursos avançados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="automation-password">Senha de acesso</Label>
            <Input
              id="automation-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha secreta"
              required
            />
          </div>

          <DialogFooter className="mt-2 flex items-center justify-between gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Desbloquear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


