'use client'

import { useState, useEffect, useRef } from 'react'
import { MoreVertical, ArrowRightLeft, Flag, Square, XCircle, Loader2 } from 'lucide-react'
import { Conversation, Attendance, Lead, AttendancePriority } from '@/types'
import { attendancesAPI, leadsAPI } from '@/lib/api'
import TransferAttendanceDialog from './TransferAttendanceDialog'
import ChangePriorityDialog from './ChangePriorityDialog'
import ChangeLeadStatusDialog from './ChangeLeadStatusDialog'
import CloseAttendanceDialog from './CloseAttendanceDialog'

interface ChatActionsMenuProps {
  conversation: Conversation
  onRefresh?: () => void
}

export default function ChatActionsMenu({ conversation, onRefresh }: ChatActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false)
  const [leadStatusDialogOpen, setLeadStatusDialogOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversation.leadId) {
      loadData()
    }
  }, [conversation.leadId])

  // Recarregar quando houver atualização de attendance
  useEffect(() => {
    const handleUpdate = () => {
      if (conversation.leadId) {
        loadData()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('attendance:updated', handleUpdate)
      return () => {
        window.removeEventListener('attendance:updated', handleUpdate)
      }
    }
  }, [conversation.leadId])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      
      // Verificar se o clique foi dentro do menu
      if (menuRef.current && menuRef.current.contains(target)) {
        // Verificar se não foi no próprio botão de toggle
        const toggleButton = menuRef.current.querySelector('button')
        if (toggleButton && toggleButton.contains(target)) {
          // Clicou no botão de toggle, não fechar (o toggle já foi feito)
          return
        }
        // Clicou dentro do menu, não fechar
        return
      }
      
      // Clicou fora do menu, fechar
      console.log('[ChatActionsMenu] Clique fora do menu, fechando')
      setMenuOpen(false)
    }

    // Usar setTimeout para evitar que o evento de abertura seja capturado como clique fora
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true)
      document.addEventListener('touchstart', handleClickOutside, true)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
    }
  }, [menuOpen])

  const loadData = async () => {
    try {
      setLoading(true)
      const [attendanceResult, leadResult] = await Promise.allSettled([
        attendancesAPI.getByLeadId(conversation.leadId),
        leadsAPI.getById(conversation.leadId),
      ])

      if (attendanceResult.status === 'fulfilled') {
        const attendanceData = attendanceResult.value
        let attendanceArray: any[] = []
        
        // Processar resposta - pode ser array, objeto único, ou dentro de .data
        if (Array.isArray(attendanceData?.data)) {
          attendanceArray = attendanceData.data
        } else if (attendanceData?.data && !Array.isArray(attendanceData.data)) {
          attendanceArray = [attendanceData.data]
        } else if (Array.isArray(attendanceData)) {
          attendanceArray = attendanceData
        } else if (attendanceData) {
          attendanceArray = [attendanceData]
        }
        
        // Pegar o primeiro attendance ativo (não fechado) ou o primeiro disponível
        const activeAttendance = attendanceArray.find((a: any) => a.status !== 'CLOSED') || attendanceArray[0] || null
        setAttendance(activeAttendance)
      } else {
        console.warn('Erro ao carregar atendimento:', attendanceResult.reason)
        setAttendance(null)
      }

      if (leadResult.status === 'fulfilled') {
        const leadData = leadResult.value
        setLead(leadData?.data || leadData || null)
      } else {
        console.warn('Erro ao carregar lead:', leadResult.reason)
        setLead(null)
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    loadData()
    if (onRefresh) {
      onRefresh()
    }
    // Disparar evento para recarregar conversas e lead
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('attendance:updated'))
      window.dispatchEvent(new CustomEvent('lead:updated'))
    }
  }

  const menuItems = [
    {
      id: 'transfer',
      label: 'Transferir Atendimento',
      icon: ArrowRightLeft,
      onClick: () => {
        setTransferDialogOpen(true)
        setMenuOpen(false)
      },
      disabled: !attendance || attendance.status === 'CLOSED',
    },
    {
      id: 'priority',
      label: 'Alterar Prioridade',
      icon: Flag,
      onClick: () => {
        setPriorityDialogOpen(true)
        setMenuOpen(false)
      },
      disabled: !attendance || attendance.status === 'CLOSED',
    },
    {
      id: 'leadStatus',
      label: 'Alterar Etapa do Lead',
      icon: Square,
      onClick: () => {
        setLeadStatusDialogOpen(true)
        setMenuOpen(false)
      },
      disabled: !lead,
    },
    {
      id: 'close',
      label: 'Encerrar Atendimento',
      icon: XCircle,
      onClick: () => {
        setCloseDialogOpen(true)
        setMenuOpen(false)
      },
      disabled: !attendance || attendance.status === 'CLOSED',
      destructive: true,
    },
  ]

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('[ChatActionsMenu] Toggle menu:', !menuOpen)
            setMenuOpen(!menuOpen)
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-text-muted transition hover:border-brand-secondary/40 hover:text-brand-secondary"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </button>

        {menuOpen && (
          <div 
            className="absolute right-0 top-12 min-w-[200px] rounded-lg border border-white/10 bg-background-subtle/95 shadow-glow backdrop-blur-xl" 
            style={{ 
              zIndex: 9999, 
              position: 'absolute',
              visibility: 'visible',
              opacity: 1,
              display: 'block'
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('[ChatActionsMenu] Click no menu')
            }}
          >
            <div className="flex flex-col p-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    item.onClick()
                  }}
                  disabled={item.disabled}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    item.disabled
                      ? 'cursor-not-allowed opacity-50 text-text-muted'
                      : item.destructive
                      ? 'text-rose-300 hover:bg-rose-500/10 hover:text-rose-200'
                      : 'text-text-primary hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
            </div>
          </div>
        )}
      </div>

      {attendance && (
        <>
          <TransferAttendanceDialog
            open={transferDialogOpen}
            onOpenChange={setTransferDialogOpen}
            attendanceId={attendance.id}
            onSuccess={handleSuccess}
          />

          <ChangePriorityDialog
            open={priorityDialogOpen}
            onOpenChange={setPriorityDialogOpen}
            attendanceId={attendance.id}
            currentPriority={attendance.priority}
            onSuccess={handleSuccess}
          />

          <CloseAttendanceDialog
            open={closeDialogOpen}
            onOpenChange={setCloseDialogOpen}
            attendanceId={attendance.id}
            onSuccess={handleSuccess}
          />
        </>
      )}

      {lead && (
        <ChangeLeadStatusDialog
          open={leadStatusDialogOpen}
          onOpenChange={setLeadStatusDialogOpen}
          leadId={lead.id}
          currentLead={lead}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}

