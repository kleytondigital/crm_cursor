/**
 * Configuração centralizada da API
 */

import type { NextRequest } from 'next/server'

// URL base da API usando variável de ambiente
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * Helper para obter headers de autenticação de uma requisição Next.js
 */
export function getAuthHeaders(req: NextRequest): Record<string, string> {
  const authorization = req.headers.get('authorization')
  if (authorization) {
    return { Authorization: authorization }
  }
  return {}
}

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
  // Social Connections
  startSocialOAuth: (provider: 'INSTAGRAM' | 'FACEBOOK') =>
    authFetch(`/connections/social/oauth/start?provider=${provider}`),
  // Meta API Connections
  startMetaApiOAuth: (data: { name: string; services: string[] }) =>
    authFetch('/connections/meta-api/oauth/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSocialConnections: () => authFetch('/connections/social'),
  // Meta Ads Connections
  getMetaAdsConnections: () => authFetch('/connections/meta-ads'),
  createSocialConnection: (data: { provider: 'INSTAGRAM' | 'FACEBOOK'; name: string }) =>
    authFetch('/connections/social', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSocialConnection: (id: string, data: any) =>
    authFetch(`/connections/social/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  disconnectSocial: (id: string) =>
    authFetch(`/connections/social/${id}/disconnect`, {
      method: 'POST',
    }),
  refreshSocialToken: (id: string) =>
    authFetch(`/connections/social/oauth/refresh/${id}`, {
      method: 'POST',
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
  updateStatusId: (id: string, statusId: string | null) =>
    authFetch(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ statusId }),
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
  transcribe: (messageId: string) =>
    authFetch(`/messages/${messageId}/transcribe`, {
      method: 'POST',
    }),
  retryTranscription: (messageId: string) =>
    authFetch(`/messages/${messageId}/transcription/retry`, {
      method: 'POST',
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
  updateAutomationsAccess: (id: string, automationsEnabled: boolean) =>
    authFetch(`/companies/${id}/automations`, {
      method: 'PATCH',
      body: JSON.stringify({ automationsEnabled }),
    }),
  updateTranscriptionSetting: (id: string, autoTranscribeAudio: boolean) =>
    authFetch(`/companies/${id}/transcription`, {
      method: 'PATCH',
      body: JSON.stringify({ autoTranscribeAudio }),
    }),
  verifyAutomationsPassword: (password: string) =>
    authFetch('/companies/automations/verify-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  getAutomationsAccess: () => authFetch('/companies/me/automations-access'),
  getMySummary: () => authFetch('/companies/me/summary'),
}

// ============================================
// SYSTEM SETTINGS API
// ============================================
export const systemSettingsAPI = {
  getPublic: () =>
    fetch(`${API_URL}/system-settings/public`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    }).then((res) => {
      if (!res.ok) {
        throw new Error('Erro ao carregar configurações do sistema')
      }
      return res.json()
    }),
  update: async (data: Partial<{ crmName: string; slogan: string; version: string }>) => {
    const token = localStorage.getItem('token')
    const url = `${API_URL}/system-settings`
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
      const error = new Error(errorData.message || `Erro ${response.status}`)
      ;(error as any).response = { data: errorData, status: response.status }
      throw error
    }

    return response.json()
  },
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
  claim: (leadId: string, data?: any) =>
    authFetch(`/attendances/lead/${leadId}/claim`, {
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

// ============================================
// API KEYS API
// ============================================
export const apiKeysAPI = {
  list: () => authFetch('/api-keys'),
  getById: (id: string) => authFetch(`/api-keys/${id}`),
  create: (data: { name: string; isGlobal?: boolean; expiresAt?: string }) =>
    authFetch('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  revoke: (id: string) =>
    authFetch(`/api-keys/${id}`, {
      method: 'DELETE',
    }),
  remove: (id: string) =>
    authFetch(`/api-keys/${id}`, {
      method: 'DELETE',
    }),
}

// ============================================
// BULK MESSAGING API (Disparo em Massa)
// ============================================
export const bulkMessagingAPI = {
  // Campanhas
  list: (filters?: { status?: string; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.search) params.append('search', filters.search)
    const query = params.toString()
    return authFetch(`/bulk-messaging${query ? `?${query}` : ''}`)
  },
  getById: (id: string) => authFetch(`/bulk-messaging/${id}`),
  create: (data: {
    name: string
    description?: string
    contentType: string
    content?: string
    caption?: string
    connectionId: string
    delayBetweenMessages?: number
    delayBetweenNumbers?: number
  }) =>
    authFetch('/bulk-messaging', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    authFetch(`/bulk-messaging/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    authFetch(`/bulk-messaging/${id}`, {
      method: 'DELETE',
    }),

  // Upload de arquivo Excel
  uploadRecipients: async (id: string, file: File) => {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/bulk-messaging/${id}/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
      throw new Error(error.message || `Erro ${response.status}`)
    }

    return response.json()
  },

  // Controle de campanha
  start: (id: string) =>
    authFetch(`/bulk-messaging/${id}/start`, {
      method: 'POST',
    }),
  pause: (id: string) =>
    authFetch(`/bulk-messaging/${id}/pause`, {
      method: 'POST',
    }),
  resume: (id: string) =>
    authFetch(`/bulk-messaging/${id}/resume`, {
      method: 'POST',
    }),
  cancel: (id: string) =>
    authFetch(`/bulk-messaging/${id}/cancel`, {
      method: 'POST',
    }),

  // Destinatários e Logs
  getRecipients: (id: string) => authFetch(`/bulk-messaging/${id}/recipients`),
  getLogs: (id: string, filters?: { status?: string; search?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.search) params.append('search', filters.search)
    const query = params.toString()
    return authFetch(`/bulk-messaging/${id}/logs${query ? `?${query}` : ''}`)
  },
}

// ============================================
// AD ACCOUNTS API
// ============================================
export const adAccountsAPI = {
  listAvailable: (connectionId: string) =>
    authFetch(`/ad-accounts/available?connectionId=${connectionId}`),
  connect: (data: { connectionId: string; adAccountId: string }) =>
    authFetch('/ad-accounts/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  listConnected: () => authFetch('/ad-accounts'),
  disconnect: (id: string) =>
    authFetch(`/ad-accounts/${id}`, {
      method: 'DELETE',
    }),
  updateStatus: (id: string) =>
    authFetch(`/ad-accounts/${id}/status`, {
      method: 'PATCH',
    }),
}

// ============================================
// AD REPORTS API
// ============================================
export const adReportsAPI = {
  getDashboard: (filters: {
    adAccountId: string
    campaignId?: string
    adsetId?: string
    adId?: string
    dateStart?: string
    dateEnd?: string
  }) => {
    const params = new URLSearchParams()
    params.append('adAccountId', filters.adAccountId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.adsetId) params.append('adsetId', filters.adsetId)
    if (filters.adId) params.append('adId', filters.adId)
    if (filters.dateStart) params.append('dateStart', filters.dateStart)
    if (filters.dateEnd) params.append('dateEnd', filters.dateEnd)
    return authFetch(`/ad-reports/dashboard?${params.toString()}`)
  },
  listCampanhas: (connectionId: string, adAccountId: string) =>
    authFetch(`/ad-reports/campanhas/${connectionId}/${adAccountId}`),
  listMetricas: (params: {
    connectionId: string
    adAccountId: string
    dateStart: string
    dateEnd: string
    campaignId?: string
    adsetId?: string
    adId?: string
  }) => {
    const queryParams = new URLSearchParams()
    queryParams.append('dateStart', params.dateStart)
    queryParams.append('dateEnd', params.dateEnd)
    if (params.campaignId) queryParams.append('campaignId', params.campaignId)
    if (params.adsetId) queryParams.append('adsetId', params.adsetId)
    if (params.adId) queryParams.append('adId', params.adId)
    return authFetch(
      `/ad-reports/metricas/${params.connectionId}/${params.adAccountId}?${queryParams.toString()}`,
    )
  },
}
