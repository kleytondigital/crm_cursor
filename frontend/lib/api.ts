/**
 * Configuração centralizada da API
 */

// URL base da API usando variável de ambiente
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * Helper para fazer requisições autenticadas à API
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token')
  
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options.headers) {
    Object.assign(headers, options.headers)
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error(error.message || `Erro ${response.status}`)
  }

  return response.json()
}

/**
 * Helper para criar requisições autenticadas
 */
function createAuthFetch() {
  return async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token')
    const url = `${API_URL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Erro ${response.status}`)
    }

    return response.json()
  }
}

const authFetch = createAuthFetch()

// ============================================
// SCHEDULER API
// ============================================
export const schedulerAPI = {
  getCampaigns: () => authFetch('/scheduler/campaigns'),
  getCampaign: (id: string) => authFetch(`/scheduler/campaigns/${id}`),
  createCampaign: (data: any) =>
    authFetch('/scheduler/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCampaign: (id: string, data: any) =>
    authFetch(`/scheduler/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCampaign: (id: string) =>
    authFetch(`/scheduler/campaigns/${id}`, {
      method: 'DELETE',
    }),
  removeCampaign: (id: string) =>
    authFetch(`/scheduler/campaigns/${id}`, {
      method: 'DELETE',
    }),
  runCampaign: (id: string) =>
    authFetch(`/scheduler/campaigns/${id}/run`, {
      method: 'POST',
    }),
  cancelCampaign: (id: string) =>
    authFetch(`/scheduler/campaigns/${id}/cancel`, {
      method: 'POST',
    }),
  getScheduledMessages: (leadId?: string) =>
    authFetch(leadId ? `/scheduler/scheduled?leadId=${leadId}` : '/scheduler/scheduled'),
  cancelScheduledMessage: (id: string) =>
    authFetch(`/scheduler/scheduled/${id}`, {
      method: 'DELETE',
    }),
  cancel: (id: string) =>
    authFetch(`/scheduler/scheduled/${id}`, {
      method: 'DELETE',
    }),
  schedule: (data: any) =>
    authFetch('/scheduler/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ============================================
// CONNECTIONS API
// ============================================
export const connectionsAPI = {
  getAll: () => authFetch('/connections'),
  getById: (id: string) => authFetch(`/connections/${id}`),
  create: (data: any) =>
    authFetch('/connections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    authFetch(`/connections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    authFetch(`/connections/${id}`, {
      method: 'DELETE',
    }),
  remove: (id: string) =>
    authFetch(`/connections/${id}`, {
      method: 'DELETE',
    }),
}

// ============================================
// LEADS API
// ============================================
export const leadsAPI = {
  getAll: () => authFetch('/leads'),
  getById: (id: string) => authFetch(`/leads/${id}`),
  create: (data: any) =>
    authFetch('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    authFetch(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    authFetch(`/leads/${id}`, {
      method: 'DELETE',
    }),
  remove: (id: string) =>
    authFetch(`/leads/${id}`, {
      method: 'DELETE',
    }),
  updateStage: (id: string, stageId: string) =>
    authFetch(`/leads/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stageId }),
    }),
  updateStatus: (id: string, status: string) =>
    authFetch(`/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

// ============================================
// MESSAGES API
// ============================================
export const messagesAPI = {
  getByConversation: (conversationId: string) =>
    authFetch(`/messages/conversation/${conversationId}`),
  create: (data: any) =>
    authFetch('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    authFetch(`/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  edit: (data: any) =>
    authFetch('/messages/edit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (data: any) => {
    // Se for string, é o ID interno
    if (typeof data === 'string') {
      return authFetch(`/messages/${data}`, {
        method: 'DELETE',
      })
    }
    // Se for objeto, é uma deleção de mensagem do WhatsApp
    return authFetch('/messages/delete', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  remove: (id: string) =>
    authFetch(`/messages/${id}`, {
      method: 'DELETE',
    }),
  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_URL}/messages/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    })
    if (!response.ok) throw new Error('Upload failed')
    return response.json()
  },
  send: (data: any) =>
    authFetch('/messages/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ============================================
// CONVERSATIONS API
// ============================================
export const conversationsAPI = {
  getAll: () => authFetch('/conversations'),
  getById: (id: string) => authFetch(`/conversations/${id}`),
  create: (data: any) =>
    authFetch('/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    authFetch(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    authFetch(`/conversations/${id}`, {
      method: 'DELETE',
    }),
  markAsRead: (id: string) =>
    authFetch(`/conversations/${id}/read`, {
      method: 'POST',
    }),
}

// ============================================
// USERS API
// ============================================
export const usersAPI = {
  getAll: () => authFetch('/users'),
  getById: (id: string) => authFetch(`/users/${id}`),
  create: (data: any) =>
    authFetch('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    authFetch(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    authFetch(`/users/${id}`, {
      method: 'DELETE',
    }),
  remove: (id: string) =>
    authFetch(`/users/${id}`, {
      method: 'DELETE',
    }),
}

// ============================================
// COMPANIES API
// ============================================
export const companiesAPI = {
  getAll: () => authFetch('/companies'),
  getById: (id: string) => authFetch(`/companies/${id}`),
  create: (data: any) =>
    authFetch('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    authFetch(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    authFetch(`/companies/${id}`, {
      method: 'DELETE',
    }),
  remove: (id: string) =>
    authFetch(`/companies/${id}`, {
      method: 'DELETE',
    }),
}

// ============================================
// DEPARTMENTS API
// ============================================
export const departmentsAPI = {
  getAll: () => authFetch('/departments'),
  list: () => authFetch('/departments'),
  getById: (id: string) => authFetch(`/departments/${id}`),
  create: (data: any) =>
    authFetch('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    authFetch(`/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    authFetch(`/departments/${id}`, {
      method: 'DELETE',
    }),
  remove: (id: string) =>
    authFetch(`/departments/${id}`, {
      method: 'DELETE',
    }),
  addUser: (departmentId: string, data: any) =>
    authFetch(`/departments/${departmentId}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeUser: (departmentId: string, userId: string) =>
    authFetch(`/departments/${departmentId}/users/${userId}`, {
      method: 'DELETE',
    }),
}

// ============================================
// ATTENDANCES API
// ============================================
export const attendancesAPI = {
  getAll: (params?: string | Record<string, string>) => {
    if (!params) return authFetch('/attendances')
    const queryString = typeof params === 'string' 
      ? params 
      : new URLSearchParams(params).toString()
    return authFetch(`/attendances?${queryString}`)
  },
  getById: (id: string) => authFetch(`/attendances/${id}`),
  getByLeadId: (leadId: string) => authFetch(`/attendances/lead/${leadId}`),
  getStats: () => authFetch('/attendances/stats'),
  getSmartQueue: () => authFetch('/attendances/queue/next'),
  create: (data: any) =>
    authFetch('/attendances', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    authFetch(`/attendances/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    authFetch(`/attendances/${id}`, {
      method: 'DELETE',
    }),
  remove: (id: string) =>
    authFetch(`/attendances/${id}`, {
      method: 'DELETE',
    }),
  close: (id: string, data: any) =>
    authFetch(`/attendances/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  transfer: (id: string, data: any) =>
    authFetch(`/attendances/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  changePriority: (id: string, priority: string) =>
    authFetch(`/attendances/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),
  updatePriority: (id: string, priority: string) =>
    authFetch(`/attendances/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),
  claim: (id: string, data?: any) =>
    authFetch(`/attendances/${id}/claim`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  syncLeadsWithAttendances: () =>
    authFetch('/attendances/sync', {
      method: 'POST',
    }),
}

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  login: (email: string, password: string) =>
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((res) => {
      if (!res.ok) throw new Error('Login failed')
      return res.json()
    }),
  register: (data: any) =>
    fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then((res) => {
      if (!res.ok) throw new Error('Registration failed')
      return res.json()
    }),
  me: () => authFetch('/auth/me'),
}
