/**
 * DTOs para comunicação com o Webhook Gestor do N8N
 * O webhook gestor é responsável por orquestrar a criação e gestão de workflows
 */

export type ManagerAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'activate'
  | 'deactivate'
  | 'get'
  | 'validate'
  | 'test'
  | 'duplicate'
  | 'logs'
  | 'export';

/**
 * Request base para o webhook gestor
 */
export interface ManagerWebhookRequestDto {
  action: ManagerAction;
  tenantId: string;
}

/**
 * Request para criar um novo workflow
 */
export interface CreateWorkflowRequestDto extends ManagerWebhookRequestDto {
  action: 'create';
  templateName: string;
  automationName: string;
  workflowJson: any; // JSON do workflow processado (com variáveis substituídas)
  variables: Record<string, any>; // Valores das variáveis para referência
}

/**
 * Request para atualizar um workflow existente
 */
export interface UpdateWorkflowRequestDto extends ManagerWebhookRequestDto {
  action: 'update';
  workflowId: string;
  automationName?: string;
  workflowJson: any; // JSON do workflow processado (com variáveis substituídas)
  variables: Record<string, any>; // Valores das variáveis para referência
}

/**
 * Request para deletar um workflow
 */
export interface DeleteWorkflowRequestDto extends ManagerWebhookRequestDto {
  action: 'delete';
  workflowId: string;
}

/**
 * Request para ativar um workflow
 */
export interface ActivateWorkflowRequestDto extends ManagerWebhookRequestDto {
  action: 'activate';
  workflowId: string;
}

/**
 * Request para desativar um workflow
 */
export interface DeactivateWorkflowRequestDto extends ManagerWebhookRequestDto {
  action: 'deactivate';
  workflowId: string;
}

/**
 * Request para obter informações de um workflow
 */
export interface GetWorkflowRequestDto extends ManagerWebhookRequestDto {
  action: 'get';
  workflowId: string;
}

/**
 * Request para validar variáveis antes de criar
 */
export interface ValidateVariablesRequestDto extends ManagerWebhookRequestDto {
  action: 'validate';
  templateName: string;
  variables: Record<string, any>;
}

/**
 * Request para testar workflow sem ativar
 */
export interface TestWorkflowRequestDto extends ManagerWebhookRequestDto {
  action: 'test';
  workflowId: string;
  testData?: any;
}

/**
 * Request para duplicar workflow
 */
export interface DuplicateWorkflowRequestDto extends ManagerWebhookRequestDto {
  action: 'duplicate';
  workflowId: string;
  newAutomationName: string;
}

/**
 * Request para obter logs de execução
 */
export interface GetLogsRequestDto extends ManagerWebhookRequestDto {
  action: 'logs';
  workflowId: string;
  limit?: number;
  offset?: number;
}

/**
 * Request para exportar configuração
 */
export interface ExportWorkflowRequestDto extends ManagerWebhookRequestDto {
  action: 'export';
  workflowId: string;
}

/**
 * Response do webhook gestor
 */
export interface ManagerWebhookResponseDto<T = any> {
  success?: boolean; // Opcional - alguns webhooks podem não retornar explicitamente
  message?: string;
  data?: T; // Os dados podem estar aqui ou diretamente na raiz da resposta
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
  // Campos que podem estar diretamente na resposta quando success não está presente
  workflowId?: string;
  webhookName?: string;
  webhookPatch?: string;
  agentPrompt?: string;
  webhookUrl?: string;
  webhookUrlEditor?: string;
  status?: string;
  active?: boolean;
}

/**
 * Dados retornados ao criar um workflow
 */
export interface CreateWorkflowResponseData {
  workflowId: string; // ID do workflow criado no n8n
  webhookName: string; // Nome do webhook retornado pelo n8n
  webhookPatch: string; // Path do webhook retornado pelo n8n (nota: parece ser "Path" e não "Patch")
  agentPrompt: string; // Prompt do agente gerado
  webhookUrl: string; // URL do webhook para receber eventos
  webhookUrlEditor?: string; // URL do editor do workflow no n8n
  status?: 'created';
  active?: boolean; // Status ativo/inativo
}

/**
 * Dados retornados ao atualizar um workflow
 */
export interface UpdateWorkflowResponseData {
  workflowId: string;
  status: 'updated';
  active: boolean;
}

/**
 * Dados retornados ao ativar/desativar um workflow
 */
export interface ActivateWorkflowResponseData {
  workflowId: string;
  status: 'activated' | 'deactivated';
  active: boolean;
}

/**
 * Dados retornados ao obter informações de um workflow
 */
export interface GetWorkflowResponseData {
  workflowId: string;
  name: string;
  active: boolean;
  webhookUrl: string;
  variables: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dados retornados ao validar variáveis
 */
export interface ValidateVariablesResponseData {
  valid: boolean;
  missingFields?: string[];
  invalidFields?: Array<{
    field: string;
    reason: string;
  }>;
}

/**
 * Dados retornados ao obter logs
 */
export interface GetLogsResponseData {
  workflowId: string;
  logs: Array<{
    executionId: string;
    startedAt: string;
    finishedAt: string;
    status: 'success' | 'error' | 'running';
    error?: string;
  }>;
  total: number;
}

/**
 * Dados retornados ao exportar workflow
 */
export interface ExportWorkflowResponseData {
  workflowId: string;
  workflowData: any;
  exportedAt: string;
}

