import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { N8nApiService } from '@/shared/n8n-api/n8n-api.service';
import { N8nService } from '@/shared/n8n/n8n.service';
import { CreateWorkflowTemplateDto } from './dto/create-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-template.dto';
import { CreateWorkflowInstanceDto } from './dto/create-instance.dto';
import { UpdateWorkflowInstanceDto } from './dto/update-instance.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UserRole } from '@prisma/client';
import {
  processWorkflowTemplate,
} from './helpers/variable-replacer';
import { ConnectionsService } from '@/modules/connections/connections.service';

interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

@Injectable()
export class WorkflowTemplatesService {
  private readonly logger = new Logger(WorkflowTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nApiService: N8nApiService,
    private readonly n8nService: N8nService,
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
  ) {}

  // ============= TEMPLATES (Super Admin) =============

  async createTemplate(dto: CreateWorkflowTemplateDto, context: AuthContext) {
    // Apenas SUPER_ADMIN pode criar templates globais
    if (dto.isGlobal !== false && context.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Apenas Super Admin pode criar templates globais');
    }

    return this.prisma.workflowTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        n8nWorkflowData: dto.n8nWorkflowData,
        variables: dto.variables,
        icon: dto.icon,
        isGlobal: dto.isGlobal ?? true,
        tenantId: dto.isGlobal === false ? context.tenantId : null,
      },
    });
  }

  async findAllTemplates(context: AuthContext, category?: string) {
    const where: any = {
      isActive: true,
      OR: [
        { isGlobal: true }, // Templates globais (Super Admin)
        { tenantId: context.tenantId }, // Templates específicos do tenant
      ],
    };

    if (category) {
      where.category = category;
    }

    return this.prisma.workflowTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        icon: true,
        isGlobal: true,
        variables: true, // Expor variáveis para o frontend saber quais campos mostrar
        createdAt: true,
        // Não expor n8nWorkflowData completo na listagem
      },
    });
  }

  async findOneTemplate(id: string, context: AuthContext) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: {
        id,
        isActive: true,
        OR: [
          { isGlobal: true },
          { tenantId: context.tenantId },
        ],
      },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    return template;
  }

  async updateTemplate(
    id: string,
    dto: UpdateWorkflowTemplateDto,
    context: AuthContext,
  ) {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    // Super Admin pode editar qualquer template
    // Tenants só podem editar seus próprios templates
    if (
      context.role !== UserRole.SUPER_ADMIN &&
      template.tenantId !== context.tenantId
    ) {
      throw new ForbiddenException('Você não tem permissão para editar este template');
    }

    return this.prisma.workflowTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        n8nWorkflowData: dto.n8nWorkflowData,
        variables: dto.variables,
        icon: dto.icon,
      },
    });
  }

  async removeTemplate(id: string, context: AuthContext) {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    if (
      context.role !== UserRole.SUPER_ADMIN &&
      template.tenantId !== context.tenantId
    ) {
      throw new ForbiddenException('Você não tem permissão para remover este template');
    }

    // Desativar ao invés de deletar
    return this.prisma.workflowTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============= INSTANCES (Tenant Admin) =============

  /**
   * Criar instância de workflow a partir de um template
   * Envia requisição para webhook gestor do n8n que criará o workflow
   * Não faz validação de variáveis obrigatórias - apenas cria com os dados fornecidos
   */
  async instantiateTemplate(
    templateId: string,
    dto: CreateWorkflowInstanceDto,
    context: AuthContext,
  ) {
    // 1. Buscar template
    const template = await this.findOneTemplate(templateId, context);

    // 2. Processar workflow substituindo variáveis do CRM por valores fornecidos
    // Isso substitui {@variavel} pelos valores em dto.config
    const processedWorkflow = processWorkflowTemplate(
      template.n8nWorkflowData as any,
      dto.config || {},
    );

    // 3. Chamar webhook gestor para criar workflow
    // O webhook gestor receberá o JSON do workflow processado e as variáveis
    // Na resposta retornará: webhookId, webhookName, agentPrompt
    let workflowData;
    try {
      workflowData = await this.n8nApiService.createWorkflowViaManager(
        context.tenantId,
        template.name, // templateName usado pelo gestor para identificar qual template usar
        dto.name, // automationName
        processedWorkflow, // JSON do workflow processado (com variáveis substituídas)
        dto.config, // variables (valores das variáveis para referência)
      );
    } catch (error: any) {
      throw new BadRequestException(
        `Erro ao criar workflow no n8n: ${error.message || 'Erro desconhecido'}`,
      );
    }

    // 4. Criar instância no banco com dados retornados pelo webhook gestor
    // A resposta do webhook deve conter: workflowId, webhookName, webhookPatch, agentPrompt, webhookUrl, webhookUrlEditor
    try {
      // Extrair dados da resposta do webhook
      // Formato retornado pelo webhook gestor:
      // {
      //   "workflowId": "hXaxXEOIQzbzNCir",
      //   "webhookName": "teste-wth1jzeo",
      //   "webhookPatch": "wth1jzeo", // Apenas o path
      //   "agentPrompt": "PROMPT FINAL (System Prompt):",
      //   "webhookUrl": "https://controle-de-envio-n8n-webhook.y0q0vs.easypanel.host/webhook/wth1jzeo", // URL completa do webhook
      //   "webhookUrlEditor": "https://controle-de-envio-n8n-editor.y0q0vs.easypanel.host/workflow/hXaxXEOIQzbzNCir", // URL do editor
      //   "status": "created",
      //   "active": false
      // }
      const workflowId = workflowData.workflowId || null;
      const webhookName = workflowData.webhookName || null;
      const agentPrompt = workflowData.agentPrompt || null;
      const isActive = workflowData.active !== undefined ? workflowData.active : false;
      
      // webhookUrl: URL completa do webhook para receber eventos (SEMPRE usar o webhookUrl do retorno)
      // Exemplo: "https://controle-de-envio-n8n-webhook.y0q0vs.easypanel.host/webhook/wth1jzeo"
      const webhookUrl = workflowData.webhookUrl || null;
      
      // webhookPatch: pode ser apenas o path (ex: "wth1jzeo") ou URL completa
      const webhookPatchValue = workflowData.webhookPatch || null;
      
      // webhookPath: extrair apenas o path do webhookUrl ou webhookPatch
      // Se webhookPatch for apenas path, usar ele. Se webhookUrl estiver disponível, extrair o path dele
      let webhookPath = webhookPatchValue;
      if (webhookUrl && webhookUrl.startsWith('http')) {
        // Extrair apenas o path da URL (ex: /webhook/wth1jzeo -> wth1jzeo)
        const pathMatch = webhookUrl.match(/\/webhook\/([^\/\?]+)/);
        webhookPath = pathMatch ? pathMatch[1] : webhookUrl.split('/').pop()?.split('?')[0] || webhookPatchValue;
      } else if (webhookPatchValue && webhookPatchValue.startsWith('http')) {
        // Se webhookPatch for URL completa, extrair o path
        const pathMatch = webhookPatchValue.match(/\/webhook\/([^\/\?]+)/);
        webhookPath = pathMatch ? pathMatch[1] : webhookPatchValue.split('/').pop()?.split('?')[0] || webhookPatchValue;
      }
      
      // webhookUrlEditor: URL do editor do workflow
      const webhookUrlEditor = workflowData.webhookUrlEditor || null;

      const instance = await this.prisma.workflowInstance.create({
        data: {
          templateId: template.id,
          n8nWorkflowId: workflowId, // workflowId retornado pelo webhook
          webhookUrl: webhookUrl, // URL do webhook para receber eventos
          webhookName: webhookName, // Nome do webhook
          webhookPath: webhookPath, // Path do webhook
          webhookUrlEditor: webhookUrlEditor, // URL do editor do workflow
          name: dto.name,
          config: dto.config,
          generatedPrompt: agentPrompt, // agentPrompt retornado pelo webhook
          aiAgentId: dto.aiAgentId,
          tenantId: context.tenantId,
          isActive: isActive, // Status retornado pelo webhook gestor
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true,
              icon: true,
            },
          },
          aiAgent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 5. Adicionar webhook do workflow na conexão do WhatsApp (se houver webhookUrl e conexões ativas)
      if (webhookUrl && instance) {
        try {
          await this.addWorkflowWebhookToConnections(
            context.tenantId,
            webhookUrl,
            instance.id,
          );
        } catch (error: any) {
          // Logar erro mas não falhar - o workflow foi criado com sucesso
          this.logger.warn(
            `Erro ao adicionar webhook do workflow na conexão: ${error.message}`,
          );
        }
      }

      return instance;
    } catch (error: any) {
      // Se falhar ao salvar no banco, tentar deletar o workflow criado no n8n
      const webhookIdToDelete = workflowData?.workflowId;
      if (webhookIdToDelete) {
        try {
          await this.n8nApiService.deleteWorkflowViaManager(
            context.tenantId,
            webhookIdToDelete,
          );
        } catch (deleteError) {
          // Logar erro mas não falhar (workflow pode ser deletado manualmente)
          console.error('Erro ao deletar workflow criado no n8n após falha ao salvar no banco:', deleteError);
        }
      }
      throw new BadRequestException(
        `Erro ao salvar instância no banco de dados: ${error.message || 'Erro desconhecido'}`,
      );
    }
  }

  /**
   * Ativar uma instância de workflow
   */
  async activateInstance(id: string, context: AuthContext) {
    const instance = await this.findOneInstance(id, context);

    if (!instance.n8nWorkflowId) {
      throw new BadRequestException('Workflow ainda não foi criado no n8n');
    }

    // Ativar via webhook gestor
    let workflowData;
    try {
      workflowData = await this.n8nApiService.activateWorkflowViaManager(
        context.tenantId,
        instance.n8nWorkflowId,
      );
    } catch (error: any) {
      throw new BadRequestException(
        `Erro ao ativar workflow no n8n: ${error.message || 'Erro desconhecido'}`,
      );
    }

    // Atualizar status no banco com o status retornado pelo n8n (sincronização)
    return this.prisma.workflowInstance.update({
      where: { id },
      data: { 
        isActive: workflowData.active !== undefined ? workflowData.active : true, // Usar status do n8n
      },
    });
  }

  /**
   * Desativar uma instância de workflow
   */
  async deactivateInstance(id: string, context: AuthContext) {
    const instance = await this.findOneInstance(id, context);

    if (!instance.n8nWorkflowId) {
      throw new BadRequestException('Workflow ainda não foi criado no n8n');
    }

    // Desativar via webhook gestor
    let workflowData;
    try {
      workflowData = await this.n8nApiService.deactivateWorkflowViaManager(
        context.tenantId,
        instance.n8nWorkflowId,
      );
    } catch (error: any) {
      throw new BadRequestException(
        `Erro ao desativar workflow no n8n: ${error.message || 'Erro desconhecido'}`,
      );
    }

    // Atualizar status no banco com o status retornado pelo n8n (sincronização)
    return this.prisma.workflowInstance.update({
      where: { id },
      data: { 
        isActive: workflowData.active !== undefined ? workflowData.active : false, // Usar status do n8n
      },
    });
  }

  async findAllInstances(context: AuthContext) {
    return this.prisma.workflowInstance.findMany({
      where: {
        tenantId: context.tenantId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            icon: true,
          },
        },
        aiAgent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findOneInstance(id: string, context: AuthContext) {
    const instance = await this.prisma.workflowInstance.findFirst({
      where: {
        id,
        tenantId: context.tenantId,
      },
      include: {
        template: true,
        aiAgent: true,
      },
    });

    if (!instance) {
      throw new NotFoundException('Instância de workflow não encontrada');
    }

    return instance;
  }

  async updateInstance(
    id: string,
    dto: UpdateWorkflowInstanceDto,
    context: AuthContext,
  ) {
    const instance = await this.findOneInstance(id, context);

    // Se mudar a configuração, atualizar via webhook gestor
    if (dto.config && instance.n8nWorkflowId) {
      // Processar workflow substituindo variáveis do CRM por valores fornecidos
      const template = await this.findOneTemplate(instance.templateId, context);
      const processedWorkflow = processWorkflowTemplate(
        template.n8nWorkflowData as any,
        dto.config || {},
      );

      // Atualizar workflow via webhook gestor
      let workflowData;
      try {
        workflowData = await this.n8nApiService.updateWorkflowViaManager(
          context.tenantId,
          instance.n8nWorkflowId,
          processedWorkflow, // JSON do workflow processado
          dto.config, // Valores das variáveis para referência
          dto.name,
        );
      } catch (error: any) {
        throw new BadRequestException(
          `Erro ao atualizar workflow no n8n: ${error.message || 'Erro desconhecido'}`,
        );
      }

      // Atualizar instância no banco com status do n8n
      return this.prisma.workflowInstance.update({
        where: { id },
        data: {
          name: dto.name || instance.name,
          config: dto.config,
          aiAgentId: dto.aiAgentId,
          // Se atualizar config, desativa para reativar manualmente (melhor prática)
          // Mas mantém o status retornado pelo n8n se fornecido
          isActive: workflowData.active !== undefined ? workflowData.active : false,
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true,
              icon: true,
            },
          },
          aiAgent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    // Se não mudar config, apenas atualizar metadados
    return this.prisma.workflowInstance.update({
      where: { id },
      data: {
        name: dto.name || instance.name,
        aiAgentId: dto.aiAgentId !== undefined ? dto.aiAgentId : instance.aiAgentId,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            icon: true,
          },
        },
        aiAgent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async removeInstance(id: string, context: AuthContext) {
    const instance = await this.findOneInstance(id, context);

    // Deletar workflow via webhook gestor se existir
    if (instance.n8nWorkflowId) {
      try {
        await this.n8nApiService.deleteWorkflowViaManager(
          context.tenantId,
          instance.n8nWorkflowId,
        );
      } catch (error: any) {
        // Logar erro mas continuar com deleção no banco
        // O workflow pode ser deletado manualmente no n8n se necessário
        console.error(`Erro ao deletar workflow no n8n (workflowId: ${instance.n8nWorkflowId}):`, error.message);
        // Não fazer throw - permitir deleção no banco mesmo se falhar no n8n
      }
    }

    // Deletar instância do banco
    try {
      await this.prisma.workflowInstance.delete({
        where: { id },
      });

      return { message: 'Instância removida com sucesso' };
    } catch (error: any) {
      throw new BadRequestException(
        `Erro ao remover instância do banco de dados: ${error.message || 'Erro desconhecido'}`,
      );
    }
  }

  // ============= WEBHOOK CONNECTION =============

  /**
   * Adiciona o webhook do workflow nas conexões ativas do WhatsApp
   * Usa a lógica das conexões para adicionar o webhook com event "message.any"
   */
  private async addWorkflowWebhookToConnections(
    tenantId: string,
    webhookUrl: string,
    workflowInstanceId: string,
  ) {
    // Buscar todas as conexões ativas do tenant
    const connections = await this.prisma.connection.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
    });

    if (connections.length === 0) {
      this.logger.log(
        `Nenhuma conexão ativa encontrada para o tenant ${tenantId}. Webhook não será adicionado.`,
      );
      return;
    }

    // Para cada conexão ativa, adicionar o webhook do workflow
    for (const connection of connections) {
      try {
        // Buscar webhooks existentes da conexão
        const webhooksResponse = await this.connectionsService.getWebhooks(
          connection.id,
          tenantId,
        );
        
        // Extrair array de webhooks do formato retornado
        let existingWebhooks: any[] = [];
        if (Array.isArray(webhooksResponse) && webhooksResponse.length > 0) {
          const firstItem = webhooksResponse[0];
          if (firstItem && Array.isArray(firstItem.webhooks)) {
            existingWebhooks = firstItem.webhooks;
          } else if (Array.isArray(firstItem) || (typeof firstItem === 'object' && firstItem.url)) {
            existingWebhooks = Array.isArray(firstItem) ? firstItem : [firstItem];
          }
        } else if (Array.isArray(webhooksResponse)) {
          existingWebhooks = webhooksResponse;
        }

        // Verificar se o webhook já existe
        const webhookExists = existingWebhooks.some(
          (hook: any) => hook.url === webhookUrl,
        );

        if (webhookExists) {
          this.logger.log(
            `Webhook ${webhookUrl} já existe na conexão ${connection.name}`,
          );
          continue;
        }

        // Adicionar o novo webhook com event "message.any"
        // Filtrar webhooks existentes que têm URL válida e mapear para o formato correto
        const validExistingWebhooks = existingWebhooks
          .filter((hook: any) => hook && hook.url && typeof hook.url === 'string' && hook.url.trim())
          .map((hook: any) => ({
            url: hook.url,
            events: hook.events || [],
            hmac: hook.hmac || null,
            retries: hook.retries || null,
            customHeaders: hook.customHeaders || null,
          }));

        // Validar webhookUrl antes de adicionar
        if (!webhookUrl || !webhookUrl.trim()) {
          this.logger.warn(
            `Webhook URL inválida para workflow ${workflowInstanceId}. Pulando adição na conexão ${connection.name}.`,
          );
          continue;
        }

        // Adicionar o novo webhook
        const newWebhooks = [
          ...validExistingWebhooks,
          {
            url: webhookUrl,
            events: ['message.any'],
            hmac: null,
            retries: null,
            customHeaders: null,
          },
        ];

        // Atualizar webhooks da conexão
        await this.connectionsService.updateWebhooks(connection.id, tenantId, {
          webhooks: newWebhooks,
        });

        this.logger.log(
          `Webhook do workflow ${workflowInstanceId} adicionado na conexão ${connection.name}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Erro ao adicionar webhook na conexão ${connection.name}: ${error.message}`,
        );
        // Continuar para próxima conexão mesmo se houver erro
      }
    }
  }

  // ============= CONNECTION MANAGEMENT =============

  /**
   * Listar conexões conectadas a uma instância de workflow
   */
  async getConnectionsForInstance(
    instanceId: string,
    context: AuthContext,
  ): Promise<any[]> {
    const instance = await this.findOneInstance(instanceId, context);

    if (!instance.webhookUrl) {
      return [];
    }

    // Buscar todas as conexões ativas do tenant
    const connections = await this.prisma.connection.findMany({
      where: {
        tenantId: context.tenantId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        sessionName: true,
        status: true,
      },
    });

    // Para cada conexão, verificar se o webhook da instância está configurado
    const connectedConnections = [];
    for (const connection of connections) {
      try {
        const webhooksResponse = await this.connectionsService.getWebhooks(
          connection.id,
          context.tenantId,
        );
        
        // Extrair array de webhooks do formato retornado
        // Formato: [{ id: "...", webhooks: [...] }] ou array direto de webhooks
        let webhooksArray: any[] = [];
        
        if (Array.isArray(webhooksResponse) && webhooksResponse.length > 0) {
          const firstItem = webhooksResponse[0];
          if (firstItem && Array.isArray(firstItem.webhooks)) {
            webhooksArray = firstItem.webhooks;
          } else if (Array.isArray(firstItem) || (typeof firstItem === 'object' && firstItem.url)) {
            // Formato alternativo: array direto de webhooks
            webhooksArray = Array.isArray(firstItem) ? firstItem : [firstItem];
          }
        } else if (Array.isArray(webhooksResponse)) {
          webhooksArray = webhooksResponse;
        }
        
        const isConnected = webhooksArray.some(
          (hook: any) => hook.url === instance.webhookUrl,
        );
        if (isConnected) {
          connectedConnections.push(connection);
        }
      } catch (error: any) {
        this.logger.warn(
          `Erro ao verificar webhooks da conexão ${connection.id}: ${error.message}`,
        );
      }
    }

    return connectedConnections;
  }

  /**
   * Wizard de ativação: Conecta instância de workflow a uma conexão específica
   * Retorna etapas detalhadas do processo para feedback visual
   */
  async connectInstanceToConnectionWithWizard(
    instanceId: string,
    connectionId: string,
    context: AuthContext,
  ): Promise<{
    success: boolean;
    steps: Array<{
      step: number;
      name: string;
      status: 'pending' | 'running' | 'success' | 'error';
      message?: string;
      details?: any;
    }>;
    error?: string;
  }> {
    const steps: Array<{
      step: number;
      name: string;
      status: 'pending' | 'running' | 'success' | 'error';
      message?: string;
      details?: any;
    }> = [];

    // Etapa 1: Validar instância
    steps.push({
      step: 1,
      name: 'Validar automação',
      status: 'running',
      message: 'Verificando automação...',
    });

    const instance = await this.findOneInstance(instanceId, context);

    if (!instance.webhookUrl) {
      steps[0].status = 'error';
      steps[0].message = 'A automação não possui webhookUrl configurado';
      return {
        success: false,
        steps,
        error: 'A automação não possui webhookUrl configurado',
      };
    }

    if (!instance.isActive) {
      steps[0].status = 'error';
      steps[0].message = 'A automação precisa estar ativa para ser conectada';
      return {
        success: false,
        steps,
        error: 'A automação precisa estar ativa para ser conectada',
      };
    }

    steps[0].status = 'success';
    steps[0].message = `Automação "${instance.name}" validada com sucesso`;
    steps[0].details = {
      instanceId: instance.id,
      instanceName: instance.name,
      webhookUrl: instance.webhookUrl,
      isActive: instance.isActive,
    };

    // Etapa 2: Validar conexão
    steps.push({
      step: 2,
      name: 'Validar conexão',
      status: 'running',
      message: 'Verificando conexão...',
    });

    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId: context.tenantId,
      },
    });

    if (!connection) {
      steps[1].status = 'error';
      steps[1].message = 'Conexão não encontrada';
      return {
        success: false,
        steps,
        error: 'Conexão não encontrada',
      };
    }

    if (connection.status !== 'ACTIVE') {
      steps[1].status = 'error';
      steps[1].message = `A conexão precisa estar ativa (status atual: ${connection.status})`;
      return {
        success: false,
        steps,
        error: 'A conexão precisa estar ativa para conectar a automação',
      };
    }

    steps[1].status = 'success';
    steps[1].message = `Conexão "${connection.name}" validada com sucesso`;
    steps[1].details = {
      connectionId: connection.id,
      connectionName: connection.name,
      sessionName: connection.sessionName,
      status: connection.status,
    };

    // Etapa 3: Buscar webhooks existentes
    steps.push({
      step: 3,
      name: 'Buscar webhooks da conexão',
      status: 'running',
      message: 'Obtendo lista de webhooks configurados...',
    });

    let existingWebhooks: any[];
    try {
      const webhooksResponse = await this.connectionsService.getWebhooks(
        connectionId,
        context.tenantId,
      );
      
      // Extrair array de webhooks do formato retornado
      // Formato retornado: [{ id: "...", pushName: "...", status: "WORKING", webhooks: [...] }]
      // Precisamos extrair o array webhooks do primeiro item
      if (Array.isArray(webhooksResponse) && webhooksResponse.length > 0) {
        const firstItem = webhooksResponse[0];
        if (firstItem && Array.isArray(firstItem.webhooks)) {
          // Formato: [{ id: "...", webhooks: [...] }]
          existingWebhooks = firstItem.webhooks;
        } else if (firstItem && typeof firstItem === 'object' && firstItem.url) {
          // Formato: [{ url: "...", events: [...] }] - array direto de webhooks
          existingWebhooks = [firstItem];
        } else if (Array.isArray(firstItem)) {
          // Formato: [[{ url: "...", events: [...] }]]
          existingWebhooks = firstItem;
        } else {
          existingWebhooks = [];
        }
      } else if (Array.isArray(webhooksResponse)) {
        // Array direto de webhooks
        existingWebhooks = webhooksResponse;
      } else {
        existingWebhooks = [];
      }
    } catch (error: any) {
      steps[2].status = 'error';
      steps[2].message = `Erro ao buscar webhooks: ${error.message}`;
      return {
        success: false,
        steps,
        error: `Erro ao buscar webhooks: ${error.message}`,
      };
    }

    // Filtrar apenas webhooks válidos (com URL)
    const validExistingWebhooks = existingWebhooks.filter(
      (hook: any) => hook && hook.url && typeof hook.url === 'string' && hook.url.trim(),
    );

    // Verificar se já está conectado
    const isAlreadyConnected = validExistingWebhooks.some(
      (hook: any) => hook.url === instance.webhookUrl,
    );

    if (isAlreadyConnected) {
      steps[2].status = 'success';
      steps[2].message = 'Automação já está conectada a esta conexão';
      steps[2].details = {
        existingWebhooksCount: existingWebhooks.length,
        alreadyConnected: true,
      };
      return {
        success: true,
        steps,
      };
    }

    steps[2].status = 'success';
    steps[2].message = `${validExistingWebhooks.length} webhook(s) encontrado(s)`;
    steps[2].details = {
      existingWebhooksCount: validExistingWebhooks.length,
      alreadyConnected: false,
    };

    // Etapa 4: Adicionar webhook via WAHA
    steps.push({
      step: 4,
      name: 'Adicionar webhook à sessão WAHA',
      status: 'running',
      message: 'Enviando webhook para a sessão...',
    });

    // Preparar lista de webhooks incluindo o novo
    // Mapear webhooks existentes válidos (já filtrados e com URL)
    const mappedExistingWebhooks = validExistingWebhooks
      .filter((hook: any) => hook && hook.url && typeof hook.url === 'string' && hook.url.trim())
      .map((hook: any) => ({
        url: hook.url,
        events: hook.events || [],
        hmac: hook.hmac || null,
        retries: hook.retries || null,
        customHeaders: hook.customHeaders || null,
      }));

    // Adicionar o novo webhook se a URL for válida
    if (!instance.webhookUrl || !instance.webhookUrl.trim()) {
      steps[3].status = 'error';
      steps[3].message = 'A automação não possui webhookUrl válido';
      return {
        success: false,
        steps,
        error: 'A automação não possui webhookUrl válido',
      };
    }

    const newWebhooks = [
      ...mappedExistingWebhooks,
      {
        url: instance.webhookUrl,
        events: ['message.any'],
        hmac: null,
        retries: null,
        customHeaders: null,
      },
    ];

    try {
      await this.connectionsService.updateWebhooks(connectionId, context.tenantId, {
        webhooks: newWebhooks,
      });
    } catch (error: any) {
      steps[3].status = 'error';
      steps[3].message = `Erro ao adicionar webhook: ${error.message}`;
      steps[3].details = {
        error: error.message,
        webhookUrl: instance.webhookUrl,
      };
      return {
        success: false,
        steps,
        error: `Erro ao adicionar webhook à sessão WAHA: ${error.message}`,
      };
    }

    steps[3].status = 'success';
    steps[3].message = 'Webhook adicionado com sucesso à sessão WAHA';
    steps[3].details = {
      webhookUrl: instance.webhookUrl,
      events: ['message.any'],
      sessionName: connection.sessionName,
    };

    // Etapa 5: Verificar conexão
    steps.push({
      step: 5,
      name: 'Verificar conexão estabelecida',
      status: 'running',
      message: 'Validando se o webhook foi configurado corretamente...',
    });

    let verificationWebhooks: any[];
    try {
      const webhooksResponse = await this.connectionsService.getWebhooks(
        connectionId,
        context.tenantId,
      );
      
      // Extrair array de webhooks do formato retornado
      if (Array.isArray(webhooksResponse) && webhooksResponse.length > 0) {
        const firstItem = webhooksResponse[0];
        if (firstItem && Array.isArray(firstItem.webhooks)) {
          verificationWebhooks = firstItem.webhooks;
        } else if (Array.isArray(firstItem) || (typeof firstItem === 'object' && firstItem.url)) {
          verificationWebhooks = Array.isArray(firstItem) ? firstItem : [firstItem];
        } else {
          verificationWebhooks = [];
        }
      } else if (Array.isArray(webhooksResponse)) {
        verificationWebhooks = webhooksResponse;
      } else {
        verificationWebhooks = [];
      }
      
      const isConnected = verificationWebhooks.some(
        (hook: any) => hook.url === instance.webhookUrl,
      );

      if (!isConnected) {
        steps[4].status = 'error';
        steps[4].message = 'Webhook não foi encontrado após a adição';
        return {
          success: false,
          steps,
          error: 'Webhook não foi configurado corretamente',
        };
      }
    } catch (error: any) {
      steps[4].status = 'error';
      steps[4].message = `Erro ao verificar: ${error.message}`;
      return {
        success: false,
        steps,
        error: `Erro ao verificar conexão: ${error.message}`,
      };
    }

    steps[4].status = 'success';
    steps[4].message = 'Conexão estabelecida e verificada com sucesso';
    steps[4].details = {
      totalWebhooks: verificationWebhooks.length,
      automationWebhookConfigured: true,
    };

    this.logger.log(
      `Automação ${instanceId} conectada à conexão ${connectionId} com sucesso`,
    );

    return {
      success: true,
      steps,
    };
  }

  /**
   * Conectar instância de workflow a uma conexão específica (método simples)
   */
  async connectInstanceToConnection(
    instanceId: string,
    connectionId: string,
    context: AuthContext,
  ): Promise<{ success: boolean }> {
    const result = await this.connectInstanceToConnectionWithWizard(
      instanceId,
      connectionId,
      context,
    );

    return {
      success: result.success,
    };
  }

  /**
   * Desconectar instância de workflow de uma conexão específica
   */
  async disconnectInstanceFromConnection(
    instanceId: string,
    connectionId: string,
    context: AuthContext,
  ): Promise<{ success: boolean }> {
    const instance = await this.findOneInstance(instanceId, context);

    if (!instance.webhookUrl) {
      throw new BadRequestException(
        'A instância não possui webhookUrl configurado',
      );
    }

    // Verificar se a conexão existe e pertence ao tenant
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId: context.tenantId,
      },
    });

    if (!connection) {
      throw new NotFoundException('Conexão não encontrada');
    }

    // Buscar webhooks existentes
    const webhooksResponse = await this.connectionsService.getWebhooks(
      connectionId,
      context.tenantId,
    );
    
    // Extrair array de webhooks do formato retornado
    let existingWebhooks: any[] = [];
    if (Array.isArray(webhooksResponse) && webhooksResponse.length > 0) {
      const firstItem = webhooksResponse[0];
      if (firstItem && Array.isArray(firstItem.webhooks)) {
        existingWebhooks = firstItem.webhooks;
      } else if (Array.isArray(firstItem) || (typeof firstItem === 'object' && firstItem.url)) {
        existingWebhooks = Array.isArray(firstItem) ? firstItem : [firstItem];
      }
    } else if (Array.isArray(webhooksResponse)) {
      existingWebhooks = webhooksResponse;
    }

    // Remover webhook da instância
    const filteredWebhooks = existingWebhooks.filter(
      (hook: any) => hook.url !== instance.webhookUrl,
    );

    // Se não houve mudança, já estava desconectado
    if (filteredWebhooks.length === existingWebhooks.length) {
      return { success: true }; // Já estava desconectado
    }

    await this.connectionsService.updateWebhooks(connectionId, context.tenantId, {
      webhooks: filteredWebhooks.map((hook: any) => ({
        url: hook.url,
        events: hook.events || [],
        hmac: hook.hmac || null,
        retries: hook.retries || null,
        customHeaders: hook.customHeaders || null,
      })),
    });

    this.logger.log(
      `Automação ${instanceId} desconectada da conexão ${connectionId}`,
    );

    return { success: true };
  }

  // ============= PROMPT MANAGEMENT =============

  /**
   * Criar ou ajustar prompt do agente via webhook especialista
   */
  async createOrAdjustPrompt(
    instanceId: string,
    dto: CreatePromptDto,
    context: AuthContext,
  ): Promise<{ prompt: string; instance: any }> {
    // 1. Buscar instância e verificar permissão
    const instance = await this.findOneInstance(instanceId, context);

    // 2. Buscar template para obter variáveis
    const template = await this.findOneTemplate(instance.templateId, context);

    // 3. Preparar payload baseado no type
    let payload: any;

    if (dto.type === 'system') {
      // Criar prompt do zero a partir das variáveis
      if (!dto.variables || dto.variables.length === 0) {
        // Se não forneceu variáveis, usar config da instância
        const configEntries = Object.entries(instance.config || {});
        dto.variables = configEntries.map(([key, value]) => ({
          name: key,
          value: value,
        }));
      }

      payload = {
        type: 'system',
        variables: dto.variables,
      };
    } else if (dto.type === 'user') {
      // Ajustar prompt existente
      if (!dto.prompt_ajuste) {
        // Se não forneceu prompt_ajuste, usar prompt atual da instância
        if (!instance.generatedPrompt) {
          throw new BadRequestException(
            'Não há prompt existente para ajustar. Crie um prompt primeiro (type=system).',
          );
        }
        dto.prompt_ajuste = instance.generatedPrompt;
      }

      if (!dto.text_ajuste || !dto.text_ajuste.trim()) {
        throw new BadRequestException(
          'text_ajuste é obrigatório para type=user',
        );
      }

      payload = {
        type: 'user',
        prompt_ajuste: dto.prompt_ajuste,
        text_ajuste: dto.text_ajuste.trim(),
      };
    } else {
      throw new BadRequestException('type deve ser "system" ou "user"');
    }

    // 4. Chamar webhook especialista em criação de prompts
    let promptResult;
    try {
      promptResult = await this.n8nService.createPrompt(payload);
    } catch (error: any) {
      throw new BadRequestException(
        `Erro ao criar/ajustar prompt: ${error.message || 'Erro desconhecido'}`,
      );
    }

    if (!promptResult.prompt || !promptResult.prompt.trim()) {
      throw new BadRequestException(
        'Webhook não retornou prompt válido',
      );
    }

    // 5. Salvar prompt no banco (com isolamento de tenant)
    const updatedInstance = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        generatedPrompt: promptResult.prompt.trim(),
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            icon: true,
          },
        },
        aiAgent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      prompt: promptResult.prompt.trim(),
      instance: updatedInstance,
    };
  }

  /**
   * Atualizar prompt diretamente (edição manual)
   */
  async updatePrompt(
    instanceId: string,
    prompt: string,
    context: AuthContext,
  ): Promise<{ prompt: string; instance: any }> {
    // Verificar se a instância existe e pertence ao tenant
    const instance = await this.findOneInstance(instanceId, context);

    // Validar prompt
    if (!prompt || !prompt.trim()) {
      throw new BadRequestException('Prompt não pode estar vazio');
    }

    // Salvar prompt no banco
    const updatedInstance = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        generatedPrompt: prompt.trim(),
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            icon: true,
          },
        },
        aiAgent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      prompt: updatedInstance.generatedPrompt || '',
      instance: updatedInstance,
    };
  }

  /**
   * Obter prompt gerado da instância
   */
  async getPrompt(instanceId: string, context: AuthContext): Promise<{ prompt: string | null }> {
    const instance = await this.findOneInstance(instanceId, context);

    return {
      prompt: instance.generatedPrompt || null,
    };
  }

  /**
   * Limpar prompt gerado da instância
   */
  async clearPrompt(instanceId: string, context: AuthContext): Promise<void> {
    await this.findOneInstance(instanceId, context);

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        generatedPrompt: null,
      },
    });
  }

  // ============= HELPERS =============

}

