'use client'

import { useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import { AttendancesProvider, useAttendances } from '@/contexts/AttendancesContext'
import AttendanceDashboard from '@/components/attendances/AttendanceDashboard'
import { ToastProvider, useToast } from '@/contexts/ToastContext'

function AttendancesContent() {
  const { syncLeadsWithAttendances } = useAttendances()
  const { addToast } = useToast()
  const hasSyncedRef = useRef(false)

  useEffect(() => {
    // Sincronização automática apenas uma vez ao carregar a página
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true
      syncLeadsWithAttendances()
        .then((result) => {
          if (result.createdAttendances > 0) {
            addToast(
              'success',
              `Sincronização concluída! ${result.createdAttendances} novo(s) atendimento(s) criado(s).`,
              6000
            )
          }
        })
        .catch((err) => {
          // Se for 403 (Forbidden), o usuário não tem permissão, apenas ignora silenciosamente
          if (err?.response?.status === 403) {
            console.log('Sincronização não disponível para este usuário (sem permissão)')
            return
          }
          console.error('Erro na sincronização:', err)
          // Só mostra erro para outros tipos de erro (não 403)
          addToast('error', 'Erro ao sincronizar leads com atendimentos. Tente novamente.', 5000)
        })
    }
  }, [syncLeadsWithAttendances, addToast])

  return <AttendanceDashboard />
}

function AttendancesWithProviders() {
  return (
    <ToastProvider>
      <AttendancesProvider>
        <AttendancesContent />
      </AttendancesProvider>
    </ToastProvider>
  )
}

export default function AttendancesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 pb-10 pt-6">
        <AttendancesWithProviders />
      </main>
      <Footer />
    </div>
  )
}

