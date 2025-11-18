import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { N8nApiService } from '@/shared/n8n-api/n8n-api.service';
import { CreateWorkflowTemplateDto } from './dto/create-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-template.dto';
import { CreateWorkflowInstanceDto } from './dto/create-instance.dto';
import { UpdateWorkflowInstanceDto } from './dto/update-instance.dto';
import { UserRole } from '@prisma/client';
import {
  processWorkflowTemplate,
  generateUniqueWebhookPath,
  validateRequiredVariables,
} from './helpers/variable-replacer';

interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

@Injectable()
export class WorkflowTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nApiService: N8nApiService,
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
   * Substitui variáveis, cria workflow no n8n e ativa
   */
  async instantiateTemplate(
    templateId: string,
    dto: CreateWorkflowInstanceDto,
    context: AuthContext,
  ) {
    // 1. Buscar template
    const template = await this.findOneTemplate(templateId, context);

    // 2. Validar variáveis obrigatórias
    const validation = validateRequiredVariables(
      template.variables as Record<string, any>,
      dto.config,
    );

    if (!validation.valid) {
      throw new BadRequestException(
        `Campos obrigatórios faltando: ${validation.missingFields.join(', ')}`,
      );
    }

    // 3. Gerar novo UUID para webhook path
    const newWebhookPath = generateUniqueWebhookPath();

    // 4. Processar workflow: substituir variáveis e webhook path
    const processedWorkflowData = processWorkflowTemplate(
      template.n8nWorkflowData,
      dto.config,
      newWebhookPath,
    );

    // 5. Adicionar nome personalizado ao workflow
    processedWorkflowData.name = dto.name;

    // 6. Criar workflow no n8n
    const n8nWorkflow = await this.n8nApiService.createWorkflow(
      processedWorkflowData,
    );

    // 7. Construir URL do webhook
    const webhookUrl = this.n8nApiService.buildWebhookUrl(newWebhookPath);

    // 8. Criar instância no banco
    const instance = await this.prisma.workflowInstance.create({
      data: {
        templateId: template.id,
        n8nWorkflowId: n8nWorkflow.id,
        webhookUrl,
        name: dto.name,
        config: dto.config,
        aiAgentId: dto.aiAgentId,
        tenantId: context.tenantId,
        isActive: false, // Inicia desativado, será ativado manualmente
      },
      include: {
        template: true,
        aiAgent: true,
      },
    });

    return instance;
  }

  /**
   * Ativar uma instância de workflow
   */
  async activateInstance(id: string, context: AuthContext) {
    const instance = await this.findOneInstance(id, context);

    if (!instance.n8nWorkflowId) {
      throw new BadRequestException('Workflow ainda não foi criado no n8n');
    }

    // Ativar no n8n
    await this.n8nApiService.activateWorkflow(instance.n8nWorkflowId);

    // Atualizar status no banco
    return this.prisma.workflowInstance.update({
      where: { id },
      data: { isActive: true },
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

    // Desativar no n8n
    await this.n8nApiService.deactivateWorkflow(instance.n8nWorkflowId);

    // Atualizar status no banco
    return this.prisma.workflowInstance.update({
      where: { id },
      data: { isActive: false },
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

    // Se mudar a configuração, precisa recriar o workflow no n8n
    if (dto.config && instance.n8nWorkflowId) {
      // Deletar workflow antigo
      await this.n8nApiService.deleteWorkflow(instance.n8nWorkflowId);

      // Criar novo com as novas configurações
      const workflowData = this.n8nApiService.replaceVariables(
        instance.template.n8nWorkflowData,
        dto.config,
      );

      workflowData.name = dto.name || instance.name;

      const n8nWorkflow = await this.n8nApiService.createWorkflow(workflowData);
      const webhookUrl = this.n8nApiService.extractWebhookUrl(n8nWorkflow);

      return this.prisma.workflowInstance.update({
        where: { id },
        data: {
          name: dto.name,
          config: dto.config,
          aiAgentId: dto.aiAgentId,
          n8nWorkflowId: n8nWorkflow.id,
          webhookUrl,
          isActive: false, // Desativa para reativar manualmente
        },
      });
    }

    // Se não mudar config, apenas atualizar metadados
    return this.prisma.workflowInstance.update({
      where: { id },
      data: {
        name: dto.name,
        aiAgentId: dto.aiAgentId,
      },
    });
  }

  async removeInstance(id: string, context: AuthContext) {
    const instance = await this.findOneInstance(id, context);

    // Deletar workflow no n8n se existir
    if (instance.n8nWorkflowId) {
      try {
        await this.n8nApiService.deleteWorkflow(instance.n8nWorkflowId);
      } catch (error) {
        // Continuar mesmo se falhar no n8n
        console.error('Erro ao deletar workflow no n8n:', error);
      }
    }

    // Deletar instância do banco
    await this.prisma.workflowInstance.delete({
      where: { id },
    });

    return { message: 'Instância removida com sucesso' };
  }

  // ============= HELPERS =============

}

