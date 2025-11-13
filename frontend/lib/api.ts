import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },
}

export const conversationsAPI = {
  getAll: async () => {
    const response = await api.get('/conversations')
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/conversations/${id}`)
    return response.data
  },
}

export const messagesAPI = {
  getByConversation: async (conversationId: string) => {
    const response = await api.get(`/messages/conversation/${conversationId}`)
    return response.data
  },
  send: async (data: {
    conversationId: string
    senderType: 'USER'
    contentType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT'
    contentText?: string
    contentUrl?: string
    replyTo?: string // messageId da mensagem que está sendo respondida
    action?: 'reply' | 'edit' | 'delete'
  }) => {
    const response = await api.post('/messages', data)
    return response.data
  },
  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/messages/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data as { url: string; mimetype: string; filename: string }
  },
  edit: async (data: {
    idMessage: string
    phone: string
    session: string
    Texto: string
  }) => {
    const response = await api.post('/messages/edit', data)
    return response.data
  },
  delete: async (data: {
    idMessage: string
    phone: string
    session: string
  }) => {
    const response = await api.post('/messages/delete', data)
    return response.data
  },
}

export const leadsAPI = {
  getAll: async (status?: string) => {
    const params = status ? { status } : {}
    const response = await api.get('/leads', { params })
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/leads/${id}`)
    return response.data
  },
  create: async (data: {
    name: string
    phone: string
    tags?: string[]
    status?: 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO'
  }) => {
    const response = await api.post('/leads', data)
    return response.data
  },
  update: async (id: string, data: {
    name?: string
    phone?: string
    tags?: string[]
    status?: 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO'
  }) => {
    const response = await api.patch(`/leads/${id}`, data)
    return response.data
  },
  updateStatus: async (id: string, status: 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO') => {
    const response = await api.patch(`/leads/${id}`, { status })
    return response.data
  },
  delete: async (id: string) => {
    const response = await api.delete(`/leads/${id}`)
    return response.data
  },
}

export const attendancesAPI = {
  getAll: async (params?: Record<string, string | number | boolean | undefined>) => {
    const response = await api.get('/attendances', { params })
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/attendances/${id}`)
    return response.data
  },
  getByLeadId: async (leadId: string) => {
    // Buscar atendimento pelo leadId - retorna o primeiro atendimento encontrado para o lead
    try {
      const response = await api.get('/attendances', { params: { leadId } })
      const data = response.data?.data || response.data || []
      // Retornar o primeiro atendimento ativo (não fechado) ou o mais recente
      const attendances = Array.isArray(data) ? data : []
      return attendances.find((att: any) => att.lead?.id === leadId && att.status !== 'CLOSED') || attendances[0] || null
    } catch (err: any) {
      // Se não encontrar, retornar null (não é um erro crítico)
      console.warn('Atendimento não encontrado para o lead:', leadId)
      return null
    }
  },
  getStats: async () => {
    const response = await api.get('/attendances/stats')
    return response.data
  },
  getSmartQueue: async () => {
    const response = await api.get('/attendances/queue/next')
    return response.data
  },
  getUserDepartments: async () => {
    const response = await api.get('/attendances/departments')
    return response.data
  },
  claim: async (leadId: string, payload?: { notes?: string; departmentId?: string }) => {
    const response = await api.post(`/attendances/lead/${leadId}/claim`, payload ?? {})
    return response.data
  },
  transfer: async (id: string, payload: { targetUserId?: string; targetDepartmentId?: string; notes?: string; priority?: 'LOW' | 'NORMAL' | 'HIGH' }) => {
    const response = await api.post(`/attendances/${id}/transfer`, payload)
    return response.data
  },
  close: async (id: string, payload?: { notes?: string }) => {
    const response = await api.post(`/attendances/${id}/close`, payload ?? {})
    return response.data
  },
  updatePriority: async (id: string, priority: 'LOW' | 'NORMAL' | 'HIGH') => {
    const response = await api.patch(`/attendances/${id}/priority`, { priority })
    return response.data
  },
  syncLeadsWithAttendances: async () => {
    const response = await api.post('/attendances/sync')
    return response.data
  },
}

export const departmentsAPI = {
  list: async () => {
    const response = await api.get('/departments')
    return response.data
  },
  create: async (payload: { name: string; description?: string }) => {
    const response = await api.post('/departments', payload)
    return response.data
  },
  update: async (id: string, payload: { name?: string; description?: string }) => {
    const response = await api.patch(`/departments/${id}`, payload)
    return response.data
  },
  remove: async (id: string) => {
    const response = await api.delete(`/departments/${id}`)
    return response.data
  },
  addUser: async (id: string, payload: { userId: string; role: 'ADMIN' | 'AGENT' }) => {
    const response = await api.post(`/departments/${id}/users`, payload)
    return response.data
  },
  removeUser: async (id: string, userId: string) => {
    const response = await api.delete(`/departments/${id}/users/${userId}`)
    return response.data
  },
}

export const companiesAPI = {
  getAll: async () => {
    const response = await api.get('/companies')
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/companies/${id}`)
    return response.data
  },
  create: async (payload: { name: string; slug: string; email?: string; phone?: string; document?: string; isActive?: boolean }) => {
    const response = await api.post('/companies', payload)
    return response.data
  },
  update: async (id: string, payload: { name?: string; slug?: string; email?: string; phone?: string; document?: string; isActive?: boolean }) => {
    const response = await api.patch(`/companies/${id}`, payload)
    return response.data
  },
  remove: async (id: string) => {
    const response = await api.delete(`/companies/${id}`)
    return response.data
  },
}

export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users')
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/users/${id}`)
    return response.data
  },
  getByCompany: async (companyId: string) => {
    const response = await api.get('/users', { params: { companyId } })
    return response.data
  },
  create: async (payload: { name: string; email: string; password: string; role?: 'ADMIN' | 'USER' | 'MANAGER' | 'SUPER_ADMIN'; companyId: string }) => {
    const response = await api.post('/users', payload)
    return response.data
  },
  update: async (id: string, payload: { name?: string; email?: string; password?: string; role?: 'ADMIN' | 'USER' | 'MANAGER' | 'SUPER_ADMIN'; companyId?: string; isActive?: boolean }) => {
    const response = await api.patch(`/users/${id}`, payload)
    return response.data
  },
  remove: async (id: string) => {
    const response = await api.delete(`/users/${id}`)
    return response.data
  },
}

export const schedulerAPI = {
  schedule: async (payload: {
    leadId: string
    connectionId?: string
    contentType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT'
    content?: string
    caption?: string
    scheduledFor: string
    departmentId?: string
    conversationId?: string
  }) => {
    const response = await api.post('/scheduler/schedule', payload)
    return response.data
  },
  cancel: async (id: string) => {
    const response = await api.delete(`/scheduler/cancel/${id}`)
    return response.data
  },
  getScheduledMessages: async (leadId: string) => {
    const response = await api.get(`/scheduler/messages/${leadId}`)
    return response.data
  },
  createCampaign: async (payload: {
    name: string
    description?: string
    filterTags?: string[]
    filterStages?: string[]
    scheduledFor: string
    contentType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT'
    content?: string
    caption?: string
    connectionId?: string
    useRandomConnection?: boolean
  }) => {
    const response = await api.post('/scheduler/campaign', payload)
    return response.data
  },
  runCampaign: async (id: string) => {
    const response = await api.post(`/scheduler/campaign/${id}/run`)
    return response.data
  },
  getCampaigns: async () => {
    const response = await api.get('/scheduler/campaigns')
    return response.data
  },
  getCampaign: async (id: string) => {
    const response = await api.get(`/scheduler/campaign/${id}`)
    return response.data
  },
  cancelCampaign: async (id: string) => {
    const response = await api.delete(`/scheduler/campaign/${id}`)
    return response.data
  },
}

export const connectionsAPI = {
  getAll: async () => {
    const response = await api.get('/connections')
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/connections/${id}`)
    return response.data
  },
}

export default api
