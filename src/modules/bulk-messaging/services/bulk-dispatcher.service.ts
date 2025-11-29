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

  // Mensagens de saudação randômicas
  private readonly greetingMessages = [
    'Olá, tudo bem?',
    'Olá, pode falar?',
    'Olá, preciso falar com você',
    'Oi, tudo bem?',
    'Oi, pode falar?',
    'Olá!',
    'Oi!',
  ];

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
        lastProcessedIndex: 0, // Resetar índice ao iniciar
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
   * Retoma o disparo de uma campanha pausada
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    const campaign = await this.prisma.bulkMessagingCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.status !== BulkMessagingCampaignStatus.PAUSED) {
      throw new BadRequestException(
        `Campanha não está pausada. Status atual: ${campaign.status}`,
      );
    }

    // Atualizar status para RUNNING
    await this.prisma.bulkMessagingCampaign.update({
      where: { id: campaignId },
      data: {
        status: BulkMessagingCampaignStatus.RUNNING,
        pausedAt: null,
      },
    });

    // Retomar processamento
    this.processCampaign(campaignId).catch((error) => {
      this.logger.error(
        `Erro ao retomar campanha ${campaignId}: ${error.message}`,
        error.stack,
      );
      this.handleCampaignError(campaignId, error.message);
    });
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
    // Verificar se a campanha ainda está rodando (pode ter sido pausada/cancelada)
    const campaign = await this.prisma.bulkMessagingCampaign.findUnique({
      where: { id: campaignId },
      include: {
        connection: true,
      },
    });

    if (!campaign || campaign.status !== BulkMessagingCampaignStatus.RUNNING) {
      this.logger.log(
        `Campanha ${campaignId} não está mais em execução. Status: ${campaign?.status || 'não encontrada'}`,
      );
      return;
    }

    // Buscar PRIMEIRO destinatário pendente (sem usar skip para evitar problemas)
    const recipient = await this.prisma.bulkMessagingRecipient.findFirst({
      where: {
        campaignId,
        status: BulkMessagingRecipientStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!recipient) {
      // Nenhum destinatário pendente, finalizar campanha
      await this.completeCampaign(campaignId);
      return;
    }

    try {
      // Enviar sequência de mensagens para este destinatário
      await this.sendMessageSequence(campaign, recipient);

      // Atualizar destinatário como enviado
      await this.prisma.bulkMessagingRecipient.update({
        where: { id: recipient.id },
        data: {
          status: BulkMessagingRecipientStatus.SENT,
          sentAt: new Date(),
        },
      });

      // Atualizar contadores
      await this.prisma.bulkMessagingCampaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 },
          pendingCount: { decrement: 1 },
        },
      });

      const totalProcessed =
        campaign.totalRecipients - campaign.pendingCount + 1;
      this.logger.log(
        `Campanha ${campaignId}: Mensagem enviada para ${recipient.number} (${totalProcessed}/${campaign.totalRecipients})`,
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
        },
      });

      this.logger.error(
        `Campanha ${campaignId}: Erro ao enviar para ${recipient.number}: ${error.message}`,
      );
    }

    // Agendar próximo processamento com delay entre números
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
   * Envia sequência de mensagens para um destinatário
   * Suporta:
   * - Mensagem de saudação randômica (se habilitada)
   * - Sequência de mensagens (texto, imagem, vídeo, documento)
   * - Delays configuráveis entre mensagens
   */
  private async sendMessageSequence(campaign: any, recipient: any): Promise<void> {
    const { connection } = campaign;

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

    // 1. Enviar saudação randômica se habilitada
    if (campaign.useRandomGreeting) {
      const greeting = this.getRandomGreeting(campaign.randomGreetings);
      await this.sendSingleMessage(
        connection,
        phoneNumber,
        ScheduledContentType.TEXT,
        greeting,
        null,
      );

      // Delay após saudação
      if (campaign.delayBetweenMessages > 0) {
        await this.sleep(campaign.delayBetweenMessages);
      }
    }

    // 2. Enviar sequência de mensagens se definida
    if (campaign.messageSequence && Array.isArray(campaign.messageSequence) && campaign.messageSequence.length > 0) {
      for (const messageItem of campaign.messageSequence) {
        // Delay antes desta mensagem (se especificado)
        if (messageItem.delay && messageItem.delay > 0) {
          await this.sleep(messageItem.delay);
        }

        // Enviar mensagem da sequência
        await this.sendSingleMessage(
          connection,
          phoneNumber,
          messageItem.type,
          messageItem.content || null,
          messageItem.caption || null,
        );

        // Delay após mensagem (delay padrão da campanha)
        if (campaign.delayBetweenMessages > 0) {
          await this.sleep(campaign.delayBetweenMessages);
        }
      }
    } else {
      // 3. Se não houver sequência, enviar mensagem principal tradicional
      await this.sendSingleMessage(
        connection,
        phoneNumber,
        campaign.contentType,
        campaign.content,
        campaign.caption,
      );
    }
  }

  /**
   * Sleep utility para delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retorna uma mensagem de saudação aleatória
   * Usa lista customizada se fornecida, senão usa padrão
   */
  private getRandomGreeting(customGreetings?: string[]): string {
    const greetings = customGreetings && customGreetings.length > 0
      ? customGreetings
      : this.greetingMessages;

    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex];
  }

  /**
   * Envia uma única mensagem usando o mesmo formato do chat
   */
  private async sendSingleMessage(
    connection: any,
    phoneNumber: string,
    contentType: ScheduledContentType,
    content: string | null,
    caption: string | null,
    campaignId?: string,
    recipientId?: string,
  ): Promise<void> {
    // Mapear ScheduledContentType para o formato do webhook
    const type = this.mapContentTypeToWebhook(contentType);

    // Preparar payload no mesmo formato do chat
    const payload: any = {
      session: connection.sessionName,
      phone: phoneNumber,
      type,
    };

    // Adicionar texto se for mensagem de texto
    if (contentType === ScheduledContentType.TEXT) {
      payload.text = content || '';
    } else {
      // Para mídia, adicionar URL
      if (content && (content.startsWith('http://') || content.startsWith('https://'))) {
        payload.url = content;
      } else {
        // Construir URL absoluta
        payload.url = this.buildAbsoluteMediaUrl(content);
      }

      // Adicionar mimetype e filename
      payload.mimetype = this.resolveMimeType(contentType, content);
      payload.filename = this.extractFilename(content) || caption || undefined;

      // Para imagem e documento, adicionar caption se houver
      if (caption && (contentType === ScheduledContentType.IMAGE || contentType === ScheduledContentType.DOCUMENT)) {
        // O caption pode ser enviado como texto após a mídia, ou via outro campo
        // Dependendo de como o n8n espera receber
        payload.caption = caption;
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

    this.logger.log(
      `Mensagem enviada via bulk. session=${connection.sessionName} phone=${phoneNumber} type=${type}`,
    );
  }

  /**
   * Mapeia ScheduledContentType para formato do webhook (igual ao chat)
   */
  private mapContentTypeToWebhook(contentType: ScheduledContentType): string {
    switch (contentType) {
      case ScheduledContentType.IMAGE:
        return 'imagem';
      case ScheduledContentType.AUDIO:
        return 'audio';
      case ScheduledContentType.VIDEO:
        return 'video';
      case ScheduledContentType.DOCUMENT:
        return 'documento';
      default:
        return 'text';
    }
  }

  /**
   * Constrói URL absoluta de mídia (igual ao chat)
   */
  private buildAbsoluteMediaUrl(url?: string | null): string | null {
    if (!url) {
      return null;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const mediaBase = this.configService.get<string>('MEDIA_BASE_URL');
    const appBase = this.configService.get<string>('APP_URL');
    const publicBase = this.configService.get<string>('PUBLIC_BACKEND_URL');
    const frontendBase = this.configService.get<string>('NEXT_PUBLIC_API_URL');

    const baseUrl =
      (mediaBase && mediaBase.trim().length > 0 ? mediaBase : null) ??
      (appBase && appBase.trim().length > 0 ? appBase : null) ??
      (publicBase && publicBase.trim().length > 0 ? publicBase : null) ??
      (frontendBase && frontendBase.trim().length > 0 ? frontendBase : null) ??
      'http://localhost:3000';

    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  /**
   * Resolve tipo MIME (igual ao chat)
   */
  private resolveMimeType(
    contentType: ScheduledContentType,
    url?: string | null,
  ): string | undefined {
    const extension = url ? this.extractExtension(url) : null;

    switch (contentType) {
      case ScheduledContentType.IMAGE:
        if (extension === 'png') return 'image/png';
        if (extension === 'gif') return 'image/gif';
        if (extension === 'webp') return 'image/webp';
        return 'image/jpeg';
      case ScheduledContentType.AUDIO:
        if (extension === 'ogg') return 'audio/ogg; codecs=opus';
        if (extension === 'mp3') return 'audio/mpeg';
        if (extension === 'aac') return 'audio/aac';
        return 'audio/ogg';
      case ScheduledContentType.VIDEO:
        if (extension === 'mov') return 'video/quicktime';
        return 'video/mp4';
      case ScheduledContentType.DOCUMENT:
        if (extension === 'pdf') return 'application/pdf';
        if (extension === 'doc' || extension === 'docx') {
          return 'application/msword';
        }
        if (extension === 'xls' || extension === 'xlsx') {
          return 'application/vnd.ms-excel';
        }
        if (extension === 'ppt' || extension === 'pptx') {
          return 'application/vnd.ms-powerpoint';
        }
        if (extension === 'txt') return 'text/plain';
        return 'application/octet-stream';
      default:
        return undefined;
    }
  }

  /**
   * Extrai extensão do arquivo (igual ao chat)
   */
  private extractExtension(url: string): string | null {
    const sanitizedUrl = url.split('?')[0];
    const parts = sanitizedUrl.split('.');
    if (parts.length <= 1) {
      return null;
    }
    return parts[parts.length - 1].toLowerCase();
  }

  /**
   * Extrai nome do arquivo (igual ao chat)
   */
  private extractFilename(url?: string | null): string | undefined {
    if (!url) {
      return undefined;
    }
    const sanitizedUrl = url.split('?')[0];
    const parts = sanitizedUrl.split('/');
    return parts[parts.length - 1] || undefined;
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
        errorMessage:
          status === BulkMessagingLogStatus.FAILED ? message : null,
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
