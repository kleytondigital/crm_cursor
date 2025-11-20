'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ChatLayout from '@/components/ChatLayout'
import { ChatProvider, useChat } from '@/contexts/ChatContext'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import BottomNavigation from '@/components/BottomNavigation'

function ChatContent() {
  const searchParams = useSearchParams()
  const { selectConversationByLeadId } = useChat()
  const processedLeadIdRef = useRef<string | null>(null)

  useEffect(() => {
    const leadId = searchParams.get('leadId')
    
    // Só processar se for um leadId diferente do já processado
    if (leadId && processedLeadIdRef.current !== leadId) {
      processedLeadIdRef.current = leadId
      selectConversationByLeadId(leadId).catch((err) => {
        console.error('Erro ao selecionar conversa:', err)
        processedLeadIdRef.current = null
      })
    } else if (!leadId) {
      // Se não há leadId na URL, resetar a referência
      processedLeadIdRef.current = null
    }
  }, [searchParams, selectConversationByLeadId])

  return <ChatLayout />
}

export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const storedToken = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    setToken(storedToken)
    
    if (!storedToken) {
      router.push('/login')
      return
    }
    
    // Super Admin não pode acessar o dashboard normal
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.role === 'SUPER_ADMIN') {
          router.push('/saas')
          return
        }
      } catch (error) {
        console.error('Erro ao verificar role do usuário:', error)
      }
    }
  }, [router])

  if (!mounted || !token) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 md:gap-6 px-3 md:px-6 pb-20 md:pb-8 pt-4 md:pt-6">
        <section className="flex flex-1 flex-col">
          <ChatProvider>
            <Suspense fallback={<div className="flex h-full items-center justify-center">Carregando...</div>}>
              <ChatContent />
            </Suspense>
          </ChatProvider>
        </section>
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  )
}

