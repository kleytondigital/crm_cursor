'use client'

import { useState, useEffect } from 'react'
import { apiKeysAPI } from '@/lib/api'
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
  Key,
  Plus,
  Trash2,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  AlertTriangle,
  Globe,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

interface ApiKey {
  id: string
  name: string
  key?: string // Apenas retornado na criação
  tenantId: string | null
  isGlobal: boolean
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  warning?: string
}

export default function ApiKeysManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [newApiKey, setNewApiKey] = useState<ApiKey | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    isGlobal: false,
    expiresAt: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'ADMIN' | 'MANAGER' | 'USER' | 'SUPER_ADMIN' | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserRole(user.role || null)
      } catch (error) {
        console.error('Erro ao obter dados do usuário:', error)
      }
    }
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiKeysAPI.list()
      setApiKeys(Array.isArray(data) ? data : data?.data || [])
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar API Keys')
      console.error('Erro ao carregar API Keys:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = () => {
    setFormData({
      name: '',
      isGlobal: false,
      expiresAt: '',
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setFormData({
      name: '',
      isGlobal: false,
      expiresAt: '',
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)

      const payload: any = {
        name: formData.name,
      }

      if (formData.isGlobal && userRole === 'SUPER_ADMIN') {
        payload.isGlobal = true
      }

      if (formData.expiresAt) {
        payload.expiresAt = new Date(formData.expiresAt).toISOString()
      }

      const created = await apiKeysAPI.create(payload)
      setNewApiKey(created)
      await loadApiKeys()
      handleCloseDialog()
      setSuccessDialogOpen(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar API Key')
      console.error('Erro ao criar API Key:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar esta API Key? Ela não poderá ser usada novamente.')) {
      return
    }

    try {
      await apiKeysAPI.revoke(id)
      await loadApiKeys()
    } catch (err: any) {
      setError(err.message || 'Erro ao revogar API Key')
      console.error('Erro ao revogar API Key:', err)
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover definitivamente esta API Key? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      await apiKeysAPI.remove(id)
      await loadApiKeys()
    } catch (err: any) {
      setError(err.message || 'Erro ao remover API Key')
      console.error('Erro ao remover API Key:', err)
    }
  }

  const handleCopyKey = async () => {
    if (newApiKey?.key) {
      try {
        await navigator.clipboard.writeText(newApiKey.key)
        alert('Chave copiada para a área de transferência!')
      } catch (err) {
        console.error('Erro ao copiar chave:', err)
        alert('Erro ao copiar chave. Por favor, copie manualmente.')
      }
    }
  }

  const filteredApiKeys = apiKeys.filter((key) => {
    const search = searchTerm.toLowerCase()
    return (
      key.name.toLowerCase().includes(search) ||
      (key.isGlobal ? 'global' : 'tenant').includes(search) ||
      (key.isActive ? 'ativo' : 'inativo').includes(search)
    )
  })

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">API Keys</h2>
          <p className="text-sm text-text-muted">Gerencie as chaves de API para autenticação externa</p>
        </div>
        <Button onClick={handleOpenDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova API Key
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          type="text"
          placeholder="Buscar API Keys..."
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
      ) : filteredApiKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background-subtle/40 p-12">
          <Key className="h-12 w-12 text-text-muted/60" />
          <p className="mt-4 text-sm text-text-muted">
            {searchTerm ? 'Nenhuma API Key encontrada' : 'Nenhuma API Key cadastrada'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-background-muted/60 shadow-inner-glow">
          <table className="w-full">
            <thead className="border-b border-white/5 bg-background-subtle/40">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Data de Criação</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">Data de Expiração</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredApiKeys.map((key) => (
                <tr key={key.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{key.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    {key.isGlobal ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-300">
                        <Globe className="h-3 w-3" />
                        Global
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-300">
                        Tenant
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isExpired(key.expiresAt) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300">
                        <Clock className="h-3 w-3" />
                        Expirada
                      </span>
                    ) : key.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2 py-1 text-xs font-medium text-gray-300">
                        <XCircle className="h-3 w-3" />
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {format(new Date(key.createdAt), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {key.expiresAt ? (
                      <span className={isExpired(key.expiresAt) ? 'text-red-400' : ''}>
                        {format(new Date(key.expiresAt), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-text-muted/60">Sem expiração</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {key.isActive && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRevoke(key.id)}
                          className="gap-2"
                          title="Revogar API Key"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(key.id)}
                        className="gap-2"
                        title="Remover API Key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog de criação */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova API Key</DialogTitle>
            <DialogDescription>
              Crie uma nova chave de API para autenticação externa (n8n, transcrição, etc)
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
                placeholder="Ex: N8N Integration"
              />
              <p className="text-xs text-text-muted">Nome descritivo para identificar a chave</p>
            </div>

            {userRole === 'SUPER_ADMIN' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isGlobal"
                  checked={formData.isGlobal}
                  onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                  className="h-4 w-4 rounded border-white/10 bg-background-muted text-brand-secondary focus:ring-brand-secondary"
                />
                <Label htmlFor="isGlobal" className="cursor-pointer">
                  Chave Global (acessa todos os tenants)
                </Label>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="expiresAt">Data de Expiração (opcional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
              <p className="text-xs text-text-muted">Deixe em branco para chave sem expiração</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={handleCloseDialog} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de sucesso com chave gerada */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>API Key Criada com Sucesso!</DialogTitle>
            <DialogDescription>
              Guarde esta chave em local seguro. Ela não poderá ser recuperada novamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                <p className="text-sm font-medium text-amber-300">
                  Guarde esta chave em local seguro. Ela não poderá ser recuperada novamente.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Sua API Key:</Label>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-background-muted/80 p-3">
                <code className="flex-1 font-mono text-sm text-white break-all">{newApiKey?.key}</code>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyKey}
                  className="gap-2 shrink-0"
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <div>
                <span className="text-text-muted">Nome: </span>
                <span className="text-white">{newApiKey?.name}</span>
              </div>
              {newApiKey?.isGlobal && (
                <div>
                  <span className="text-text-muted">Tipo: </span>
                  <span className="text-purple-300">Global (acessa todos os tenants)</span>
                </div>
              )}
              {newApiKey?.expiresAt && (
                <div>
                  <span className="text-text-muted">Expira em: </span>
                  <span className="text-white">
                    {format(new Date(newApiKey.expiresAt), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setSuccessDialogOpen(false)} className="gap-2">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

