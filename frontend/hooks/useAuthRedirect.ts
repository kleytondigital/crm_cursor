'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook para proteger rotas e redirecionar usuários baseado no role
 * @param allowedRoles - Roles permitidos para acessar a rota
 * @param redirectTo - Rota para redirecionar se não tiver permissão (padrão: /login)
 */
export function useAuthRedirect(allowedRoles?: string[], redirectTo?: string) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')

    if (!token) {
      router.push(redirectTo || '/login')
      return
    }

    if (userStr && allowedRoles) {
      try {
        const user = JSON.parse(userStr)
        
        // Super Admin sempre vai para /saas
        if (user.role === 'SUPER_ADMIN') {
          router.push('/saas')
          return
        }

        // Verificar se o role está permitido
        if (!allowedRoles.includes(user.role)) {
          router.push(redirectTo || '/')
          return
        }
      } catch (error) {
        console.error('Erro ao verificar role do usuário:', error)
        router.push(redirectTo || '/login')
      }
    }
  }, [router, allowedRoles, redirectTo])
}




