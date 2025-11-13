'use client'

import { useState, useEffect } from 'react'
import { companiesAPI } from '@/lib/api'
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
  Building2,
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

interface Company {
  id: string
  name: string
  slug: string
  email?: string | null
  phone?: string | null
  document?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
  }
  users?: Array<{
    id: string
    email: string
    name: string
    role: string
    isActive: boolean
    createdAt: string
  }>
}

export default function CompaniesManager() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    document: '',
    isActive: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await companiesAPI.getAll()
      setCompanies(Array.isArray(data) ? data : data?.data || [])
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar empresas')
      console.error('Erro ao carregar empresas:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company)
      setFormData({
        name: company.name,
        slug: company.slug,
        email: company.email || '',
        phone: company.phone || '',
        document: company.document || '',
        isActive: company.isActive,
      })
    } else {
      setEditingCompany(null)
      setFormData({
        name: '',
        slug: '',
        email: '',
        phone: '',
        document: '',
        isActive: true,
      })
    }
    setError(null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingCompany(null)
    setFormData({
      name: '',
      slug: '',
      email: '',
      phone: '',
      document: '',
      isActive: true,
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)

      if (editingCompany) {
        // Para empresa Sistema, não enviar name, slug e isActive
        if (editingCompany.slug === 'sistema') {
          const payload: any = {}
          if (formData.email !== undefined) payload.email = formData.email || undefined
          if (formData.phone !== undefined) payload.phone = formData.phone || undefined
          if (formData.document !== undefined) payload.document = formData.document || undefined
          await companiesAPI.update(editingCompany.id, payload)
        } else {
          // Para outras empresas, permitir atualizar todos os campos
          const payload = {
            name: formData.name,
            slug: formData.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            email: formData.email || undefined,
            phone: formData.phone || undefined,
            document: formData.document || undefined,
            isActive: formData.isActive,
          }
          await companiesAPI.update(editingCompany.id, payload)
        }
      } else {
        // Ao criar nova empresa, sempre incluir name, slug e isActive
        const payload = {
          name: formData.name,
          slug: formData.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          document: formData.document || undefined,
          isActive: formData.isActive,
        }
        await companiesAPI.create(payload)
      }

      await loadCompanies()
      handleCloseDialog()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar empresa')
      console.error('Erro ao salvar empresa:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const company = companies.find((c) => c.id === id)
    
    // Proteção adicional no frontend - empresa Sistema não pode ser excluída
    if (company?.slug === 'sistema') {
      setError('A empresa Sistema não pode ser excluída ou desativada')
      return
    }

    if (!confirm('Tem certeza que deseja desativar esta empresa?')) {
      return
    }

    try {
      await companiesAPI.remove(id)
      await loadCompanies()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao desativar empresa')
      console.error('Erro ao desativar empresa:', err)
    }
  }

  const filteredCompanies = companies.filter((company) => {
    const search = searchTerm.toLowerCase()
    return (
      company.name.toLowerCase().includes(search) ||
      company.slug.toLowerCase().includes(search) ||
      company.email?.toLowerCase().includes(search) ||
      company.phone?.includes(search) ||
      company.document?.includes(search)
    )
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Empresas</h2>
          <p className="text-sm text-text-muted">Gerencie as empresas cadastradas no sistema</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          type="text"
          placeholder="Buscar empresas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-background-muted/80 py-2 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
        />
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
      ) : filteredCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background-subtle/40 p-12">
          <Building2 className="h-12 w-12 text-text-muted/60" />
          <p className="mt-4 text-sm text-text-muted">
            {searchTerm ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="rounded-2xl border border-white/5 bg-background-muted/60 p-4 shadow-inner-glow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-secondary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{company.name}</h3>
                      {company.slug === 'sistema' && (
                        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300">
                          Sistema
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{company.slug}</p>
                  </div>
                </div>
                {company.isActive ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-text-muted" />
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {company.email && (
                  <div>
                    <span className="text-text-muted">Email: </span>
                    <span className="text-white">{company.email}</span>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <span className="text-text-muted">Telefone: </span>
                    <span className="text-white">{company.phone}</span>
                  </div>
                )}
                {company.document && (
                  <div>
                    <span className="text-text-muted">Documento: </span>
                    <span className="text-white">{company.document}</span>
                  </div>
                )}
                <div>
                  <span className="text-text-muted">Criado em: </span>
                  <span className="text-white">
                    {format(new Date(company.createdAt), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
                {company._count && (
                  <div>
                    <span className="text-text-muted">Usuários: </span>
                    <span className="text-white">{company._count.users}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenDialog(company)}
                  className="flex-1 gap-2"
                  disabled={company.slug === 'sistema'}
                  title={company.slug === 'sistema' ? 'A empresa Sistema não pode ser editada' : 'Editar empresa'}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(company.id)}
                  className="gap-2"
                  disabled={!company.isActive || company.slug === 'sistema'}
                  title={company.slug === 'sistema' ? 'A empresa Sistema não pode ser excluída' : 'Excluir empresa'}
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
            <DialogTitle>{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
            <DialogDescription>
              {editingCompany
                ? 'Atualize as informações da empresa'
                : 'Preencha os dados para criar uma nova empresa'}
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
                placeholder="Nome da empresa"
                disabled={editingCompany?.slug === 'sistema'}
              />
              {editingCompany?.slug === 'sistema' && (
                <p className="text-xs text-amber-400">O nome da empresa Sistema não pode ser alterado</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                  })
                }
                required
                placeholder="slug-da-empresa"
                disabled={editingCompany?.slug === 'sistema'}
              />
              <p className="text-xs text-text-muted">Usado para identificação única da empresa</p>
              {editingCompany?.slug === 'sistema' && (
                <p className="text-xs text-amber-400">O slug da empresa Sistema não pode ser alterado</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="empresa@exemplo.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="document">Documento (CNPJ/CPF)</Label>
              <Input
                id="document"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-white/10 bg-background-muted text-brand-secondary focus:ring-brand-secondary"
                disabled={editingCompany?.slug === 'sistema'}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Empresa ativa
              </Label>
              {editingCompany?.slug === 'sistema' && (
                <p className="text-xs text-amber-400">A empresa Sistema sempre permanece ativa</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleCloseDialog} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingCompany ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

