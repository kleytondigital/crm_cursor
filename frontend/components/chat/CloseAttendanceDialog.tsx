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
import { Label } from '@/components/ui/label'
import { attendancesAPI } from '@/lib/api'
import { Loader2 } from 'lucide-react'

interface CloseAttendanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendanceId: string | null
  onSuccess: () => void
}

export default function CloseAttendanceDialog({
  open,
  onOpenChange,
  attendanceId,
  onSuccess,
}: CloseAttendanceDialogProps) {
  const [notes, setNotes] = useState('')
  const [closing, setClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = async () => {
    if (!attendanceId) return

    try {
      setClosing(true)
      setError(null)

      await attendancesAPI.close(attendanceId, {
        notes: notes || undefined,
      })

      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao encerrar atendimento')
    } finally {
      setClosing(false)
    }
  }

  const resetForm = () => {
    setNotes('')
    setError(null)
  }

  const handleDialogClose = () => {
    if (!closing) {
      resetForm()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Encerrar Atendimento</DialogTitle>
          <DialogDescription>
            Confirme o encerramento deste atendimento. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="closeNotes">Observações (opcional)</Label>
            <textarea
              id="closeNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o encerramento..."
              rows={3}
              className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleDialogClose}
            disabled={closing}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleClose}
            disabled={closing}
            className="gap-2"
          >
            {closing && <Loader2 className="h-4 w-4 animate-spin" />}
            Encerrar Atendimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




