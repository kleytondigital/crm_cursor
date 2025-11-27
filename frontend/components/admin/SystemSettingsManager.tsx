'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { systemSettingsAPI } from '@/lib/api'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { CheckCircle2, Loader2, RefreshCw, Shield } from 'lucide-react'

export default function SystemSettingsManager() {
  const { settings, loading, refresh, setSettings } = useSystemSettings()
  const [formData, setFormData] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    setFormData(settings)
  }, [settings])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      // Filtrar apenas campos com valores válidos
      const dataToSend: any = {}
      if (formData.crmName && formData.crmName.trim()) {
        dataToSend.crmName = formData.crmName.trim()
      }
      if (formData.slogan && formData.slogan.trim()) {
        dataToSend.slogan = formData.slogan.trim()
      }
      if (formData.version && formData.version.trim()) {
        dataToSend.version = formData.version.trim()
      }

      const updated = await systemSettingsAPI.update(dataToSend)
      setSettings((prev) => ({ ...prev, ...updated }))
      setSuccessMessage('Configurações salvas e aplicadas em todos os tenants.')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error)
      const errorMsg = error?.response?.data?.message || error?.message || 'Não foi possível salvar as configurações.'
      setErrorMessage(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Branding Global</p>
          <h2 className="text-2xl font-semibold text-white">Configurações do Sistema</h2>
          <p className="text-sm text-text-muted">
            Ajuste nome, slogan e versão exibidos para todos os tenants. Use o nome do CRM para definir o branding
            principal (ex: Darkmode).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => refresh()}
          disabled={loading || saving}
          className="gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Recarregar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-background-muted/40 p-6">
          <div className="space-y-2">
            <Label htmlFor="crmName">Nome do CRM</Label>
            <Input
              id="crmName"
              value={formData.crmName}
              onChange={(event) => setFormData((prev) => ({ ...prev, crmName: event.target.value }))}
              placeholder="Ex: Darkmode CRM"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slogan">Slogan / Tagline</Label>
            <Textarea
              id="slogan"
              value={formData.slogan}
              onChange={(event) => setFormData((prev) => ({ ...prev, slogan: event.target.value }))}
              placeholder="Mensagem exibida logo abaixo do nome"
              maxLength={160}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="version">Versão exibida</Label>
            <Input
              id="version"
              value={formData.version}
              onChange={(event) => setFormData((prev) => ({ ...prev, version: event.target.value }))}
              placeholder="Ex: 1.2.0"
              maxLength={32}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Salvar configurações
          </Button>

          {successMessage && (
            <p className="text-sm font-medium text-emerald-400">{successMessage}</p>
          )}
          {errorMessage && (
            <p className="text-sm font-medium text-rose-400">{errorMessage}</p>
          )}
        </form>

        <div className="rounded-2xl border border-white/10 bg-background-muted/40 p-6">
          <div className="rounded-2xl border border-white/10 bg-background p-6 shadow-inner-glow">
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/15 text-brand-secondary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Preview</p>
                <p className="text-lg font-semibold text-white">{formData.crmName || settings.crmName}</p>
                <p className="text-sm text-text-muted">
                  {formData.slogan || settings.slogan}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-text-muted">
              <p>Essas informações aparecem no topo da navegação, rodapé e manifest do app.</p>
              <p className="mt-2 text-xs text-text-primary/70">Após salvar, os tenants enxergam o novo branding imediatamente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

