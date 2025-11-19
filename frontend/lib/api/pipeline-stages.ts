import { API_URL } from '../api'

export interface PipelineStage {
  id: string
  name: string
  status: 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO'
  color: string
  order: number
  isDefault: boolean
  isActive: boolean
  tenantId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreatePipelineStageDto {
  name: string
  status: 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO'
  color?: string
  order?: number
  isActive?: boolean
}

export interface UpdatePipelineStageDto {
  name?: string
  status?: 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO'
  color?: string
  order?: number
  isActive?: boolean
}

/**
 * Helper para fazer requisições autenticadas
 */
async function authFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }))
    throw new Error(error.message || `Erro ${response.status}`)
  }

  return response.json()
}

export const pipelineStagesAPI = {
  // Listar todos os estágios
  async getAll(): Promise<PipelineStage[]> {
    return authFetch('/pipeline-stages')
  },

  // Buscar estágio por ID
  async getById(id: string): Promise<PipelineStage> {
    return authFetch(`/pipeline-stages/${id}`)
  },

  // Criar novo estágio
  async create(data: CreatePipelineStageDto): Promise<PipelineStage> {
    return authFetch('/pipeline-stages', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Atualizar estágio
  async update(id: string, data: UpdatePipelineStageDto): Promise<PipelineStage> {
    return authFetch(`/pipeline-stages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // Remover estágio
  async remove(id: string): Promise<{ message: string }> {
    return authFetch(`/pipeline-stages/${id}`, {
      method: 'DELETE',
    })
  },

  // Reordenar estágios
  async reorder(stages: Array<{ id: string; order: number }>): Promise<{ message: string }> {
    return authFetch('/pipeline-stages/reorder', {
      method: 'POST',
      body: JSON.stringify({ stages }),
    })
  },
}

