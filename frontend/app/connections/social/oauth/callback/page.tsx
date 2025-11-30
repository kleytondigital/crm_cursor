'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { API_URL } from '@/lib/api'

export default function SocialOAuthCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState<string>('Processando autorização...')

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Se houver erro no OAuth
    if (error) {
      setStatus('error')
      setMessage(errorDescription || 'Erro ao autorizar. Tente novamente.')
      setTimeout(() => {
        router.push('/connections')
      }, 3000)
      return
    }

    // Se não houver código, erro
    if (!code || !state) {
      setStatus('error')
      setMessage('Código de autorização não recebido. Tente novamente.')
      setTimeout(() => {
        router.push('/connections')
      }, 3000)
      return
    }

    // Fazer chamada ao backend para processar o callback
    const processCallback = async () => {
      try {
        const response = await fetch(
          `${API_URL}/connections/social/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        const data = await response.json()

        // Se precisar de segunda autorização
        if (data.requiresSecondAuth) {
          // Redirecionar para segunda autorização
          window.location.href = data.authUrl
          return
        }

        // Se sucesso
        if (data.success) {
          setStatus('success')
          setMessage('Conexão autorizada com sucesso!')
          
          // Redirecionar para página de conexões após 2 segundos
          setTimeout(() => {
            router.push('/connections')
          }, 2000)
        } else {
          throw new Error(data.message || 'Erro ao processar autorização')
        }
      } catch (err: any) {
        console.error('Erro ao processar callback OAuth:', err)
        setStatus('error')
        setMessage(err.message || 'Erro ao processar autorização. Tente novamente.')
        setTimeout(() => {
          router.push('/connections')
        }, 3000)
      }
    }

    processCallback()
  }, [searchParams, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Processando autorização...</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="rounded-full h-12 w-12 bg-green-100 mx-auto mb-4 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Sucesso!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-2">Redirecionando...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Erro</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-2">Redirecionando...</p>
          </>
        )}
      </div>
    </div>
  )
}

