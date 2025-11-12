import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateScheduledMessageDto } from './dto/create-scheduled-message.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  ScheduledMessageStatus,
  ScheduledContentType,
  CampaignStatus,
  LeadStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';

interface AuthContext {
  userId: string;
  companyId: string;
  role: string;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('message-scheduler') private readonly schedulerQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async scheduleMessage(
    dto: CreateScheduledMessageDto,
    context: AuthContext,
  ) {
    // Validar lead
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: dto.leadId,
        tenantId: context.companyId,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    // Buscar conexão - se não fornecida, buscar da conversa ou primeira conexão ativa
    let connection;
    if (dto.connectionId) {
      connection = await this.prisma.connection.findFirst({
        where: {
          id: dto.connectionId,
          tenantId: context.companyId,
          status: 'ACTIVE',
        },
      });

      if (!connection) {
        throw new NotFoundException('Conexão não encontrada ou inativa');
      }
    } else {
      // Buscar conexão da conversa ou primeira conexão ativa do tenant
      if (dto.conversationId) {
        const conversation = await this.prisma.conversation.findFirst({
          where: {
            id: dto.conversationId,
            tenantId: context.companyId,
          },
          include: {
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                connection: true,
              },
            },
          },
        });

        if (conversation?.messages[0]?.connection) {
          connection = conversation.messages[0].connection;
        }
      }

      // Se ainda não encontrou conexão, buscar primeira conexão ativa
      if (!connection) {
        connection = await this.prisma.connection.findFirst({
          where: {
            tenantId: context.companyId,
            status: 'ACTIVE',
          },
        });
      }

      if (!connection) {
        throw new NotFoundException('Nenhuma conexão ativa encontrada');
      }
    }

    // Validar data/hora
    const scheduledFor = new Date(dto.scheduledFor);
    const now = new Date();

    if (scheduledFor <= now) {
      throw new BadRequestException(
        'A data/hora de agendamento deve ser no futuro',
      );
    }

    // Criar agendamento
    const scheduledMessage = await this.prisma.scheduledMessage.create({
      data: {
        tenantId: context.companyId,
        leadId: dto.leadId,
        connectionId: connection.id,
        userId: context.userId,
        departmentId: dto.departmentId,
        contentType: dto.contentType,
        content: dto.content,
        caption: dto.caption,
        scheduledFor: scheduledFor,
        status: ScheduledMessageStatus.PENDING,
      },
      include: {
        lead: true,
        connection: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calcular delay em milissegundos
    const delay = scheduledFor.getTime() - now.getTime();

    // Adicionar à fila BullMQ
    await this.schedulerQueue.add(
      'send_scheduled_message',
      {
        scheduledMessageId: scheduledMessage.id,
      },
      {
        delay: delay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(
      `Mensagem agendada: ${scheduledMessage.id} para ${scheduledFor.toISOString()}`,
    );

    return scheduledMessage;
  }

  async cancelMessage(id: string, context: AuthContext) {
    const message = await this.prisma.scheduledMessage.findFirst({
      where: {
        id: id,
        tenantId: context.companyId,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem agendada não encontrada');
    }

    // Verificar permissões
    if (message.userId !== context.userId && context.role !== 'ADMIN' && context.role !== 'MANAGER') {
      throw new ForbiddenException(
        'Você não tem permissão para cancelar esta mensagem',
      );
    }

    if (message.status !== ScheduledMessageStatus.PENDING) {
      throw new BadRequestException(
        'Apenas mensagens pendentes podem ser canceladas',
      );
    }

    // Cancelar mensagem
    const cancelled = await this.prisma.scheduledMessage.update({
      where: { id: id },
      data: {
        status: ScheduledMessageStatus.CANCELLED,
      },
    });

    // Remover job da fila (se ainda não foi processado)
    const jobs = await this.schedulerQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (job.data.scheduledMessageId === id) {
        await job.remove();
        this.logger.log(`Job removido da fila: ${id}`);
      }
    }

    return cancelled;
  }

  async createCampaign(dto: CreateCampaignDto, context: AuthContext) {
    // Validar conexão (se fornecida)
    if (dto.connectionId) {
      const connection = await this.prisma.connection.findFirst({
        where: {
          id: dto.connectionId,
          tenantId: context.companyId,
          status: 'ACTIVE',
        },
      });

      if (!connection) {
        throw new NotFoundException('Conexão não encontrada ou inativa');
      }
    }

    // Validar data/hora
    const scheduledFor = new Date(dto.scheduledFor);
    const now = new Date();

    if (scheduledFor <= now) {
      throw new BadRequestException(
        'A data/hora de agendamento deve ser no futuro',
      );
    }

    // Buscar leads filtrados
    const leads = await this.findLeadsForCampaign(
      context.companyId,
      dto.filterTags || [],
      dto.filterStages || [],
    );

    if (leads.length === 0) {
      throw new BadRequestException(
        'Nenhum lead encontrado com os filtros especificados',
      );
    }

    // Buscar conexões disponíveis
    const connections = await this.prisma.connection.findMany({
      where: {
        tenantId: context.companyId,
        status: 'ACTIVE',
      },
    });

    if (connections.length === 0) {
      throw new BadRequestException(
        'Nenhuma conexão ativa encontrada para este tenant',
      );
    }

    // Criar campanha
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId: context.companyId,
        name: dto.name,
        description: dto.description,
        filterTags: dto.filterTags || [],
        filterStages: dto.filterStages || [],
        totalLeads: leads.length,
        scheduledFor: scheduledFor,
        createdById: context.userId,
        status: CampaignStatus.DRAFT,
        contentType: dto.contentType,
        content: dto.content,
        caption: dto.caption,
        connectionId: dto.connectionId || null,
        useRandomConnection: dto.useRandomConnection || false,
      },
    });

    // Criar mensagens agendadas para cada lead
    const scheduledMessages = [];

    for (const lead of leads) {
      // Selecionar conexão
      let connectionId: string;
      if (dto.useRandomConnection) {
        // Selecionar conexão aleatória
        const randomConnection =
          connections[Math.floor(Math.random() * connections.length)];
        connectionId = randomConnection.id;
      } else if (dto.connectionId) {
        connectionId = dto.connectionId;
      } else {
        // Usar primeira conexão ativa como padrão
        connectionId = connections[0].id;
      }

      const scheduledMessage = await this.prisma.scheduledMessage.create({
        data: {
          tenantId: context.companyId,
          leadId: lead.id,
          connectionId: connectionId,
          userId: context.userId,
          contentType: dto.contentType,
          content: dto.content,
          caption: dto.caption,
          scheduledFor: scheduledFor,
          status: ScheduledMessageStatus.PENDING,
          campaignId: campaign.id,
        },
      });

      scheduledMessages.push(scheduledMessage);
    }

    // Atualizar status da campanha para SCHEDULED
    await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: CampaignStatus.SCHEDULED,
      },
    });

    // Adicionar jobs à fila
    const delay = scheduledFor.getTime() - now.getTime();

    for (const message of scheduledMessages) {
      await this.schedulerQueue.add(
        'send_scheduled_message',
        {
          scheduledMessageId: message.id,
        },
        {
          delay: delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    }

    this.logger.log(
      `Campanha criada: ${campaign.id} com ${leads.length} mensagens agendadas`,
    );

    return {
      ...campaign,
      status: CampaignStatus.SCHEDULED,
      scheduledMessages: scheduledMessages.length,
    };
  }

  async runCampaignNow(campaignId: string, context: AuthContext) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        tenantId: context.companyId,
      },
      include: {
        scheduledMessages: {
          where: {
            status: ScheduledMessageStatus.PENDING,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Campanha já está em execução');
    }

    // Atualizar status para RUNNING
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.RUNNING,
      },
    });

    // Processar mensagens pendentes imediatamente
    for (const message of campaign.scheduledMessages) {
      await this.schedulerQueue.add(
        'send_scheduled_message',
        {
          scheduledMessageId: message.id,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    }

    this.logger.log(
      `Campanha ${campaignId} iniciada: ${campaign.scheduledMessages.length} mensagens processadas`,
    );

    return campaign;
  }

  async getScheduledMessages(leadId: string, context: AuthContext) {
    return this.prisma.scheduledMessage.findMany({
      where: {
        leadId: leadId,
        tenantId: context.companyId,
        status: {
          in: [ScheduledMessageStatus.PENDING, ScheduledMessageStatus.SENT],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        connection: {
          select: {
            id: true,
            name: true,
            sessionName: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    });
  }

  async getCampaigns(context: AuthContext) {
    return this.prisma.campaign.findMany({
      where: {
        tenantId: context.companyId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        connection: {
          select: {
            id: true,
            name: true,
            sessionName: true,
          },
        },
        _count: {
          select: {
            scheduledMessages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getCampaign(id: string, context: AuthContext) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: id,
        tenantId: context.companyId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        connection: {
          select: {
            id: true,
            name: true,
            sessionName: true,
          },
        },
        scheduledMessages: {
          include: {
            lead: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    return campaign;
  }

  async cancelCampaign(id: string, context: AuthContext) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: id,
        tenantId: context.companyId,
      },
      include: {
        scheduledMessages: {
          where: {
            status: ScheduledMessageStatus.PENDING,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    // Cancelar mensagens pendentes
    await this.prisma.scheduledMessage.updateMany({
      where: {
        campaignId: id,
        status: ScheduledMessageStatus.PENDING,
      },
      data: {
        status: ScheduledMessageStatus.CANCELLED,
      },
    });

    // Remover jobs da fila
    const jobs = await this.schedulerQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (
        campaign.scheduledMessages.some(
          (msg) => msg.id === job.data.scheduledMessageId,
        )
      ) {
        await job.remove();
      }
    }

    // Atualizar status da campanha
    const updated = await this.prisma.campaign.update({
      where: { id: id },
      data: {
        status: CampaignStatus.CANCELLED,
      },
    });

    this.logger.log(`Campanha cancelada: ${id}`);

    return updated;
  }

  private async findLeadsForCampaign(
    tenantId: string,
    filterTags: string[],
    filterStages: string[],
  ) {
    const where: any = {
      tenantId: tenantId,
    };

    // Filtrar por tags
    if (filterTags.length > 0) {
      where.tags = {
        hasSome: filterTags,
      };
    }

    // Filtrar por estágios
    if (filterStages.length > 0) {
      where.status = {
        in: filterStages as LeadStatus[],
      };
    }

    return this.prisma.lead.findMany({
      where: where,
    });
  }
}

