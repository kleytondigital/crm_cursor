'use client'

import { useMemo, useState, useEffect } from 'react'
import { useAttendances } from '@/contexts/AttendancesContext'
import {
  Attendance,
  AttendanceDetails,
  AttendanceLog,
  AttendancePriority,
  AttendanceStatus,
  Department,
  UserSummary,
} from '@/types'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Loader2,
  MessageSquare,
  Search,
  UserRoundPlus,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import AttendanceMessages from './AttendanceMessages'

const statusLabels: Record<AttendanceStatus, { label: string; color: string }> = {
  OPEN: { label: 'Disponível', color: 'text-brand-secondary' },
  IN_PROGRESS: { label: 'Em andamento', color: 'text-emerald-400' },
  TRANSFERRED: { label: 'Transferido', color: 'text-amber-300' },
  CLOSED: { label: 'Encerrado', color: 'text-text-muted' },
}

const priorityLabels: Record<AttendancePriority, { label: string; color: string; bg: string }> = {
  HIGH: { label: 'Alta', color: 'text-rose-300', bg: 'bg-rose-500/10' },
  NORMAL: { label: 'Normal', color: 'text-brand-secondary', bg: 'bg-brand-secondary/10' },
  LOW: { label: 'Baixa', color: 'text-text-muted', bg: 'bg-white/5' },
}

const formatRelative = (date?: string | null) => {
  if (!date) return 'Sem registro'
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR })
}

const SortIcon = () => <Filter className="h-4 w-4" />

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-white/5 bg-background-subtle/60 p-3 md:p-6 shadow-inner-glow transition hover:border-brand-secondary/40 hover:shadow-glow">
      <div className="flex items-center justify-between">
        <div className="text-brand-secondary scale-75 md:scale-100">{icon}</div>
        <span className="rounded-full bg-white/5 px-2 md:px-3 py-0.5 md:py-1 text-[9px] md:text-xs uppercase tracking-wide text-text-muted">
          {description}
        </span>
      </div>
      <p className="mt-3 md:mt-6 text-[10px] md:text-xs uppercase tracking-[0.35em] text-text-muted">{title}</p>
      <p className="mt-1 md:mt-2 text-xl md:text-3xl font-semibold text-white">{value}</p>
    </div>
  )
}

function AttendancePriorityBadge({ priority }: { priority: AttendancePriority }) {
  const meta = priorityLabels[priority]
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function UrgentBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[11px] uppercase tracking-wide text-rose-200">
      <AlertTriangle className="h-3.5 w-3.5" />
      Urgente
    </span>
  )
}

// Função auxiliar para verificar se há atendente atribuído
function hasAssignedUser(attendance: Attendance, users: UserSummary[] = []) {
  if (attendance.assignedUser) return true
  if (attendance.assignedUserId) {
    // Se há assignedUserId, verificar se existe na lista de usuários
    return users.some(u => u.id === attendance.assignedUserId)
  }
  return false
}

// Função auxiliar para obter nome do atendente
function getAssignedUserName(attendance: Attendance, users: UserSummary[] = []) {
  if (attendance.assignedUser) {
    return attendance.assignedUser.name
  }
  if (attendance.assignedUserId) {
    // Se há assignedUserId mas não assignedUser, buscar na lista de usuários
    const user = users.find(u => u.id === attendance.assignedUserId)
    return user?.name || 'Usuário não encontrado'
  }
  return 'Não atribuído'
}

function SmartQueueItem({ item }: { item: Attendance }) {
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (item.lead.profilePictureURL) {
      setImageError(false)
    }
  }, [item.lead.profilePictureURL, item.id])

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-xs text-text-muted">
      {item.lead.profilePictureURL && !imageError ? (
        <img
          src={item.lead.profilePictureURL}
          alt={item.lead.name}
          className="h-8 w-8 flex-shrink-0 rounded-xl object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary/20 text-xs font-semibold text-brand-secondary">
          {item.lead.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-white">{item.lead.name}</p>
        <p className="text-xs">{formatRelative(item.createdAt)}</p>
      </div>
      <AttendancePriorityBadge priority={item.priority} />
    </div>
  )
}

function AttendanceListItem({
  attendance,
  isActive,
  onSelect,
  users,
}: {
  attendance: Attendance
  isActive: boolean
  onSelect: (attendance: Attendance) => void
  users: UserSummary[]
}) {
  const status = statusLabels[attendance.status]
  const [imageError, setImageError] = useState(false)

  // Resetar erro de imagem quando o profilePictureURL mudar
  useEffect(() => {
    if (attendance.lead.profilePictureURL) {
      setImageError(false)
    }
  }, [attendance.lead.profilePictureURL, attendance.id])

  return (
    <button
      onClick={() => onSelect(attendance)}
      className={`flex w-full gap-3 rounded-2xl border border-white/5 bg-background-muted/60 px-4 py-3 text-left transition hover:border-brand-secondary/40 hover:bg-white/5 ${
        isActive ? 'border-brand-secondary/40 bg-white/10 shadow-glow' : ''
      }`}
    >
      {attendance.lead.profilePictureURL && !imageError ? (
        <img
          src={attendance.lead.profilePictureURL}
          alt={attendance.lead.name}
          className="h-12 w-12 flex-shrink-0 rounded-2xl object-cover"
          onError={() => setImageError(true)}
          key={attendance.lead.profilePictureURL} // Forçar re-render quando URL mudar
        />
      ) : (
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-primary/20 text-lg font-semibold text-brand-secondary">
          {attendance.lead.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{attendance.lead.name}</p>
            <p className="truncate text-xs text-text-muted">{attendance.lead.phone}</p>
          </div>
          <AttendancePriorityBadge priority={attendance.priority} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span className={status.color}>{status.label}</span>
          {hasAssignedUser(attendance, users) ? (
            <span>{getAssignedUserName(attendance, users)}</span>
          ) : (
            <span className="text-brand-secondary/80">Sem atendente</span>
          )}
          {attendance.department && <span>{attendance.department.name}</span>}
          <span>{formatRelative(attendance.lastMessageAt)}</span>
          {attendance.isUrgent && <UrgentBadge />}
        </div>
        {attendance.lastMessage && (
          <p className="line-clamp-2 text-sm text-text-muted/80">{attendance.lastMessage}</p>
        )}
      </div>
    </button>
  )
}

function FiltersBar({
  filters,
  departments,
  users,
  onChange,
  onReset,
  urgent,
  toggleUrgent,
}: {
  filters: AttendanceFilters
  departments: Department[]
  users: UserSummary[]
  urgent: boolean
  toggleUrgent: () => void
  onChange: (partial: Partial<AttendanceFilters>) => void
  onReset: () => void
}) {
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true)
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false)
  const [isStatusPriorityCollapsed, setIsStatusPriorityCollapsed] = useState(true)
  const [isDepartmentUserCollapsed, setIsDepartmentUserCollapsed] = useState(true)
  const [isUrgentCollapsed, setIsUrgentCollapsed] = useState(true)

  // Verificar se há filtros ativos
  const hasActiveFilters = !!(filters.search || filters.status || filters.priority || filters.departmentId || filters.assignedUserId || urgent)
  const hasStatusPriority = !!(filters.status || filters.priority)
  const hasDepartmentUser = !!(filters.departmentId || filters.assignedUserId)

  // Contar quantos filtros estão ativos
  const activeFiltersCount = [
    filters.search,
    filters.status,
    filters.priority,
    filters.departmentId,
    filters.assignedUserId,
    urgent,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col gap-2 md:gap-3 rounded-3xl border border-white/5 bg-background-subtle/70 p-3 md:p-4 shadow-inner-glow">
      {/* Header com colapso geral */}
      <button
        onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
        className="flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          <h3 className="text-xs md:text-sm font-semibold text-white">Filtros</h3>
          {hasActiveFilters && activeFiltersCount > 0 && (
            <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-semibold text-brand-secondary">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onReset()
              }}
              className="h-7 w-7 md:h-8 md:w-8 rounded-full border border-white/10 bg-background-soft/80 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary flex-shrink-0 transition-all"
              title="Limpar filtros"
            >
              <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          )}
          {isFiltersCollapsed ? (
            <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          ) : (
            <ChevronUp className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          )}
        </div>
      </button>

      {/* Conteúdo dos filtros - renderizado apenas quando expandido */}
      {!isFiltersCollapsed && (
        <div className="transition-all duration-200 ease-in-out">

      {/* Seção: Busca */}
      <div className="border-b border-white/5 pb-2 md:pb-3">
        <button
          onClick={() => setIsSearchCollapsed(!isSearchCollapsed)}
          className="flex w-full items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
            <span className="text-xs md:text-sm font-medium text-white">Busca</span>
            {filters.search && (
              <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-semibold text-brand-secondary">
                Ativo
              </span>
            )}
          </div>
          {isSearchCollapsed ? (
            <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          ) : (
            <ChevronUp className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          )}
        </button>
        {!isSearchCollapsed && (
          <div className="mt-2 transition-all duration-200 ease-in-out">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 md:left-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={filters.search ?? ''}
                onChange={(event) => onChange({ search: event.target.value })}
                placeholder="Buscar..."
                className="w-full rounded-full border border-white/10 bg-background-muted/80 py-1.5 md:py-2 pl-8 md:pl-10 pr-3 md:pr-4 text-xs md:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Seção: Status e Prioridade */}
      <div className="border-b border-white/5 pb-2 md:pb-3">
        <button
          onClick={() => setIsStatusPriorityCollapsed(!isStatusPriorityCollapsed)}
          className="flex w-full items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
            <span className="text-xs md:text-sm font-medium text-white">Status e Prioridade</span>
            {hasStatusPriority && (
              <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-semibold text-brand-secondary">
                Ativo
              </span>
            )}
          </div>
          {isStatusPriorityCollapsed ? (
            <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          ) : (
            <ChevronUp className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          )}
        </button>
        {!isStatusPriorityCollapsed && (
          <div className="mt-2 grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2 transition-all duration-200 ease-in-out">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] md:text-xs uppercase tracking-wide text-text-muted">Status</span>
              <div className="relative">
                <SortIcon />
                <select
                  value={filters.status ?? ''}
                  onChange={(event) =>
                    onChange({ status: event.target.value ? (event.target.value as AttendanceStatus) : undefined })
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-background-muted/80 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                >
                  <option value="">Todos</option>
                  <option value="OPEN">Disponível</option>
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="TRANSFERRED">Transferido</option>
                  <option value="CLOSED">Encerrado</option>
                </select>
                <Filter className="pointer-events-none absolute right-2 md:right-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] md:text-xs uppercase tracking-wide text-text-muted">Prioridade</span>
              <div className="relative">
                <select
                  value={filters.priority ?? ''}
                  onChange={(event) =>
                    onChange({
                      priority: event.target.value ? (event.target.value as AttendancePriority) : undefined,
                    })
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-background-muted/80 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                >
                  <option value="">Todas</option>
                  <option value="HIGH">Alta</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Baixa</option>
                </select>
                <Filter className="pointer-events-none absolute right-2 md:right-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção: Departamento e Usuário */}
      <div className="border-b border-white/5 pb-2 md:pb-3">
        <button
          onClick={() => setIsDepartmentUserCollapsed(!isDepartmentUserCollapsed)}
          className="flex w-full items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <UserRoundPlus className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
            <span className="text-xs md:text-sm font-medium text-white">Departamento e Usuário</span>
            {hasDepartmentUser && (
              <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-semibold text-brand-secondary">
                Ativo
              </span>
            )}
          </div>
          {isDepartmentUserCollapsed ? (
            <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          ) : (
            <ChevronUp className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          )}
        </button>
        {!isDepartmentUserCollapsed && (
          <div className="mt-2 grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2 transition-all duration-200 ease-in-out">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] md:text-xs uppercase tracking-wide text-text-muted">Departamento</span>
              <div className="relative">
                <select
                  value={filters.departmentId ?? ''}
                  onChange={(event) =>
                    onChange({ departmentId: event.target.value || undefined })
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-background-muted/80 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                >
                  <option value="">Todos</option>
                  {departments.map((department) => (
                    <option value={department.id} key={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                <Filter className="pointer-events-none absolute right-2 md:right-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] md:text-xs uppercase tracking-wide text-text-muted">Usuário</span>
              <div className="relative">
                <select
                  value={filters.assignedUserId ?? ''}
                  onChange={(event) =>
                    onChange({ assignedUserId: event.target.value || undefined })
                  }
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-background-muted/80 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                >
                  <option value="">Todos</option>
                  {users.map((user) => (
                    <option value={user.id} key={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <Filter className="pointer-events-none absolute right-2 md:right-3 top-1/2 h-3.5 w-3.5 md:h-4 md:w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Seção: Urgente */}
      <div>
        <button
          onClick={() => {
            setIsUrgentCollapsed(!isUrgentCollapsed)
            if (isUrgentCollapsed && !urgent) {
              toggleUrgent()
            }
          }}
          className="flex w-full items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-300 group-hover:text-rose-200 transition-colors" />
            <span className="text-xs md:text-sm font-medium text-white">Somente Urgentes</span>
            {urgent && (
              <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                Ativo
              </span>
            )}
          </div>
          {isUrgentCollapsed ? (
            <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          ) : (
            <ChevronUp className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          )}
        </button>
        {!isUrgentCollapsed && (
          <div className="mt-2 transition-all duration-200 ease-in-out">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-background-muted/80 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-text-primary">
              <div className="flex items-center gap-1.5 md:gap-2">
                <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-rose-300" />
                <span>Somente urgentes</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleUrgent()
                }}
                className={`h-5 w-10 rounded-full border transition flex-shrink-0 ${
                  urgent ? 'border-rose-400 bg-rose-400/40' : 'border-white/10 bg-white/5'
                }`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                    urgent ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  )
}

interface AttendanceFilters {
  status?: AttendanceStatus
  priority?: AttendancePriority
  departmentId?: string
  assignedUserId?: string
  urgent?: boolean
  search?: string
}

function AttendanceDetailsPanel({
  attendance,
  onTransfer,
  onClose,
  onPriority,
  onClaim,
  actionLoading,
  users,
  departments,
}: {
  attendance: AttendanceDetails | null
  onTransfer: () => void
  onClose: () => void
  onPriority: (priority: AttendancePriority) => void
  onClaim: () => void
  actionLoading: boolean
  users: UserSummary[]
  departments: Department[]
}) {
  if (!attendance) {
    return (
      <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-background-subtle/40 text-text-muted">
        <div className="flex flex-col items-center gap-2">
          <MessageSquare className="h-10 w-10 text-text-muted/60" />
          <p>Selecione um atendimento para visualizar os detalhes</p>
        </div>
      </div>
    )
  }

  const statusMeta = statusLabels[attendance.status as AttendanceStatus]
  
  // Funções auxiliares locais para este componente
  const hasAssignedUserLocal = () => {
    if (attendance.assignedUser) return true
    if (attendance.assignedUserId) {
      return users.some(u => u.id === attendance.assignedUserId)
    }
    return false
  }

  const getAssignedUserNameLocal = () => {
    if (attendance.assignedUser) {
      return attendance.assignedUser.name
    }
    if (attendance.assignedUserId) {
      const user = users.find(u => u.id === attendance.assignedUserId)
      return user?.name || 'Usuário não encontrado'
    }
    return 'Não atribuído'
  }

  const [imageError, setImageError] = useState(false)

  // Resetar erro de imagem quando o profilePictureURL mudar
  useEffect(() => {
    if (attendance.lead.profilePictureURL) {
      setImageError(false)
    }
  }, [attendance.lead.profilePictureURL, attendance.id])

  return (
    <div className="flex h-full flex-col gap-4 rounded-3xl border border-white/5 bg-background-subtle/60 p-5 shadow-inner-glow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {attendance.lead.profilePictureURL && !imageError ? (
            <img
              src={attendance.lead.profilePictureURL}
              alt={attendance.lead.name}
              className="h-14 w-14 flex-shrink-0 rounded-2xl object-cover"
              onError={() => setImageError(true)}
              key={attendance.lead.profilePictureURL} // Forçar re-render quando URL mudar
            />
          ) : (
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-primary/20 text-xl font-semibold text-brand-secondary">
              {attendance.lead.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-white">{attendance.lead.name}</h2>
            <p className="text-sm text-text-muted">{attendance.lead.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AttendancePriorityBadge priority={attendance.priority} />
          <span className={`text-xs uppercase tracking-wide ${statusMeta.color}`}>{statusMeta.label}</span>
          {attendance.isUrgent && <UrgentBadge />}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-text-primary sm:grid-cols-2">
        <div>
          <span className="text-xs uppercase tracking-wide text-text-muted">Atendente</span>
          <p className="font-medium text-white">
            {hasAssignedUserLocal() ? getAssignedUserNameLocal() : 'Não atribuído'}
          </p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide text-text-muted">Departamento</span>
          <p className="font-medium text-white">
            {attendance.department ? attendance.department.name : 'Não definido'}
          </p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide text-text-muted">Última mensagem</span>
          <p>{formatRelative(attendance.lastMessageAt)}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wide text-text-muted">Início</span>
          <p>{attendance.startedAt ? formatRelative(attendance.startedAt) : 'Aguardando'}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {attendance.status !== 'CLOSED' && (
          <>
            {attendance.status === 'OPEN' || attendance.status === 'TRANSFERRED' ? (
              <Button onClick={onClaim} disabled={actionLoading} className="gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundPlus className="h-4 w-4" />}
                Assumir
              </Button>
            ) : (
              <Button onClick={onTransfer} variant="secondary" className="gap-2" disabled={actionLoading}>
                <ArrowRightLeft className="h-4 w-4" />
                Transferir
              </Button>
            )}
            {attendance.status === 'IN_PROGRESS' && (
              <Button onClick={onClose} variant="destructive" disabled={actionLoading} className="gap-2">
                <XCircle className="h-4 w-4" />
                Encerrar
              </Button>
            )}
          </>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-text-muted">Prioridade</span>
          <div className="flex gap-1">
            {(['LOW', 'NORMAL', 'HIGH'] as AttendancePriority[]).map((priority) => (
              <button
                key={priority}
                onClick={() => onPriority(priority)}
                disabled={attendance.priority === priority || actionLoading}
                className={`rounded-full px-2 py-1 text-xs uppercase tracking-wide transition ${
                  attendance.priority === priority
                    ? 'bg-brand-secondary/20 text-brand-secondary'
                    : 'border border-white/10 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary'
                }`}
              >
                {priorityLabels[priority].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-background-muted/60 p-4">
        <h3 className="text-sm font-semibold text-white">Conversa</h3>
        {attendance.messages.length === 0 ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-background-subtle/40 p-8">
            <p className="text-sm text-text-muted">Sem mensagens registradas ainda.</p>
          </div>
        ) : (
          <AttendanceMessages messages={attendance.messages} />
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-background-muted/30 p-4">
        <h3 className="text-sm font-semibold text-white">Histórico de ações</h3>
        <div className="flex flex-col gap-2 text-sm text-text-muted">
          {attendance.logs.length === 0 ? (
            <p>Sem registros ainda.</p>
          ) : (
            attendance.logs.map((log: AttendanceLog) => (
              <div key={log.id} className="flex flex-col rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                <span className="text-xs uppercase tracking-wide text-brand-secondary">
                  {log.action === 'CREATED'
                    ? 'Criado'
                    : log.action === 'CLAIMED'
                    ? 'Assumido'
                    : log.action === 'TRANSFERRED'
                    ? 'Transferido'
                    : 'Encerrado'}
                </span>
                <p>
                  {log.performedBy ? `${log.performedBy.name} • ${log.performedBy.email}` : 'Sistema'}
                </p>
                {log.notes && <p className="text-xs text-text-muted/80">{log.notes}</p>}
                <span className="text-xs text-text-muted">{formatRelative(log.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function AttendanceDashboard() {
  const {
    attendances,
    smartQueue,
    stats,
    departments,
    users,
    filters,
    setFilters,
    resetFilters,
    refresh,
    loadingList,
    loadingDetails,
    actionLoading,
    error,
    selectedAttendance,
    selectAttendance,
    claimAttendance,
    transferAttendance,
    closeAttendance,
    updatePriority,
  } = useAttendances()

  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [targetUserId, setTargetUserId] = useState<string>('')
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>('')
  const [prioritySelection, setPrioritySelection] = useState<AttendancePriority | null>(null)
  const [isSmartQueueCollapsed, setIsSmartQueueCollapsed] = useState(true)

  const urgent = filters.urgent ?? false

  const handleSelect = (attendance: Attendance) => {
    selectAttendance(attendance.id)
  }

  const handleClaim = async () => {
    if (!selectedAttendance) return
    try {
      await claimAttendance(selectedAttendance.lead.id)
      // Aguardar um pouco para o backend processar
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Recarregar dados após assumir o atendimento
      // Isso atualiza a lista de atendimentos, conversas e kanban
      if (typeof window !== 'undefined') {
        // Disparar eventos customizados para recarregar conversas e kanban
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('attendance:claimed', { 
            detail: { leadId: selectedAttendance.lead.id } 
          }))
          // Evento para recarregar o Kanban
          window.dispatchEvent(new CustomEvent('kanban:reload'))
        }, 500)
      }
      
      // Recarregar lista de atendimentos e detalhes
      await refresh()
      // Recarregar detalhes do atendimento selecionado para garantir que assignedUser esteja presente
      if (selectedAttendance.id) {
        await selectAttendance(selectedAttendance.id)
      }
    } catch (error) {
      console.error('Erro ao assumir atendimento:', error)
    }
  }

  const handleConfirmTransfer = async () => {
    if (!selectedAttendance) return

    await transferAttendance(selectedAttendance.id, {
      targetUserId: targetUserId || undefined,
      targetDepartmentId: targetDepartmentId || undefined,
      notes: notes || undefined,
      priority: prioritySelection ?? undefined,
    })

    setTransferDialogOpen(false)
    setNotes('')
    setTargetUserId('')
    setTargetDepartmentId('')
    setPrioritySelection(null)
  }

  const handleConfirmClose = async () => {
    if (!selectedAttendance) return
    await closeAttendance(selectedAttendance.id, notes || undefined)
    setCloseDialogOpen(false)
    setNotes('')
  }

  const handlePriorityQuick = async (priority: AttendancePriority) => {
    if (!selectedAttendance) return
    await updatePriority(selectedAttendance.id, priority)
  }

  const topStats = useMemo(
    () => [
      {
        title: 'Abertos',
        value: stats ? stats.total_abertos : '--',
        description: 'Disponíveis + transferidos',
        icon: <AlertCircle className="h-6 w-6" />,
      },
      {
        title: 'Em andamento',
        value: stats ? stats.total_em_andamento : '--',
        description: 'Atendimentos ativos',
        icon: <Clock className="h-6 w-6" />,
      },
      {
        title: 'Encerrados',
        value: stats ? stats.total_encerrados : '--',
        description: 'Hoje e anteriores',
        icon: <Check className="h-6 w-6" />,
      },
      {
        title: 'Tempo médio',
        value: stats ? `${stats.tempo_medio_atendimento} min` : '--',
        description: 'Ciclo completo',
        icon: <MessageSquare className="h-6 w-6" />,
      },
    ],
    [stats],
  )

  return (
    <>
      <section className="grid gap-3 md:gap-4 grid-cols-2 sm:grid-cols-2 xl:grid-cols-4">
        {topStats.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
          />
        ))}
      </section>

      <section className="flex flex-col gap-4 md:gap-5 lg:flex-row lg:grid lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-3 md:gap-4 w-full lg:w-auto">
          <FiltersBar
            filters={filters}
            departments={departments}
            users={users}
            urgent={urgent}
            onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
            onReset={resetFilters}
            toggleUrgent={() =>
              setFilters((prev) => ({
                ...prev,
                urgent: !(prev.urgent ?? false),
              }))
            }
          />

          <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-3 md:p-4 shadow-inner-glow">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsSmartQueueCollapsed(!isSmartQueueCollapsed)}
                className="flex items-center gap-2 flex-1 text-left group"
              >
                <h3 className="text-xs md:text-sm font-semibold text-white">Fila inteligente</h3>
                {smartQueue.length > 0 && (
                  <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-semibold text-brand-secondary">
                    {smartQueue.length}
                  </span>
                )}
                {isSmartQueueCollapsed ? (
                  <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
                )}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 md:h-8 gap-1 md:gap-2 rounded-full border border-white/10 bg-white/5 text-[10px] md:text-xs uppercase tracking-wide text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary"
                onClick={refresh}
              >
                <span className="hidden sm:inline">Atualizar</span>
                <span className="sm:hidden">↻</span>
              </Button>
            </div>
            {!isSmartQueueCollapsed && (
              <div className="mt-2 md:mt-3 flex flex-col gap-2 max-h-[400px] md:max-h-[600px] overflow-y-auto transition-all duration-200 ease-in-out">
                {smartQueue.length === 0 ? (
                  <p className="text-[10px] md:text-xs text-text-muted">Nenhum atendimento disponível na fila.</p>
                ) : (
                  smartQueue.map((item) => (
                    <SmartQueueItem key={item.id} item={item} />
                  ))
                )}
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-2 rounded-3xl border border-white/5 bg-background-subtle/60 p-3 md:p-4 shadow-inner-glow">
            <div className="flex items-center justify-between">
              <h3 className="text-xs md:text-sm font-semibold text-white">Atendimentos</h3>
              {loadingList && <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin text-brand-secondary" />}
            </div>
            <div className="flex max-h-[400px] md:max-h-[600px] flex-col gap-2 md:gap-3 overflow-y-auto pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              {attendances.length === 0 && !loadingList ? (
                <p className="text-xs md:text-sm text-text-muted">Nenhum atendimento encontrado com os filtros atuais.</p>
              ) : (
                attendances.map((attendance) => (
                  <AttendanceListItem
                    key={attendance.id}
                    attendance={attendance}
                    isActive={selectedAttendance?.id === attendance.id}
                    onSelect={handleSelect}
                    users={users}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="min-h-[400px] md:min-h-[680px] w-full lg:w-auto">
          {loadingDetails && selectedAttendance ? (
            <div className="flex h-full items-center justify-center rounded-3xl border border-white/5 bg-background-subtle/60">
              <Loader2 className="h-8 w-8 animate-spin text-brand-secondary" />
            </div>
          ) : (
            <AttendanceDetailsPanel
              attendance={selectedAttendance}
              onTransfer={() => setTransferDialogOpen(true)}
              onClose={() => setCloseDialogOpen(true)}
              onPriority={handlePriorityQuick}
              onClaim={handleClaim}
              actionLoading={actionLoading}
              users={users}
              departments={departments}
            />
          )}
        </div>
      </section>

      {/* Transfer Modal */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="w-full max-w-lg rounded-3xl border border-white/10 bg-background-subtle/95 text-text-primary">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">Transferir atendimento</DialogTitle>
            <DialogDescription className="text-sm text-text-muted">
              Escolha um atendente ou departamento de destino. Você também pode ajustar a prioridade e adicionar
              observações internas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Transferir para atendente</span>
              <select
                value={targetUserId}
                onChange={(event) => setTargetUserId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-background-muted/80 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              >
                <option value="">Selecionar atendente</option>
                {users.map((user) => (
                  <option value={user.id} key={user.id}>
                    {user.name} • {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Ou departamento</span>
              <select
                value={targetDepartmentId}
                onChange={(event) => setTargetDepartmentId(event.target.value)}
                className="rounded-2xl border border-white/10 bg-background-muted/80 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              >
                <option value="">Selecionar departamento</option>
                {departments.map((department) => (
                  <option value={department.id} key={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Prioridade</span>
              <select
                value={prioritySelection ?? ''}
                onChange={(event) =>
                  setPrioritySelection(event.target.value ? (event.target.value as AttendancePriority) : null)
                }
                className="rounded-2xl border border-white/10 bg-background-muted/80 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              >
                <option value="">Manter atual</option>
                <option value="HIGH">Alta</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Baixa</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-text-muted">Notas internas</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="rounded-2xl border border-white/10 bg-background-muted/80 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                placeholder="Informe contexto adicional para o próximo atendente..."
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setTransferDialogOpen(false)}
              className="flex-1 rounded-full border border-white/10 bg-white/5 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmTransfer}
              className="flex-1 rounded-full bg-brand-secondary text-background hover:bg-brand-secondary/90"
              disabled={actionLoading || (!targetUserId && !targetDepartmentId)}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar transferência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close modal */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="w-full max-w-lg rounded-3xl border border-white/10 bg-background-subtle/95 text-text-primary">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">Encerrar atendimento</DialogTitle>
            <DialogDescription className="text-sm text-text-muted">
              Confirme o encerramento e registre observações relevantes para histórico.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-muted">
              <AlertTriangle className="mb-2 h-4 w-4 text-amber-300" />
              Encerrar o atendimento remove-o da fila ativa. Certifique-se de que não há pendências antes de
              prosseguir.
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="rounded-2xl border border-white/10 bg-background-muted/80 px-3 py-2 text-sm text-text-primary focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
              placeholder="Notas internas (opcional)..."
            />
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              onClick={() => setCloseDialogOpen(false)}
              className="flex-1 rounded-full border border-white/10 bg-white/5 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmClose}
              variant="destructive"
              className="flex-1 rounded-full"
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Encerrar atendimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

