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
import { attendancesAPI } from '@/lib/api'
import { Loader2 } from 'lucide-react'
import { AttendancePriority } from '@/types'

interface ChangePriorityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendanceId: string | null
  currentPriority: AttendancePriority
  onSuccess: () => void
}

const priorityLabels: Record<AttendancePriority, { label: string; color: string; bgColor: string; borderColor: string }> = {
  LOW: { label: 'Baixa', color: 'text-emerald-300', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30' },
  NORMAL: { label: 'Normal', color: 'text-blue-300', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/30' },
  HIGH: { label: 'Alta', color: 'text-rose-300', bgColor: 'bg-rose-500/20', borderColor: 'border-rose-500/30' },
}

export default function ChangePriorityDialog({
  open,
  onOpenChange,
  attendanceId,
  currentPriority,
  onSuccess,
}: ChangePriorityDialogProps) {
  const [selectedPriority, setSelectedPriority] = useState<AttendancePriority>(currentPriority)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdate = async () => {
    if (!attendanceId || selectedPriority === currentPriority) {
      onOpenChange(false)
      return
    }

    try {
      setUpdating(true)
      setError(null)

      await attendancesAPI.updatePriority(attendanceId, selectedPriority)

      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar prioridade')
    } finally {
      setUpdating(false)
    }
  }

  const handleClose = () => {
    if (!updating) {
      setSelectedPriority(currentPriority)
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Alterar Prioridade</DialogTitle>
          <DialogDescription>
            Selecione a nova prioridade para este atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {(['LOW', 'NORMAL', 'HIGH'] as AttendancePriority[]).map((priority) => {
              const meta = priorityLabels[priority]
              const isSelected = selectedPriority === priority

              return (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setSelectedPriority(priority)}
                  disabled={updating}
                  className={`rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? `${meta.borderColor} ${meta.bgColor} ${meta.color}`
                      : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${meta.bgColor} ${meta.borderColor} border`} />
                      <span className={`font-medium ${isSelected ? meta.color : ''}`}>{meta.label}</span>
                    </div>
                    {isSelected && (
                      <span className={`text-sm ${meta.color}`}>Selecionado</span>
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
            disabled={updating || selectedPriority === currentPriority}
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




