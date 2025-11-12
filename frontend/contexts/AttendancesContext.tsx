import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Attendance,
  AttendanceDetails,
  AttendancePriority,
  AttendanceStats,
  AttendanceStatus,
  Department,
  UserSummary,
} from '@/types'
import {
  attendancesAPI,
  departmentsAPI,
  usersAPI,
} from '@/lib/api'
import {
  connectAttendanceSocket,
  disconnectAttendanceSocket,
  onAttendanceNew,
  onAttendanceTransferred,
  onAttendanceUpdate,
  offAttendanceNew,
  offAttendanceTransferred,
  offAttendanceUpdate,
} from '@/lib/attendances-socket'

type AttendanceFilters = {
  status?: AttendanceStatus
  priority?: AttendancePriority
  departmentId?: string
  assignedUserId?: string
  urgent?: boolean
  search?: string
}

interface AttendancesContextValue {
  attendances: Attendance[]
  smartQueue: Attendance[]
  stats: AttendanceStats | null
  departments: Department[]
  users: UserSummary[]
  filters: AttendanceFilters
  setFilters: (mutator: (prev: AttendanceFilters) => AttendanceFilters) => void
  resetFilters: () => void
  refresh: () => Promise<void>
  syncLeadsWithAttendances: () => Promise<{ totalLeads: number; existingAttendances: number; createdAttendances: number }>
  loadingList: boolean
  loadingDetails: boolean
  actionLoading: boolean
  error: string | null
  selectedAttendance: AttendanceDetails | null
  selectAttendance: (id: string | null) => Promise<void>
  claimAttendance: (leadId: string, notes?: string) => Promise<void>
  transferAttendance: (
    id: string,
    payload: { targetUserId?: string; targetDepartmentId?: string; notes?: string; priority?: AttendancePriority },
  ) => Promise<void>
  closeAttendance: (id: string, notes?: string) => Promise<void>
  updatePriority: (id: string, priority: AttendancePriority) => Promise<void>
}

const AttendancesContext = createContext<AttendancesContextValue | undefined>(undefined)

const extractData = <T,>(response: any): T => {
  if (!response) return response
  return (response.data ?? response) as T
}

export function AttendancesProvider({ children }: { children: React.ReactNode }) {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [smartQueue, setSmartQueue] = useState<Attendance[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<UserSummary[]>([])
  const [filters, setFiltersState] = useState<AttendanceFilters>({})
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null)
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceDetails | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildQueryParams = useCallback(() => {
    const params: Record<string, string> = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.departmentId) params.departmentId = filters.departmentId
    if (filters.assignedUserId) params.assignedUserId = filters.assignedUserId
    if (filters.urgent !== undefined) params.urgent = String(filters.urgent)
    if (filters.search) params.search = filters.search
    return params
  }, [filters])

  const loadAttendances = useCallback(
    async (showLoading = true) => {
      try {
        setError(null)
        if (showLoading) setLoadingList(true)
        const response = await attendancesAPI.getAll(buildQueryParams())
        const list = extractData<Attendance[]>(response)
        setAttendances(list)
      } catch (err: any) {
        console.error('[attendances] erro ao carregar lista', err)
        setError(err?.response?.data?.message || 'Erro ao carregar atendimentos')
      } finally {
        if (showLoading) setLoadingList(false)
      }
    },
    [buildQueryParams],
  )

  const loadStats = useCallback(async () => {
    try {
      const response = await attendancesAPI.getStats()
      setStats(extractData<AttendanceStats>(response))
    } catch (error) {
      console.error('[attendances] erro ao carregar estatísticas', error)
    }
  }, [])

  const loadSmartQueue = useCallback(async () => {
    try {
      const response = await attendancesAPI.getSmartQueue()
      setSmartQueue(extractData<Attendance[]>(response))
    } catch (error) {
      console.error('[attendances] erro ao carregar fila inteligente', error)
    }
  }, [])

  const loadDepartments = useCallback(async () => {
    try {
      const response = await departmentsAPI.list()
      setDepartments(extractData<Department[]>(response))
    } catch (error) {
      console.error('[attendances] erro ao carregar departamentos', error)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const response = await usersAPI.getAll()
      const payload = extractData<{ success?: boolean; data?: UserSummary[] } | UserSummary[]>(response)
      const data = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as any)?.data)
        ? ((payload as any).data as UserSummary[])
        : []
      setUsers(data)
    } catch (error) {
      console.error('[attendances] erro ao carregar usuários', error)
    }
  }, [])

  const refresh = useCallback(async () => {
    await Promise.all([loadAttendances(), loadStats(), loadSmartQueue(), loadDepartments(), loadUsers()])
    if (selectedAttendanceId) {
      await selectAttendance(selectedAttendanceId)
    }
  }, [loadAttendances, loadStats, loadSmartQueue, loadDepartments, selectedAttendanceId])

  const selectAttendance = useCallback(
    async (id: string | null) => {
      setSelectedAttendanceId(id)
      if (!id) {
        setSelectedAttendance(null)
        return
      }

      try {
        setLoadingDetails(true)
        setError(null)
        const response = await attendancesAPI.getById(id)
        const details = extractData<AttendanceDetails>(response)
        setSelectedAttendance(details)
        setLoadingDetails(false)
      } catch (err: any) {
        setLoadingDetails(false)
        setError(err?.response?.data?.message || 'Erro ao carregar detalhes do atendimento')
      }
    },
    [],
  )

  const handleActionResult = useCallback(
    (attendance: Attendance) => {
      // Atualiza lista local rapidamente sem esperar refetch
      setAttendances((prev) => {
        const index = prev.findIndex((item) => item.id === attendance.id)
        if (index >= 0) {
          const clone = [...prev]
          clone[index] = attendance
          return clone
        }
        return [attendance, ...prev]
      })
      loadStats()
      loadSmartQueue()
      if (selectedAttendanceId === attendance.id) {
        selectAttendance(attendance.id)
      }
    },
    [loadStats, loadSmartQueue, selectAttendance, selectedAttendanceId],
  )

  const claimAttendance = useCallback(
    async (leadId: string, notes?: string) => {
      try {
        setActionLoading(true)
        const response = await attendancesAPI.claim(leadId, notes ? { notes } : undefined)
        const attendance = extractData<Attendance>(response)
        handleActionResult(attendance)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao assumir atendimento')
        throw err
      } finally {
        setActionLoading(false)
      }
    },
    [handleActionResult],
  )

  const transferAttendance = useCallback(
    async (
      id: string,
      payload: { targetUserId?: string; targetDepartmentId?: string; notes?: string; priority?: AttendancePriority },
    ) => {
      try {
        setActionLoading(true)
        const response = await attendancesAPI.transfer(id, payload)
        const attendance = extractData<Attendance>(response)
        handleActionResult(attendance)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao transferir atendimento')
        throw err
      } finally {
        setActionLoading(false)
      }
    },
    [handleActionResult],
  )

  const closeAttendance = useCallback(
    async (id: string, notes?: string) => {
      try {
        setActionLoading(true)
        const response = await attendancesAPI.close(id, notes ? { notes } : undefined)
        const attendance = extractData<Attendance>(response)
        handleActionResult(attendance)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao encerrar atendimento')
        throw err
      } finally {
        setActionLoading(false)
      }
    },
    [handleActionResult],
  )

  const updatePriority = useCallback(
    async (id: string, priority: AttendancePriority) => {
      try {
        setActionLoading(true)
        const response = await attendancesAPI.updatePriority(id, priority)
        const attendance = extractData<Attendance>(response)
        handleActionResult(attendance)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao atualizar prioridade')
        throw err
      } finally {
        setActionLoading(false)
      }
    },
    [handleActionResult],
  )

  const syncLeadsWithAttendances = useCallback(async () => {
    try {
      setActionLoading(true)
      const response = await attendancesAPI.syncLeadsWithAttendances()
      const result = extractData<{ totalLeads: number; existingAttendances: number; createdAttendances: number }>(response)
      
      // Recarregar dados após sincronização
      await refresh()
      
      return result
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao sincronizar leads com atendimentos')
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [refresh])

  useEffect(() => {
    loadAttendances()
    loadStats()
    loadSmartQueue()
    loadDepartments()
    loadUsers()
  }, [loadAttendances, loadStats, loadSmartQueue, loadDepartments, loadUsers])

  useEffect(() => {
    loadAttendances()
  }, [filters, loadAttendances])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      return
    }

    const socket = connectAttendanceSocket(token)

    const handleEvent = () => {
      loadAttendances(false)
      loadStats()
      loadSmartQueue()
      if (selectedAttendanceId) {
        selectAttendance(selectedAttendanceId)
      }
    }

    onAttendanceNew(handleEvent)
    onAttendanceUpdate(handleEvent)
    onAttendanceTransferred(handleEvent)

    return () => {
      offAttendanceNew(handleEvent)
      offAttendanceUpdate(handleEvent)
      offAttendanceTransferred(handleEvent)
      disconnectAttendanceSocket()
      socket.disconnect()
    }
  }, [loadAttendances, loadStats, loadSmartQueue, selectAttendance, selectedAttendanceId])

  const setFilters = useCallback((mutator: (prev: AttendanceFilters) => AttendanceFilters) => {
    setFiltersState((prev) => mutator(prev))
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState({})
  }, [])

  const value = useMemo<AttendancesContextValue>(
    () => ({
      attendances,
      smartQueue,
      stats,
      departments,
      users,
      filters,
      setFilters,
      resetFilters,
      refresh,
      syncLeadsWithAttendances,
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
    }),
    [
      attendances,
      smartQueue,
      stats,
      departments,
      users,
      users,
      filters,
      setFilters,
      resetFilters,
      refresh,
      syncLeadsWithAttendances,
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
    ],
  )

  return <AttendancesContext.Provider value={value}>{children}</AttendancesContext.Provider>
}

export function useAttendances() {
  const context = useContext(AttendancesContext)
  if (!context) {
    throw new Error('useAttendances deve ser utilizado dentro de AttendancesProvider')
  }
  return context
}

