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
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
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
  runCampaign: (id: string) =>
    authFetch(`/scheduler/campaigns/${id}/run`, {
      method: 'POST',
    }),
  cancelCampaign: (id: string) =>
    authFetch(`/scheduler/campaigns/${id}/cancel`, {
      method: 'POST',
    }),
  getScheduledMessages: () => authFetch('/scheduler/scheduled'),
  cancelScheduledMessage: (id: string) =>
    authFetch(`/scheduler/scheduled/${id}`, {
      method: 'DELETE',
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
  updateStage: (id: string, stageId: string) =>
    authFetch(`/leads/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stageId }),
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
  delete: (id: string) =>
    authFetch(`/messages/${id}`, {
      method: 'DELETE',
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
}

// ============================================
// DEPARTMENTS API
// ============================================
export const departmentsAPI = {
  getAll: () => authFetch('/departments'),
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
}

// ============================================
// ATTENDANCES API
// ============================================
export const attendancesAPI = {
  getAll: () => authFetch('/attendances'),
  getById: (id: string) => authFetch(`/attendances/${id}`),
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
