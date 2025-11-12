'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, Mail, Shield } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(email, password)
      localStorage.setItem('token', response.access_token)
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user))
        // Super Admin vai para dashboard SaaS, outros para dashboard normal
        if (response.user.role === 'SUPER_ADMIN') {
          router.push('/saas')
          return
        }
      }
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-hero-grid opacity-70" />
      <div className="relative z-10 grid w-full max-w-5xl gap-10 rounded-3xl border border-white/10 bg-background-subtle/80 p-10 shadow-glow backdrop-blur-2xl lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-background-muted/70 px-4 py-2 text-xs uppercase tracking-[0.35em] text-text-muted shadow-inner-glow">
            <Shield className="h-4 w-4 text-brand-secondary" />
            acesso neuronet
          </div>
          <h1 className="text-4xl font-bold text-white">
            Central de Operações B2X
          </h1>
          <p className="text-sm text-text-muted max-w-md">
            Autentique-se para conectar-se ao cockpit de atendimento integrado. Painéis, chat em tempo real e estatísticas avançadas para acelerar a sua operação.
          </p>
          <div className="grid gap-4 text-sm text-text-muted sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-muted">Status da malha</p>
              <p className="mt-1 text-base font-semibold text-white">100% Online</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-text-muted">SLA atual</p>
              <p className="mt-1 text-base font-semibold text-white">3m 42s</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-background-muted/80 p-8 shadow-inner-glow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  placeholder="nome@b2xcrm.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {error && (
              <div className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full justify-center">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando credenciais...
                </>
              ) : (
                'Entrar na plataforma'
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-text-muted">
            Acesso exclusivo para equipes autorizadas. Em caso de dúvidas contate o suporte interno.
          </p>
        </div>
      </div>
    </div>
  )
}

