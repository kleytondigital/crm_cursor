'use client'

import { useMemo, useState } from 'react'
import { useAttendances } from '@/contexts/AttendancesContext'
import { Department, DepartmentUser, UserSummary } from '@/types'
import { departmentsAPI } from '@/lib/api'
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
import { Loader2, Plus, UserMinus, Users } from 'lucide-react'

type DepartmentFormMode = 'create' | 'edit'

const defaultFormState = {
  name: '',
  description: '',
}

export default function DepartmentManager() {
  const { departments, users, refresh } = useAttendances()
  const [formOpen, setFormOpen] = useState(false)
  const [memberModal, setMemberModal] = useState(false)
  const [mode, setMode] = useState<DepartmentFormMode>('create')
  const [loading, setLoading] = useState(false)
  const [formState, setFormState] = useState(defaultFormState)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'AGENT'>('AGENT')
  const [error, setError] = useState<string | null>(null)

  const availableUsers = useMemo(() => {
    if (!selectedDepartment) return users
    const existingIds = new Set(selectedDepartment.users.map((user) => user.id))
    return users.filter((user) => !existingIds.has(user.id))
  }, [selectedDepartment, users])

  const openCreateModal = () => {
    setMode('create')
    setFormState(defaultFormState)
    setSelectedDepartment(null)
    setError(null)
    setFormOpen(true)
  }

  const openEditModal = (department: Department) => {
    setMode('edit')
    setSelectedDepartment(department)
    setFormState({
      name: department.name,
      description: department.description ?? '',
    })
    setError(null)
    setFormOpen(true)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      if (mode === 'create') {
        await departmentsAPI.create(formState)
      } else if (selectedDepartment) {
        await departmentsAPI.update(selectedDepartment.id, formState)
      }
      setFormOpen(false)
      setFormState(defaultFormState)
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar departamento')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (department: Department) => {
    if (!window.confirm(`Deseja remover o departamento ${department.name}?`)) return
    try {
      setLoading(true)
      await departmentsAPI.remove(department.id)
      await refresh()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Não foi possível remover o departamento')
    } finally {
      setLoading(false)
    }
  }

  const openMemberModal = (department: Department) => {
    setSelectedDepartment(department)
    setSelectedUserId('')
    setSelectedRole('AGENT')
    setMemberModal(true)
  }

  const handleAddMember = async () => {
    if (!selectedDepartment || !selectedUserId) return
    try {
      setLoading(true)
      await departmentsAPI.addUser(selectedDepartment.id, {
        userId: selectedUserId,
        role: selectedRole,
      })
      setMemberModal(false)
      await refresh()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao adicionar usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (departmentId: string, user: DepartmentUser) => {
    if (!window.confirm(`Remover ${user.name} do departamento?`)) return
    try {
      setLoading(true)
      await departmentsAPI.removeUser(departmentId, user.id)
      await refresh()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao remover usuário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-background-subtle/60 p-5 shadow-inner-glow">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Departamentos</h2>
          <p className="text-sm text-text-muted">Organize as filas por áreas e distribua equipes.</p>
        </div>
        <Button
          variant="secondary"
          className="gap-2 rounded-full"
          onClick={openCreateModal}
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
          Novo departamento
        </Button>
      </div>

      {departments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-background-muted/40 p-6 text-sm text-text-muted">
          Nenhum departamento cadastrado. Crie o primeiro para organizar os atendimentos.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {departments.map((department) => (
            <div
              key={department.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-text-primary"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-white">{department.name}</p>
                  {department.description && (
                    <p className="text-xs text-text-muted">{department.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-wide text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary"
                    onClick={() => openEditModal(department)}
                    disabled={loading}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full border border-rose-500/30 bg-rose-500/10 text-xs uppercase tracking-wide text-rose-200 hover:border-rose-400/60 hover:bg-rose-500/20"
                    onClick={() => handleDelete(department)}
                    disabled={loading}
                  >
                    Remover
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Membros ({department.users.length})</span>
                  <button
                    onClick={() => openMemberModal(department)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide text-text-muted transition hover:border-brand-secondary/40 hover:text-brand-secondary"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Gerenciar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {department.users.length === 0 ? (
                    <span className="text-xs text-text-muted/80">Sem membros atribuídos.</span>
                  ) : (
                    department.users.map((member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-background-muted/70 px-2 py-1 text-xs text-text-primary"
                      >
                        {member.name}
                        <button
                          onClick={() => handleRemoveMember(department.id, member)}
                          className="rounded-full border border-white/10 p-1 text-text-muted hover:border-rose-400/40 hover:text-rose-300"
                          title="Remover"
                        >
                          <UserMinus className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-full max-w-md rounded-3xl border border-white/10 bg-background-subtle/95 text-text-primary">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {mode === 'create' ? 'Novo departamento' : 'Editar departamento'}
            </DialogTitle>
            <DialogDescription className="text-sm text-text-muted">
              Defina o nome e a descrição para organizar sua operação em equipes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Nome</span>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Ex.: Suporte Nível 1"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Descrição</span>
              <textarea
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={3}
                className="rounded-2xl border border-white/10 bg-background-muted/80 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                placeholder="Contexto ou especialidade deste departamento..."
              />
            </div>
            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setFormOpen(false)}
              className="flex-1 rounded-full border border-white/10 bg-white/5 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 rounded-full bg-brand-secondary text-background hover:bg-brand-secondary/90"
              disabled={loading || !formState.name.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberModal} onOpenChange={setMemberModal}>
        <DialogContent className="w-full max-w-md rounded-3xl border border-white/10 bg-background-subtle/95 text-text-primary">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">Adicionar ao departamento</DialogTitle>
            <DialogDescription className="text-sm text-text-muted">
              Selecione o usuário que fará parte deste time e defina a função.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Usuário</span>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-background-muted/80 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              >
                <option value="">Selecionar</option>
                {availableUsers.length === 0 ? (
                  <option value="" disabled>
                    Todos os usuários já participam
                  </option>
                ) : (
                  availableUsers.map((user) => (
                    <option value={user.id} key={user.id}>
                      {user.name} • {user.email}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Função</span>
              <select
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as 'ADMIN' | 'AGENT')}
                className="rounded-2xl border border-white/10 bg-background-muted/80 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              >
                <option value="AGENT">Agente</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setMemberModal(false)}
              className="flex-1 rounded-full border border-white/10 bg-white/5 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddMember}
              className="flex-1 rounded-full bg-brand-secondary text-background hover:bg-brand-secondary/90"
              disabled={loading || !selectedUserId}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}




