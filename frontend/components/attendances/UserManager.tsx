'use client'

import { useMemo, useState } from 'react'
import { usersAPI } from '@/lib/api'
import { useAttendances } from '@/contexts/AttendancesContext'
import { UserSummary } from '@/types'
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
import { Loader2, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'

type UserFormMode = 'create' | 'edit'

const defaultUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'USER' as 'ADMIN' | 'USER' | 'MANAGER',
}

export default function UserManager() {
  const { users, refresh } = useAttendances()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<UserFormMode>('create')
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null)
  const [formState, setFormState] = useState(defaultUserForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('user')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [])

  const openCreate = () => {
    setMode('create')
    setSelectedUser(null)
    setFormState(defaultUserForm)
    setError(null)
    setOpen(true)
  }

  const openEdit = (user: UserSummary) => {
    setMode('edit')
    setSelectedUser(user)
    setFormState({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    })
    setError(null)
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!currentUser?.companyId) {
      setError('Não foi possível identificar o tenant do usuário atual.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (mode === 'create') {
        await usersAPI.create({
          name: formState.name,
          email: formState.email,
          password: formState.password,
          role: formState.role,
          companyId: currentUser.companyId,
        })
      } else if (selectedUser) {
        await usersAPI.update(selectedUser.id, {
          name: formState.name,
          email: formState.email,
          password: formState.password || undefined,
          role: formState.role,
        })
      }

      setOpen(false)
      setFormState(defaultUserForm)
      await refresh()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar usuário')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (user: UserSummary) => {
    if (!window.confirm(`Remover o usuário ${user.name}?`)) return
    try {
      setLoading(true)
      await usersAPI.remove(user.id)
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
          <h2 className="text-lg font-semibold text-white">Usuários</h2>
          <p className="text-sm text-text-muted">Gerencie quem tem acesso ao CRM e suas permissões.</p>
        </div>
        <Button
          variant="secondary"
          className="gap-2 rounded-full"
          onClick={openCreate}
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-background-muted/40 p-6 text-sm text-text-muted">
          Nenhum usuário cadastrado ainda. Comece adicionando sua equipe.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-text-primary md:flex-row md:items-center md:justify-between"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">{user.name}</span>
                <span className="text-xs text-text-muted">{user.email}</span>
                <span className="text-xs text-brand-secondary/80">
                  {user.role === 'ADMIN'
                    ? 'Administrador'
                    : user.role === 'MANAGER'
                    ? 'Gestor'
                    : 'Agente'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-wide text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary"
                  onClick={() => openEdit(user)}
                  disabled={loading}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 text-xs uppercase tracking-wide text-rose-200 hover:border-rose-400/60 hover:bg-rose-500/20"
                  onClick={() => handleDelete(user)}
                  disabled={loading}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-md rounded-3xl border border-white/10 bg-background-subtle/95 text-text-primary">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {mode === 'create' ? 'Novo usuário' : 'Editar usuário'}
            </DialogTitle>
            <DialogDescription className="text-sm text-text-muted">
              Informe os dados de acesso para os membros da equipe.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Nome completo</span>
              <Input
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">E-mail</span>
              <Input
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="usuario@empresa.com"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">
                {mode === 'create' ? 'Senha inicial' : 'Nova senha (opcional)'}
              </span>
              <Input
                type="password"
                value={formState.password}
                onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={mode === 'create' ? 'Mínimo 6 caracteres' : 'Deixe em branco para manter'}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Perfil</span>
              <select
                value={formState.role}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, role: event.target.value as 'ADMIN' | 'USER' | 'MANAGER' }))
                }
                className="rounded-2xl border border-white/10 bg-background-muted/80 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              >
                <option value="USER">Agente</option>
                <option value="MANAGER">Gestor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}
            {!currentUser?.companyId && (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                <ShieldAlert className="h-4 w-4" />
                Não foi possível determinar o tenant ativo. Verifique se está logado corretamente.
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full border border-white/10 bg-white/5 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 rounded-full bg-brand-secondary text-background hover:bg-brand-secondary/90"
              disabled={loading || !formState.name || !formState.email || (mode === 'create' && formState.password.length < 6)}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}




