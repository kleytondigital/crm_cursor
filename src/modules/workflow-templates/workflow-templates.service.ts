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
      //   "workflowId": "7QFyGhRJsHMVNM9B",
      //   "webhookName": "teste-bfq182nv",
      //   "webhookPatch": "https://...webhook/bfq182nv", // URL completa do webhook (usar como webhookUrl)
      //   "agentPrompt": "...",
      //   "webhookUrl": "https://...editor/7QFyGhRJsHMVNM9B", // URL do editor (usar como webhookUrlEditor)
      //   "status": "created",
      //   "active": false
      // }
      const workflowId = workflowData.workflowId || null;
      const webhookName = workflowData.webhookName || null;
      const agentPrompt = workflowData.agentPrompt || null;
      const isActive = workflowData.active !== undefined ? workflowData.active : false;
      
      // webhookPatch: URL completa do webhook OU apenas o path
      // Exemplo: "https://controle-de-envio-n8n-webhook.y0q0vs.easypanel.host/webhook/bfq182nv"
      // OU apenas: "bfq182nv"
      const webhookPatchValue = workflowData.webhookPatch || null;
      
      // webhookUrl: URL completa do webhook para receber eventos
      // Usar webhookPatch (que é a URL do webhook) como webhookUrl
      const webhookUrl = webhookPatchValue || workflowData.webhookUrl || null;
      
      // webhookPath: extrair apenas o path do webhookPatch
      // Se for URL completa, extrair o path. Se já for path, usar diretamente
      let webhookPath = webhookPatchValue;
      if (webhookPatchValue && webhookPatchValue.startsWith('http')) {
        // Extrair apenas o path da URL (ex: /webhook/bfq182nv -> bfq182nv)
        const pathMatch = webhookPatchValue.match(/\/webhook\/([^\/\?]+)/);
        webhookPath = pathMatch ? pathMatch[1] : webhookPatchValue.split('/').pop()?.split('?')[0] || webhookPatchValue;
      }
      
      // webhookUrlEditor: URL do editor do workflow
      // Se webhookUrl (do retorno) for URL do editor, usar ele
      const webhookUrlEditor = workflowData.webhookUrlEditor || 
        (workflowData.webhookUrl && !webhookPatchValue ? workflowData.webhookUrl : null);

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
        const existingWebhooks = await this.connectionsService.getWebhooks(
          connection.id,
          tenantId,
        );

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
        const newWebhooks = [
          ...existingWebhooks.map((hook: any) => ({
            url: hook.url,
            events: hook.events || [],
            hmac: hook.hmac || null,
            retries: hook.retries || null,
            customHeaders: hook.customHeaders || null,
          })),
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

