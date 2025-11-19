import api from './axios'

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

export const pipelineStagesAPI = {
  // Listar todos os estágios
  async getAll(): Promise<PipelineStage[]> {
    const response = await api.get('/pipeline-stages')
    return response.data
  },

  // Buscar estágio por ID
  async getById(id: string): Promise<PipelineStage> {
    const response = await api.get(`/pipeline-stages/${id}`)
    return response.data
  },

  // Criar novo estágio
  async create(data: CreatePipelineStageDto): Promise<PipelineStage> {
    const response = await api.post('/pipeline-stages', data)
    return response.data
  },

  // Atualizar estágio
  async update(id: string, data: UpdatePipelineStageDto): Promise<PipelineStage> {
    const response = await api.patch(`/pipeline-stages/${id}`, data)
    return response.data
  },

  // Remover estágio
  async remove(id: string): Promise<{ message: string }> {
    const response = await api.delete(`/pipeline-stages/${id}`)
    return response.data
  },

  // Reordenar estágios
  async reorder(stages: Array<{ id: string; order: number }>): Promise<{ message: string }> {
    const response = await api.post('/pipeline-stages/reorder', { stages })
    return response.data
  },
}

