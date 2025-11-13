'use client'

import { useState, useEffect } from 'react'
import { usersAPI, companiesAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Building2,
} from 'lucide-react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER' | 'MANAGER' | 'SUPER_ADMIN'
  isActive: boolean
  companyId: string
  company?: {
    id: string
    name: string
    slug: string
  }
  createdAt: string
  updatedAt: string
}

interface Company {
  id: string
  name: string
  slug: string
}

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER' | 'MANAGER' | 'SUPER_ADMIN',
    companyId: '',
    isActive: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCompanies()
    loadUsers()
  }, [])

  const loadCompanies = async () => {
    try {
      const data = await companiesAPI.getAll()
      const companiesList = Array.isArray(data) ? data : data?.data || []
      setCompanies(companiesList)
      if (companiesList.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(companiesList[0].id)
        setFormData((prev) => ({ ...prev, companyId: companiesList[0].id }))
      }
    } catch (err: any) {
      console.error('Erro ao carregar empresas:', err)
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await usersAPI.getAll()
      setUsers(Array.isArray(data) ? data : data?.data || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar usuários')
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        companyId: user.companyId,
        isActive: user.isActive,
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'USER',
        companyId: selectedCompanyId || companies[0]?.id || '',
        isActive: true,
      })
    }
    setError(null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'USER',
      companyId: selectedCompanyId || companies[0]?.id || '',
      isActive: true,
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)

      if (editingUser) {
        const payload: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive,
        }
        
        // Para SUPER_ADMIN, garantir que está na empresa Sistema
        if (formData.role === 'SUPER_ADMIN') {
          const systemCompany = companies.find((c) => c.slug === 'sistema')
          if (systemCompany) {
            payload.companyId = systemCompany.id
          }
        } else {
          payload.companyId = formData.companyId
        }
        
        if (formData.password) {
          payload.password = formData.password
        }
        await usersAPI.update(editingUser.id, payload)
      } else {
        if (!formData.password) {
          setError('A senha é obrigatória para novos usuários')
          return
        }
        
        // Para SUPER_ADMIN, usar empresa Sistema automaticamente
        let companyId = formData.companyId
        if (formData.role === 'SUPER_ADMIN') {
          const systemCompany = companies.find((c) => c.slug === 'sistema')
          if (!systemCompany) {
            setError('Empresa Sistema não encontrada. Execute o seed do banco de dados.')
            return
          }
          companyId = systemCompany.id
        }
        
        if (!companyId) {
          setError('Selecione uma empresa')
          return
        }
        
        await usersAPI.create({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          companyId: companyId,
        })
      }

      await loadUsers()
      handleCloseDialog()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar usuário')
      console.error('Erro ao salvar usuário:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este usuário?')) {
      return
    }

    try {
      await usersAPI.remove(id)
      await loadUsers()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao desativar usuário')
      console.error('Erro ao desativar usuário:', err)
    }
  }

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.company?.name.toLowerCase().includes(search) ||
      user.role.toLowerCase().includes(search)
    const matchesCompany = !selectedCompanyId || user.companyId === selectedCompanyId
    return matchesSearch && matchesCompany
  })

  const roleLabels = {
    ADMIN: 'Administrador',
    MANAGER: 'Gerente',
    USER: 'Usuário',
  }

  const roleColors = {
    ADMIN: 'text-rose-300 bg-rose-500/10',
    MANAGER: 'text-blue-300 bg-blue-500/10',
    USER: 'text-text-muted bg-white/5',
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Usuários</h2>
          <p className="text-sm text-text-muted">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2" disabled={companies.length === 0}>
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            type="text"
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-background-muted/80 py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
          />
        </div>
        <select
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          className="rounded-full border border-white/10 bg-background-muted/80 px-4 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
        >
          <option value="">Todas as empresas</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-secondary" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background-subtle/40 p-12">
          <Users className="h-12 w-12 text-text-muted/60" />
          <p className="mt-4 text-sm text-text-muted">
            {searchTerm || selectedCompanyId ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-2xl border border-white/5 bg-background-muted/60 p-4 shadow-inner-glow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-secondary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{user.name}</h3>
                    <p className="text-xs text-text-muted">{user.email}</p>
                  </div>
                </div>
                {user.isActive ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-text-muted" />
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs ${roleColors[user.role]}`}>
                    {roleLabels[user.role]}
                  </span>
                </div>
                {user.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-text-muted" />
                    <span className="text-text-muted">{user.company.name}</span>
                  </div>
                )}
                <div>
                  <span className="text-text-muted">Criado em: </span>
                  <span className="text-white">
                    {format(new Date(user.createdAt), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenDialog(user)}
                  className="flex-1 gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(user.id)}
                  className="gap-2"
                  disabled={!user.isActive}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Atualize as informações do usuário'
                : 'Preencha os dados para criar um novo usuário'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Nome completo"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="usuario@exemplo.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">
                Senha {editingUser ? '(deixe em branco para manter)' : '*'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="role">Perfil *</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'USER' | 'MANAGER' | 'SUPER_ADMIN' })
                }
                required
                className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              >
                <option value="USER">Usuário</option>
                <option value="MANAGER">Gerente</option>
                <option value="ADMIN">Administrador</option>
                <option value="SUPER_ADMIN">Super Administrador</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="companyId">Empresa *</Label>
              <select
                id="companyId"
                value={formData.companyId}
                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                required={formData.role !== 'SUPER_ADMIN'}
                disabled={formData.role === 'SUPER_ADMIN'}
                className="rounded-lg border border-white/10 bg-background-muted/50 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {formData.role === 'SUPER_ADMIN' && (
                <p className="text-xs text-amber-400">
                  Super Administradores são automaticamente vinculados à empresa Sistema
                </p>
              )}
            </div>

            {editingUser && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-white/10 bg-background-muted text-brand-secondary focus:ring-brand-secondary"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Usuário ativo
                </Label>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleCloseDialog} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingUser ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

