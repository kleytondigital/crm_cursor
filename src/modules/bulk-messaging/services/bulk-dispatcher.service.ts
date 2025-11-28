import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { N8nService } from '@/shared/n8n/n8n.service';
import { ConfigService } from '@nestjs/config';
import {
  BulkMessagingCampaignStatus,
  BulkMessagingRecipientStatus,
  BulkMessagingLogStatus,
  ScheduledContentType,
  ConnectionProvider,
} from '@prisma/client';

@Injectable()
export class BulkDispatcherService {
  private readonly logger = new Logger(BulkDispatcherService.name);
  private readonly activeDispatchers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nService: N8nService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Inicia o disparo de uma campanha
   */
  async startCampaign(campaignId: string): Promise<void> {
    const campaign = await this.prisma.bulkMessagingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        connection: true,
        recipients: {
          where: {
            status: BulkMessagingRecipientStatus.PENDING,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.status !== BulkMessagingCampaignStatus.READY) {
      throw new BadRequestException(
        `Campanha não está pronta para iniciar. Status atual: ${campaign.status}`,
      );
    }

    if (campaign.recipients.length === 0) {
      throw new BadRequestException('Nenhum destinatário pendente encontrado');
    }

    // Atualizar status para RUNNING
    await this.prisma.bulkMessagingCampaign.update({
      where: { id: campaignId },
      data: {
        status: BulkMessagingCampaignStatus.RUNNING,
        startedAt: new Date(),
        pausedAt: null,
      },
    });

    // Iniciar processamento assíncrono
    this.processCampaign(campaignId).catch((error) => {
      this.logger.error(
        `Erro ao processar campanha ${campaignId}: ${error.message}`,
        error.stack,
      );
      this.handleCampaignError(campaignId, error.message);
    });
  }

  /**
   * Pausa o disparo de uma campanha
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    const campaign = await this.prisma.bulkMessagingCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.status !== BulkMessagingCampaignStatus.RUNNING) {
      throw new BadRequestException(
        `Campanha não está em execução. Status atual: ${campaign.status}`,
      );
    }

    // Parar dispatcher ativo
    const timeout = this.activeDispatchers.get(campaignId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeDispatchers.delete(campaignId);
    }

    // Atualizar status
    await this.prisma.bulkMessagingCampaign.update({
      where: { id: campaignId },
      data: {
        status: BulkMessagingCampaignStatus.PAUSED,
        pausedAt: new Date(),
      },
    });

    this.logger.log(`Campanha ${campaignId} pausada`);
  }

  /**
   * Cancela o disparo de uma campanha
   */
  async cancelCampaign(campaignId: string): Promise<void> {
    const campaign = await this.prisma.bulkMessagingCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (
      campaign.status === BulkMessagingCampaignStatus.COMPLETED ||
      campaign.status === BulkMessagingCampaignStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Campanha já está ${campaign.status.toLowerCase()}`,
      );
    }

    // Parar dispatcher ativo
    const timeout = this.activeDispatchers.get(campaignId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeDispatchers.delete(campaignId);
    }

    // Atualizar status
    await this.prisma.bulkMessagingCampaign.update({
      where: { id: campaignId },
      data: {
        status: BulkMessagingCampaignStatus.CANCELLED,
      },
    });

    this.logger.log(`Campanha ${campaignId} cancelada`);
  }

  /**
   * Processa a campanha de forma assíncrona
   */
  private async processCampaign(campaignId: string): Promise<void> {
    const campaign = await this.prisma.bulkMessagingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        connection: true,
      },
    });

    if (!campaign || campaign.status !== BulkMessagingCampaignStatus.RUNNING) {
      return;
    }

    // Buscar próximos destinatários pendentes
    const recipients = await this.prisma.bulkMessagingRecipient.findMany({
      where: {
        campaignId,
        status: BulkMessagingRecipientStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 1, // Processar um por vez
      skip: campaign.lastProcessedIndex,
    });

    if (recipients.length === 0) {
      // Nenhum destinatário pendente, finalizar campanha
      await this.completeCampaign(campaignId);
      return;
    }

    const recipient = recipients[0];
    const currentIndex = campaign.lastProcessedIndex;

    try {
      // Enviar mensagem
      await this.sendMessage(campaign, recipient);

      // Atualizar destinatário como enviado
      await this.prisma.bulkMessagingRecipient.update({
        where: { id: recipient.id },
        data: {
          status: BulkMessagingRecipientStatus.SENT,
          sentAt: new Date(),
        },
      });

      // Criar log de sucesso
      await this.createLog(
        campaignId,
        recipient.id,
        recipient.number,
        recipient.name,
        BulkMessagingLogStatus.SUCCESS,
        'Mensagem enviada com sucesso',
      );

      // Atualizar contadores
      await this.prisma.bulkMessagingCampaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
          pendingCount: { decrement: 1 },
          lastProcessedIndex: currentIndex + 1,
        },
      });

      this.logger.log(
        `Campanha ${campaignId}: Mensagem enviada para ${recipient.number} (${currentIndex + 1}/${campaign.totalRecipients})`,
      );
    } catch (error: any) {
      // Atualizar destinatário como falhou
      await this.prisma.bulkMessagingRecipient.update({
        where: { id: recipient.id },
        data: {
          status: BulkMessagingRecipientStatus.FAILED,
          errorMessage: error.message,
        },
      });

      // Criar log de erro
      await this.createLog(
        campaignId,
        recipient.id,
        recipient.number,
        recipient.name,
        BulkMessagingLogStatus.FAILED,
        error.message,
      );

      // Atualizar contadores
      await this.prisma.bulkMessagingCampaign.update({
        where: { id: campaignId },
        data: {
          failedCount: { increment: 1 },
          pendingCount: { decrement: 1 },
          lastProcessedIndex: currentIndex + 1,
        },
      });

      this.logger.error(
        `Campanha ${campaignId}: Erro ao enviar para ${recipient.number}: ${error.message}`,
      );
    }

    // Agendar próximo processamento com delay
    const delay = campaign.delayBetweenNumbers;
    const timeout = setTimeout(() => {
      this.activeDispatchers.delete(campaignId);
      this.processCampaign(campaignId).catch((error) => {
        this.logger.error(
          `Erro ao processar campanha ${campaignId}: ${error.message}`,
          error.stack,
        );
        this.handleCampaignError(campaignId, error.message);
      });
    }, delay);

    this.activeDispatchers.set(campaignId, timeout);
  }

  /**
   * Envia mensagem para um destinatário
   */
  private async sendMessage(campaign: any, recipient: any): Promise<void> {
    const { connection, contentType, content, caption } = campaign;

    // Verificar se a conexão é WhatsApp (único suportado por enquanto)
    if (connection.provider !== ConnectionProvider.WHATSAPP) {
      throw new BadRequestException(
        `Provider ${connection.provider} não suportado para disparo em massa`,
      );
    }

    // Formatar número para WhatsApp (adicionar @c.us se necessário)
    const phoneNumber = recipient.number.includes('@')
      ? recipient.number
      : `${recipient.number}@c.us`;

    // Preparar payload para N8N
    const payload: any = {
      session: connection.sessionName,
      phone: phoneNumber,
      message: content || '',
    };

    // Adicionar mídia se necessário
    if (contentType !== ScheduledContentType.TEXT) {
      if (contentType === ScheduledContentType.IMAGE) {
        payload.type = 'image';
        if (caption) payload.caption = caption;
      } else if (contentType === ScheduledContentType.AUDIO) {
        payload.type = 'audio';
      } else if (contentType === ScheduledContentType.DOCUMENT) {
        payload.type = 'document';
        if (caption) payload.caption = caption;
      }

      // Se content é uma URL de mídia
      if (content && content.startsWith('http')) {
        payload.mediaUrl = content;
      }
    }

    // Obter webhook URL do N8N
    const webhookUrl =
      this.configService.get<string>('N8N_WEBHOOK_URL_MESSAGES_SEND') ??
      this.configService.get<string>('N8N_MESSAGES_WEBHOOK_URL');

    if (!webhookUrl) {
      throw new BadRequestException(
        'N8N_WEBHOOK_URL_MESSAGES_SEND não configurado',
      );
    }

    // Enviar via N8N
    await this.n8nService.postToUrl(webhookUrl, payload);
  }

  /**
   * Cria log de envio
   */
  private async createLog(
    campaignId: string,
    recipientId: string | null,
    number: string,
    name: string | null,
    status: BulkMessagingLogStatus,
    message: string | null,
  ): Promise<void> {
    await this.prisma.bulkMessagingLog.create({
      data: {
        campaignId,
        recipientId,
        number,
        name,
        status,
        message,
        errorMessage: status === BulkMessagingLogStatus.FAILED ? message : null,
      },
    });
  }

  /**
   * Finaliza a campanha
   */
  private async completeCampaign(campaignId: string): Promise<void> {
    await this.prisma.bulkMessagingCampaign.update({
      where: { id: campaignId },
      data: {
        status: BulkMessagingCampaignStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    this.activeDispatchers.delete(campaignId);
    this.logger.log(`Campanha ${campaignId} finalizada`);
  }

  /**
   * Trata erros na campanha
   */
  private async handleCampaignError(
    campaignId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.bulkMessagingCampaign.update({
      where: { id: campaignId },
      data: {
        status: BulkMessagingCampaignStatus.ERROR,
      },
    });

    this.activeDispatchers.delete(campaignId);
    this.logger.error(`Campanha ${campaignId} marcada como erro: ${errorMessage}`);
  }
}

