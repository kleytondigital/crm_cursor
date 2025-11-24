import { apiRequest } from '../api'

export interface CustomLeadStatus {
  id: string
  name: string
  description: string
  color: string
  order: number
  isActive: boolean
  tenantId: string
  createdAt: string
  updatedAt: string
}

export interface CreateLeadStatusDto {
  name: string
  description: string
  color?: string
  order?: number
  isActive?: boolean
}

export interface UpdateLeadStatusDto {
  name?: string
  description?: string
  color?: string
  order?: number
  isActive?: boolean
}

export const leadStatusAPI = {
  getAll: async (): Promise<CustomLeadStatus[]> => {
    return apiRequest<CustomLeadStatus[]>('/lead-status')
  },

  getById: async (id: string): Promise<CustomLeadStatus> => {
    return apiRequest<CustomLeadStatus>(`/lead-status/${id}`)
  },

  create: async (data: CreateLeadStatusDto): Promise<CustomLeadStatus> => {
    return apiRequest<CustomLeadStatus>('/lead-status', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: UpdateLeadStatusDto): Promise<CustomLeadStatus> => {
    return apiRequest<CustomLeadStatus>(`/lead-status/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  updateOrder: async (id: string, order: number): Promise<CustomLeadStatus> => {
    return apiRequest<CustomLeadStatus>(`/lead-status/${id}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ order }),
    })
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/lead-status/${id}`, {
      method: 'DELETE',
    })
  },
}

