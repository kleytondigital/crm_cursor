'use client'

import { useState, useEffect } from 'react'
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
import { usersAPI, departmentsAPI, attendancesAPI } from '@/lib/api'
import { Loader2 } from 'lucide-react'

interface TransferAttendanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attendanceId: string | null
  onSuccess: () => void
}

export default function TransferAttendanceDialog({
  open,
  onOpenChange,
  attendanceId,
  onSuccess,
}: TransferAttendanceDialogProps) {
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [transferring, setTransferring] = useState(false)
  const [targetType, setTargetType] = useState<'user' | 'department'>('user')
  const [targetUserId, setTargetUserId] = useState<string>('')
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && attendanceId) {
      loadData()
    }
  }, [open, attendanceId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [usersResponse, departmentsResponse] = await Promise.all([
        usersAPI.getAll(),
        departmentsAPI.list(),
      ])
      
      // Extrair dados dos usuários
      const usersData = usersResponse?.data || usersResponse || []
      const usersArray = Array.isArray(usersData) ? usersData : []
      setUsers(usersArray)
      
      // Extrair dados dos departamentos
      const departmentsData = departmentsResponse?.data || departmentsResponse || []
      const departmentsArray = Array.isArray(departmentsData) ? departmentsData : []
      setDepartments(departmentsArray)
      
      // Log para debug
      if (departmentsArray.length === 0) {
        console.warn('[TransferAttendanceDialog] Nenhum departamento encontrado', departmentsResponse)
      }
    } catch (err: any) {
      console.error('[TransferAttendanceDialog] Erro ao carregar dados:', err)
      setError(err.response?.data?.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!attendanceId) return

    if (targetType === 'user' && !targetUserId) {
      setError('Selecione um usuário')
      return
    }

    if (targetType === 'department' && !targetDepartmentId) {
      setError('Selecione um departamento')
      return
    }

    try {
      setTransferring(true)
      setError(null)

      await attendancesAPI.transfer(attendanceId, {
        targetUserId: targetType === 'user' ? targetUserId : undefined,
        targetDepartmentId: targetType === 'department' ? targetDepartmentId : undefined,
        notes: notes || undefined,
      })

      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao transferir atendimento')
    } finally {
      setTransferring(false)
    }
  }

  const resetForm = () => {
    setTargetType('user')
    setTargetUserId('')
    setTargetDepartmentId('')
    setNotes('')
    setError(null)
  }

  const handleClose = () => {
    if (!transferring) {
      resetForm()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transferir Atendimento</DialogTitle>
          <DialogDescription>
            Transfira este atendimento para outro usuário ou departamento.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Tipo de Transferência</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetType('user')
                  setTargetDepartmentId('')
                }}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm transition ${
                  targetType === 'user'
                    ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                    : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40'
                }`}
              >
                Para Usuário
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType('department')
                  setTargetUserId('')
                }}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm transition ${
                  targetType === 'department'
                    ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                    : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40'
                }`}
              >
                Para Departamento
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-secondary" />
            </div>
          ) : (
            <>
              {targetType === 'user' ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="targetUser">Usuário</Label>
                  <select
                    id="targetUser"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                  >
                    <option value="">Selecione um usuário</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="targetDepartment">Departamento</Label>
                  {departments.length === 0 ? (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
                      Nenhum departamento disponível. Entre em contato com o administrador.
                    </div>
                  ) : (
                    <select
                      id="targetDepartment"
                      value={targetDepartmentId}
                      onChange={(e) => setTargetDepartmentId(e.target.value)}
                      className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                    >
                      <option value="">Selecione um departamento</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicione observações sobre a transferência..."
                  rows={3}
                  className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={transferring}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={transferring || loading || (targetType === 'user' && !targetUserId) || (targetType === 'department' && !targetDepartmentId)}
            className="gap-2"
          >
            {transferring && <Loader2 className="h-4 w-4 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




