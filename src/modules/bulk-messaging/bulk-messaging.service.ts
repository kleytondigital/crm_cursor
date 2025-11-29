import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateBulkCampaignDto } from './dto/create-bulk-campaign.dto';
import { UpdateBulkCampaignDto } from './dto/update-bulk-campaign.dto';
import { BulkCampaignFilterDto } from './dto/bulk-campaign-filter.dto';
import { BulkLogFilterDto } from './dto/bulk-log-filter.dto';
import { ExcelProcessorService, RecipientData } from './services/excel-processor.service';
import { BulkDispatcherService } from './services/bulk-dispatcher.service';
import {
  BulkMessagingCampaignStatus,
  BulkMessagingRecipientStatus,
} from '@prisma/client';

@Injectable()
export class BulkMessagingService {
  private readonly logger = new Logger(BulkMessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly excelProcessor: ExcelProcessorService,
    private readonly dispatcher: BulkDispatcherService,
  ) {}

  /**
   * Cria uma nova campanha de disparo em massa
   */
  async create(
    dto: CreateBulkCampaignDto,
    tenantId: string,
    userId: string,
  ) {
    // Verificar se a conexão existe e pertence ao tenant
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: dto.connectionId,
        tenantId,
        status: 'ACTIVE',
      },
    });

    if (!connection) {
      throw new NotFoundException('Conexão não encontrada ou inativa');
    }

    const campaign = await this.prisma.bulkMessagingCampaign.create({
      data: {
        tenantId,
        createdById: userId,
        connectionId: dto.connectionId,
        name: dto.name,
        description: dto.description,
        contentType: dto.contentType,
        content: dto.content,
        caption: dto.caption,
        messageSequence: dto.messageSequence ? (dto.messageSequence as any) : null,
        useRandomGreeting: dto.useRandomGreeting ?? false,
        randomGreetings: dto.randomGreetings ?? [],
        delayBetweenMessages: dto.delayBetweenMessages ?? 2000,
        delayBetweenNumbers: dto.delayBetweenNumbers ?? 5000,
        status: BulkMessagingCampaignStatus.DRAFT,
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
            provider: true,
          },
        },
      },
    });

    return campaign;
  }

  /**
   * Faz upload de arquivo Excel e adiciona destinatários à campanha
   */
  async uploadRecipients(
    campaignId: string,
    file: Express.Multer.File,
    tenantId: string,
  ) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id: campaignId,
        tenantId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.status !== BulkMessagingCampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Apenas campanhas em rascunho podem receber destinatários',
      );
    }

    // Processar arquivo Excel
    const recipients = await this.excelProcessor.processFile(file);

    // Criar destinatários no banco
    const createdRecipients = await this.prisma.bulkMessagingRecipient.createMany({
      data: recipients.map((r) => ({
        campaignId,
        number: r.number,
        name: r.name,
        status: BulkMessagingRecipientStatus.PENDING,
      })),
    });

    // Atualizar contadores da campanha
    await this.prisma.bulkMessagingCampaign.update({
      where: { id: campaignId },
      data: {
        totalRecipients: { increment: createdRecipients.count },
        pendingCount: { increment: createdRecipients.count },
        status: BulkMessagingCampaignStatus.READY,
      },
    });

    this.logger.log(
      `Adicionados ${createdRecipients.count} destinatários à campanha ${campaignId}`,
    );

    return {
      success: true,
      count: createdRecipients.count,
      message: `${createdRecipients.count} contatos adicionados com sucesso`,
    };
  }

  /**
   * Lista campanhas com filtros
   */
  async list(filters: BulkCampaignFilterDto, tenantId: string) {
    const where: any = {
      tenantId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const campaigns = await this.prisma.bulkMessagingCampaign.findMany({
      where,
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
            provider: true,
          },
        },
        _count: {
          select: {
            recipients: true,
            logs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return campaigns;
  }

  /**
   * Busca uma campanha por ID
   */
  async findOne(id: string, tenantId: string) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id,
        tenantId,
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
            provider: true,
            status: true,
          },
        },
        _count: {
          select: {
            recipients: true,
            logs: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    return campaign;
  }

  /**
   * Atualiza uma campanha
   */
  async update(
    id: string,
    dto: UpdateBulkCampaignDto,
    tenantId: string,
  ) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.status !== BulkMessagingCampaignStatus.DRAFT) {
      throw new BadRequestException(
        'Apenas campanhas em rascunho podem ser editadas',
      );
    }

    // Se connectionId foi alterado, verificar se existe
    if (dto.connectionId) {
      const connection = await this.prisma.connection.findFirst({
        where: {
          id: dto.connectionId,
          tenantId,
          status: 'ACTIVE',
        },
      });

      if (!connection) {
        throw new NotFoundException('Conexão não encontrada ou inativa');
      }
    }

    // Preparar dados para atualização
    const updateData: any = { ...dto };
    
    // Processar campos especiais
    if (dto.messageSequence !== undefined) {
      updateData.messageSequence = dto.messageSequence ? (dto.messageSequence as any) : null;
    }
    if (dto.randomGreetings !== undefined) {
      updateData.randomGreetings = dto.randomGreetings || [];
    }

    const updated = await this.prisma.bulkMessagingCampaign.update({
      where: { id },
      data: updateData,
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
            provider: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Remove uma campanha
   */
  async remove(id: string, tenantId: string) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (
      campaign.status === BulkMessagingCampaignStatus.RUNNING ||
      campaign.status === BulkMessagingCampaignStatus.PAUSED
    ) {
      throw new BadRequestException(
        'Não é possível remover uma campanha em execução ou pausada. Cancele-a primeiro.',
      );
    }

    await this.prisma.bulkMessagingCampaign.delete({
      where: { id },
    });

    return { success: true, message: 'Campanha removida com sucesso' };
  }

  /**
   * Inicia o disparo de uma campanha
   */
  async start(id: string, tenantId: string) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    await this.dispatcher.startCampaign(id);
    return { success: true, message: 'Campanha iniciada com sucesso' };
  }

  /**
   * Pausa o disparo de uma campanha
   */
  async pause(id: string, tenantId: string) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    await this.dispatcher.pauseCampaign(id);
    return { success: true, message: 'Campanha pausada com sucesso' };
  }

  /**
   * Cancela o disparo de uma campanha
   */
  async cancel(id: string, tenantId: string) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    await this.dispatcher.cancelCampaign(id);
    return { success: true, message: 'Campanha cancelada com sucesso' };
  }

  /**
   * Lista destinatários de uma campanha
   */
  async listRecipients(campaignId: string, tenantId: string) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id: campaignId,
        tenantId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    const recipients = await this.prisma.bulkMessagingRecipient.findMany({
      where: {
        campaignId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return recipients;
  }

  /**
   * Lista logs de uma campanha
   */
  async listLogs(campaignId: string, filters: BulkLogFilterDto, tenantId: string) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id: campaignId,
        tenantId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    const where: any = {
      campaignId,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.OR = [
        { number: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const logs = await this.prisma.bulkMessagingLog.findMany({
      where,
      include: {
        recipient: {
          select: {
            id: true,
            number: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1000, // Limitar a 1000 logs por vez
    });

    return logs;
  }

  /**
   * Retoma uma campanha pausada
   */
  async resume(id: string, tenantId: string) {
    const campaign = await this.prisma.bulkMessagingCampaign.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.status !== BulkMessagingCampaignStatus.PAUSED) {
      throw new BadRequestException(
        'Apenas campanhas pausadas podem ser retomadas',
      );
    }

    await this.dispatcher.resumeCampaign(id);
    return { success: true, message: 'Campanha retomada com sucesso' };
  }
}

