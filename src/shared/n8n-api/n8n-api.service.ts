import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface N8nWorkflowData {
  name: string;
  nodes: any[];
  connections: any;
  settings?: any;
  staticData?: any;
}

interface N8nWorkflowResponse {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  webhookUrl?: string;
}

@Injectable()
export class N8nApiService {
  private readonly logger = new Logger(N8nApiService.name);
  private readonly client: AxiosInstance;
  private readonly n8nUrl: string;
  private readonly n8nApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.n8nUrl = this.configService.get<string>('N8N_URL') || 'http://localhost:5678';
    this.n8nApiKey = this.configService.get<string>('N8N_API_KEY') || '';

    this.client = axios.create({
      baseURL: `${this.n8nUrl}/api/v1`,
      headers: {
        'X-N8N-API-KEY': this.n8nApiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Criar um novo workflow no n8n
   */
  async createWorkflow(workflowData: N8nWorkflowData): Promise<N8nWorkflowResponse> {
    try {
      this.logger.log(`Criando workflow: ${workflowData.name}`);
      
      const response = await this.client.post('/workflows', workflowData);
      
      this.logger.log(`Workflow criado com sucesso: ${response.data.id}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao criar workflow: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao criar workflow no n8n: ${error.message}`);
    }
  }

  /**
   * Ativar um workflow no n8n
   */
  async activateWorkflow(workflowId: string): Promise<N8nWorkflowResponse> {
    try {
      this.logger.log(`Ativando workflow: ${workflowId}`);
      
      const response = await this.client.patch(`/workflows/${workflowId}`, {
        active: true,
      });
      
      this.logger.log(`Workflow ativado com sucesso: ${workflowId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao ativar workflow: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao ativar workflow no n8n: ${error.message}`);
    }
  }

  /**
   * Desativar um workflow no n8n
   */
  async deactivateWorkflow(workflowId: string): Promise<N8nWorkflowResponse> {
    try {
      this.logger.log(`Desativando workflow: ${workflowId}`);
      
      const response = await this.client.patch(`/workflows/${workflowId}`, {
        active: false,
      });
      
      this.logger.log(`Workflow desativado com sucesso: ${workflowId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao desativar workflow: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao desativar workflow no n8n: ${error.message}`);
    }
  }

  /**
   * Atualizar um workflow existente no n8n
   */
  async updateWorkflow(
    workflowId: string,
    workflowData: Partial<N8nWorkflowData>,
  ): Promise<N8nWorkflowResponse> {
    try {
      this.logger.log(`Atualizando workflow: ${workflowId}`);
      
      const response = await this.client.patch(`/workflows/${workflowId}`, workflowData);
      
      this.logger.log(`Workflow atualizado com sucesso: ${workflowId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar workflow: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao atualizar workflow no n8n: ${error.message}`);
    }
  }

  /**
   * Deletar um workflow no n8n
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      this.logger.log(`Deletando workflow: ${workflowId}`);
      
      await this.client.delete(`/workflows/${workflowId}`);
      
      this.logger.log(`Workflow deletado com sucesso: ${workflowId}`);
    } catch (error: any) {
      this.logger.error(`Erro ao deletar workflow: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao deletar workflow no n8n: ${error.message}`);
    }
  }

  /**
   * Obter um workflow do n8n
   */
  async getWorkflow(workflowId: string): Promise<N8nWorkflowResponse> {
    try {
      const response = await this.client.get(`/workflows/${workflowId}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Erro ao obter workflow: ${error.message}`, error.stack);
      throw new BadRequestException(`Erro ao obter workflow do n8n: ${error.message}`);
    }
  }

  /**
   * Extrair URL do webhook de um workflow
   * Procura por nós do tipo 'n8n-nodes-base.webhook' e retorna a primeira URL encontrada
   */
  extractWebhookUrl(workflow: N8nWorkflowResponse): string | null {
    try {
      const webhookNode = workflow.nodes.find(
        (node: any) => node.type === 'n8n-nodes-base.webhook',
      );

      if (!webhookNode) {
        return null;
      }

      const webhookPath = webhookNode.parameters?.path || webhookNode.webhookId;
      
      if (!webhookPath) {
        return null;
      }

      // Construir URL do webhook
      return `${this.n8nUrl}/webhook/${webhookPath}`;
    } catch (error) {
      this.logger.error(`Erro ao extrair URL do webhook: ${error.message}`);
      return null;
    }
  }

  /**
   * Construir URL do webhook a partir de um path
   */
  buildWebhookUrl(webhookPath: string): string {
    return `${this.n8nUrl}/webhook/${webhookPath}`;
  }

  /**
   * Substituir variáveis em um workflow JSON
   * Ex: {{systemPrompt}} -> valor real
   */
  replaceVariables(workflowData: any, variables: Record<string, any>): any {
    let workflowStr = JSON.stringify(workflowData);

    // Substituir cada variável no formato {{variableName}}
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      workflowStr = workflowStr.replace(regex, variables[key]);
    });

    return JSON.parse(workflowStr);
  }
}

