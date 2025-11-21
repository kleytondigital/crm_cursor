import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  ManagerWebhookRequestDto,
  ManagerWebhookResponseDto,
  CreateWorkflowRequestDto,
  UpdateWorkflowRequestDto,
  DeleteWorkflowRequestDto,
  ActivateWorkflowRequestDto,
  DeactivateWorkflowRequestDto,
  GetWorkflowRequestDto,
  ValidateVariablesRequestDto,
  CreateWorkflowResponseData,
  UpdateWorkflowResponseData,
  ActivateWorkflowResponseData,
  GetWorkflowResponseData,
  ValidateVariablesResponseData,
  TestWorkflowRequestDto,
  DuplicateWorkflowRequestDto,
  GetLogsRequestDto,
  GetLogsResponseData,
} from './dto/manager-webhook.dto';

/**
 * Service para comunicação com o Webhook Gestor do N8N
 * 
 * O webhook gestor é responsável por orquestrar toda a criação e gestão de workflows.
 * Ao invés de chamar diretamente a API do n8n, enviamos requisições para um webhook
 * gestor que realiza todas as operações necessárias.
 */
@Injectable()
export class N8nApiService {
  private readonly logger = new Logger(N8nApiService.name);
  private readonly client: AxiosInstance;
  private readonly managerWebhookUrl: string;
  private readonly timeout: number = 30000; // 30 segundos
  private readonly maxRetries: number = 3;

  constructor(private readonly configService: ConfigService) {
    this.managerWebhookUrl =
      this.configService.get<string>('N8N_MANAGER_WEBHOOK_URL') ||
      'http://localhost:5678/webhook/manager-crm';

    this.client = axios.create({
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(
      `N8nApiService inicializado. Webhook Gestor: ${this.managerWebhookUrl}`,
    );
  }

  /**
   * Método genérico para chamar o webhook gestor
   */
  private async callManagerWebhook<T = any>(
    payload: ManagerWebhookRequestDto,
    retryCount = 0,
  ): Promise<ManagerWebhookResponseDto<T>> {
    try {
      this.logger.log(
        `Chamando webhook gestor - Action: ${payload.action}, Tenant: ${payload.tenantId}`,
      );

      const response = await this.client.post<ManagerWebhookResponseDto<T>>(
        this.managerWebhookUrl,
        payload,
      );

      // Log detalhado da resposta para debug
      this.logger.debug(
        `Resposta do webhook gestor: ${JSON.stringify(response.data)}`,
      );

      // Verificar se a resposta tem a estrutura esperada
      if (!response.data) {
        throw new BadRequestException(
          'Webhook gestor não retornou dados na resposta',
        );
      }

      // Verificar se success é false explicitamente
      if (response.data.success === false) {
        const errorMessage =
          response.data.error?.message ||
          response.data.message ||
          'Erro no webhook gestor';
        this.logger.error(
          `Webhook gestor retornou erro: ${errorMessage}`,
          JSON.stringify(response.data.error),
        );
        throw new BadRequestException(errorMessage);
      }

      // Se success é true ou undefined/null, verificar se há dados ou erro
      // Alguns webhooks podem retornar diretamente os dados ou ter uma estrutura diferente
      const responseData = response.data;

      // Se há um campo error, mesmo sem success=false, tratar como erro
      if (responseData.error) {
        const errorMessage =
          responseData.error.message ||
          responseData.error.code ||
          'Erro no webhook gestor';
        this.logger.error(
          `Webhook gestor retornou erro: ${errorMessage}`,
          JSON.stringify(responseData.error),
        );
        throw new BadRequestException(errorMessage);
      }

      // Se success é true ou não está definido (mas não há erro), considerar sucesso
      // Pode ter data ou os dados podem estar diretamente na resposta
      this.logger.log(`Webhook gestor respondeu com sucesso: ${payload.action}`);
      return responseData;
    } catch (error: any) {
      // Se já é um BadRequestException, não fazer retry
      if (error instanceof BadRequestException) {
        this.logger.error(
          `Erro validado do webhook gestor: ${error.message}`,
        );
        throw error;
      }

      this.logger.error(
        `Erro ao chamar webhook gestor (tentativa ${retryCount + 1}/${this.maxRetries}): ${error.message}`,
        error.stack,
      );

      // Log detalhado do erro para debug
      if (error.response) {
        this.logger.error(
          `Detalhes da resposta de erro: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`,
        );
      }

      // Retry apenas para erros de rede/timeout, não para erros de validação
      if (
        retryCount < this.maxRetries - 1 &&
        (error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.response?.status >= 500)
      ) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        this.logger.log(`Aguardando ${delay}ms antes de tentar novamente...`);
        await this.sleep(delay);
        return this.callManagerWebhook(payload, retryCount + 1);
      }

      // Se o erro tem uma mensagem mais específica do axios, usar ela
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        error.message ||
        'Erro desconhecido ao comunicar com webhook gestor';

      throw new BadRequestException(
        `Erro ao comunicar com webhook gestor do n8n: ${errorMessage}`,
      );
    }
  }

  /**
   * Criar um novo workflow via webhook gestor
   * Envia o JSON do workflow processado e as variáveis
   * Não faz validação - apenas cria com os dados fornecidos
   */
  async createWorkflowViaManager(
    tenantId: string,
    templateName: string,
    automationName: string,
    workflowJson: any, // JSON do workflow processado (com variáveis substituídas)
    variables: Record<string, any>, // Valores das variáveis para referência
  ): Promise<CreateWorkflowResponseData> {
    const payload: CreateWorkflowRequestDto = {
      action: 'create',
      tenantId,
      templateName,
      automationName,
      workflowJson, // JSON do workflow processado
      variables, // Valores das variáveis para referência
    };

    const response =
      await this.callManagerWebhook<CreateWorkflowResponseData>(payload);

    // Verificar se a resposta tem dados
    // Os dados podem estar em response.data ou diretamente na resposta
    let workflowData: CreateWorkflowResponseData;

    if (response && response.data) {
      // Formato padrão: { success: true, data: {...} }
      workflowData = response.data;
      this.logger.log(
        `Dados do workflow criado (em response.data): workflowId=${workflowData.workflowId}`,
      );
    } else if (
      response &&
      ((response as any).workflowId ||
        (response as any).webhookUrl ||
        (response as any).webhookName)
    ) {
      // Dados diretamente na resposta (formato alternativo)
      const resp = response as any;
      workflowData = {
        workflowId: resp.workflowId || '',
        webhookName: resp.webhookName || '',
        webhookPatch: resp.webhookPatch || '',
        agentPrompt: resp.agentPrompt || '',
        webhookUrl: resp.webhookUrl || '',
        webhookUrlEditor: resp.webhookUrlEditor,
        status: resp.status,
        active: resp.active,
      };
      this.logger.log(
        `Dados do workflow criado (diretamente na resposta): workflowId=${workflowData.workflowId}`,
      );
    } else {
      this.logger.error(
        `Webhook gestor não retornou dados válidos: ${JSON.stringify(response)}`,
      );
      throw new BadRequestException(
        'Webhook gestor não retornou dados do workflow criado. Verifique os logs para mais detalhes.',
      );
    }

    // Validar campos obrigatórios
    if (!workflowData.workflowId && !workflowData.webhookUrl) {
      this.logger.error(
        `Dados do workflow incompletos: ${JSON.stringify(workflowData)}`,
      );
      throw new BadRequestException(
        'Webhook gestor não retornou workflowId ou webhookUrl obrigatórios',
      );
    }

    return workflowData;
  }

  /**
   * Atualizar um workflow existente via webhook gestor
   */
  async updateWorkflowViaManager(
    tenantId: string,
    workflowId: string,
    workflowJson: any, // JSON do workflow processado (com variáveis substituídas)
    variables: Record<string, any>, // Valores das variáveis para referência
    automationName?: string,
  ): Promise<UpdateWorkflowResponseData> {
    const payload: UpdateWorkflowRequestDto = {
      action: 'update',
      tenantId,
      workflowId,
      workflowJson, // JSON do workflow processado
      variables, // Valores das variáveis para referência
      automationName,
    };

    const response =
      await this.callManagerWebhook<UpdateWorkflowResponseData>(payload);

    if (!response.data) {
      throw new BadRequestException(
        'Webhook gestor não retornou dados do workflow atualizado',
      );
    }

    return response.data;
  }

  /**
   * Deletar um workflow via webhook gestor
   */
  async deleteWorkflowViaManager(
    tenantId: string,
    workflowId: string,
  ): Promise<void> {
    const payload: DeleteWorkflowRequestDto = {
      action: 'delete',
      tenantId,
      workflowId,
    };

    await this.callManagerWebhook(payload);
  }

  /**
   * Ativar um workflow via webhook gestor
   */
  async activateWorkflowViaManager(
    tenantId: string,
    workflowId: string,
  ): Promise<ActivateWorkflowResponseData> {
    const payload: ActivateWorkflowRequestDto = {
      action: 'activate',
      tenantId,
      workflowId,
    };

    const response =
      await this.callManagerWebhook<ActivateWorkflowResponseData>(payload);

    if (!response.data) {
      throw new BadRequestException(
        'Webhook gestor não retornou dados do workflow ativado',
      );
    }

    return response.data;
  }

  /**
   * Desativar um workflow via webhook gestor
   */
  async deactivateWorkflowViaManager(
    tenantId: string,
    workflowId: string,
  ): Promise<ActivateWorkflowResponseData> {
    const payload: DeactivateWorkflowRequestDto = {
      action: 'deactivate',
      tenantId,
      workflowId,
    };

    const response =
      await this.callManagerWebhook<ActivateWorkflowResponseData>(payload);

    if (!response.data) {
      throw new BadRequestException(
        'Webhook gestor não retornou dados do workflow desativado',
      );
    }

    return response.data;
  }

  /**
   * Obter informações de um workflow via webhook gestor
   */
  async getWorkflowInfoViaManager(
    tenantId: string,
    workflowId: string,
  ): Promise<GetWorkflowResponseData> {
    const payload: GetWorkflowRequestDto = {
      action: 'get',
      tenantId,
      workflowId,
    };

    const response =
      await this.callManagerWebhook<GetWorkflowResponseData>(payload);

    if (!response.data) {
      throw new BadRequestException(
        'Webhook gestor não retornou dados do workflow',
      );
    }

    return response.data;
  }

  /**
   * Validar variáveis antes de criar workflow
   */
  async validateVariablesViaManager(
    tenantId: string,
    templateName: string,
    variables: Record<string, any>,
  ): Promise<ValidateVariablesResponseData> {
    const payload: ValidateVariablesRequestDto = {
      action: 'validate',
      tenantId,
      templateName,
      variables,
    };

    const response =
      await this.callManagerWebhook<ValidateVariablesResponseData>(payload);

    if (!response.data) {
      throw new BadRequestException(
        'Webhook gestor não retornou resultado da validação',
      );
    }

    return response.data;
  }

  /**
   * Testar workflow sem ativar
   */
  async testWorkflowViaManager(
    tenantId: string,
    workflowId: string,
    testData?: any,
  ): Promise<any> {
    const payload: TestWorkflowRequestDto = {
      action: 'test',
      tenantId,
      workflowId,
      testData,
    };

    const response = await this.callManagerWebhook(payload);
    return response.data;
  }

  /**
   * Duplicar workflow existente
   */
  async duplicateWorkflowViaManager(
    tenantId: string,
    workflowId: string,
    newAutomationName: string,
  ): Promise<CreateWorkflowResponseData> {
    const payload: DuplicateWorkflowRequestDto = {
      action: 'duplicate',
      tenantId,
      workflowId,
      newAutomationName,
    };

    const response =
      await this.callManagerWebhook<CreateWorkflowResponseData>(payload);

    if (!response.data) {
      throw new BadRequestException(
        'Webhook gestor não retornou dados do workflow duplicado',
      );
    }

    return response.data;
  }

  /**
   * Obter logs de execução do workflow
   */
  async getWorkflowLogsViaManager(
    tenantId: string,
    workflowId: string,
    limit = 50,
    offset = 0,
  ): Promise<GetLogsResponseData> {
    const payload: GetLogsRequestDto = {
      action: 'logs',
      tenantId,
      workflowId,
      limit,
      offset,
    };

    const response =
      await this.callManagerWebhook<GetLogsResponseData>(payload);

    if (!response.data) {
      throw new BadRequestException(
        'Webhook gestor não retornou logs do workflow',
      );
    }

    return response.data;
  }

  /**
   * Método genérico para fazer POST em qualquer webhook/URL do n8n
   * Usado para enviar mensagens, notificações, etc.
   */
  async postToUrl(url: string, payload: any): Promise<any> {
    try {
      this.logger.log(`Enviando POST para webhook: ${url}`);
      this.logger.debug(`Payload: ${JSON.stringify(payload).substring(0, 200)}...`);

      const response = await this.client.post(url, payload);

      this.logger.log(`Webhook respondeu com status: ${response.status}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Erro ao enviar POST para webhook ${url}: ${error.message}`,
        error.stack,
      );

      // Se for erro de rede ou timeout, logar detalhes
      if (error.code === 'ECONNREFUSED') {
        this.logger.error(`Conexão recusada para ${url}. Verifique se o n8n está rodando.`);
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        this.logger.error(`Timeout ao chamar ${url}. Webhook demorou mais de ${this.timeout}ms.`);
      }

      // Não fazer throw para não quebrar o fluxo da aplicação
      // O webhook é best-effort
      return null;
    }
  }

  /**
   * Helper para sleep (usado no retry)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
