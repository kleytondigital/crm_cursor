'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { leadsAPI } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { Lead } from '@/types'

interface ChangeLeadStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string | null
  currentStatus: Lead['status']
  onSuccess: () => void
}

const statusLabels: Record<Lead['status'], { label: string; color: string }> = {
  NOVO: { label: 'Novo', color: 'text-blue-300' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', color: 'text-yellow-300' },
  AGUARDANDO: { label: 'Aguardando', color: 'text-orange-300' },
  CONCLUIDO: { label: 'Concluído', color: 'text-green-300' },
}

export default function ChangeLeadStatusDialog({
  open,
  onOpenChange,
  leadId,
  currentStatus,
  onSuccess,
}: ChangeLeadStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<Lead['status']>(currentStatus)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = async () => {
    if (!leadId || selectedStatus === currentStatus) {
      onOpenChange(false)
      return
    }

    try {
      setUpdating(true)
      setError(null)

      await leadsAPI.updateStatus(leadId, selectedStatus)

      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar status do lead')
    } finally {
      setUpdating(false)
    }
  }

  const handleClose = () => {
    if (!updating) {
      setSelectedStatus(currentStatus)
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Alterar Etapa do Lead</DialogTitle>
          <DialogDescription>
            Selecione a nova etapa para este lead no Kanban.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {(['NOVO', 'EM_ATENDIMENTO', 'AGUARDANDO', 'CONCLUIDO'] as Lead['status'][]).map((status) => {
              const meta = statusLabels[status]
              const isSelected = selectedStatus === status

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSelectedStatus(status)}
                  disabled={updating}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                      : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{meta.label}</span>
                    {isSelected && (
                      <span className={`text-sm ${meta.color}`}>Atual</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={updating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updating || selectedStatus === currentStatus}
            className="gap-2"
          >
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
            Atualizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




