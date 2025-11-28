import { Body, Controller, Logger, Post, Headers, BadRequestException } from '@nestjs/common';
import { Public } from '@/shared/decorators/public.decorator';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { MessagesGateway } from '@/modules/messages/messages.gateway';
import {
  ContentType,
  Lead,
  MessageDirection,
  SenderType,
  ConnectionProvider,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AttendancesService } from '@/modules/attendances/attendances.service';
import { MinioService } from '@/shared/minio/minio.service';
import { SocialMessageNormalizerService } from './services/social-message-normalizer.service';
import * as crypto from 'crypto';

@Controller('webhooks/social')
export class SocialWebhookController {
  private readonly logger = new Logger(SocialWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesGateway: MessagesGateway,
    private readonly configService: ConfigService,
    private readonly attendancesService: AttendancesService,
    private readonly minioService: MinioService,
    private readonly normalizer: SocialMessageNormalizerService,
  ) {}

  @Public()
  @Post()
  async handleWebhook(
    @Body() body: any,
    @Headers('x-n8n-signature') signature?: string,
    @Headers('x-webhook-signature') webhookSignature?: string,
  ) {
    // Validar assinatura se configurada
    const webhookSecret = this.configService.get<string>('WEBHOOK_SOCIAL_SECRET');
    if (webhookSecret) {
      const providedSignature = signature || webhookSignature;
      if (!providedSignature || !this.validateSignature(body, providedSignature, webhookSecret)) {
        this.logger.warn('Webhook social rejeitado: assinatura inválida');
        throw new BadRequestException('Assinatura inválida');
      }
    }

    const events = Array.isArray(body) ? body : body ? [body] : [];

    if (events.length === 0) {
      this.logger.warn('Nenhum evento recebido em /webhooks/social');
      return { status: 'ok', processed: 0 };
    }

    let processed = 0;

    for (const event of events) {
      try {
        const handled = await this.processEvent(event);
        if (handled) {
          processed += 1;
        }
      } catch (error: any) {
        this.logger.error(
          `Erro ao processar evento social: ${error?.message || error}`,
          error?.stack,
        );
      }
    }

    return { status: 'ok', processed };
  }

  private async processEvent(event: any) {
    this.logger.debug(`Evento social recebido: ${JSON.stringify(event).substring(0, 500)}`);

    // Extrair tenantId e connectionId do payload
    const tenantId = event.tenantId || event.connection?.tenantId;
    const connectionId = event.connectionId || event.connection?.id;

    if (!tenantId || !connectionId) {
      this.logger.warn('Evento social sem tenantId ou connectionId');
      return false;
    }

    // Buscar conexão
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId,
        provider: {
          in: [ConnectionProvider.INSTAGRAM, ConnectionProvider.FACEBOOK],
        },
        isActive: true,
      },
    });

    if (!connection) {
      this.logger.warn(`Conexão social não encontrada: connectionId=${connectionId}, tenantId=${tenantId}`);
      return false;
    }

    // Normalizar mensagem
    const normalized = this.normalizer.normalize(event, connection);
    if (!normalized) {
      this.logger.warn('Falha ao normalizar mensagem social');
      return false;
    }

    // Verificar se mensagem já existe
    const existingMessage = await this.prisma.message.findFirst({
      where: {
        messageId: normalized.messageId,
        tenantId: connection.tenantId,
      },
    });

    if (existingMessage) {
      this.logger.log(`Mensagem já existe: messageId=${normalized.messageId}`);
      return true;
    }

    // Criar ou atualizar lead
    const lead = await this.upsertLead({
      tenantId: connection.tenantId,
      senderId: normalized.senderId,
      name: normalized.senderName || normalized.senderId,
      profilePictureURL: normalized.senderPicture || null,
    });

    // Criar ou buscar conversa
    const conversation = await this.getOrCreateConversation({
      tenantId: connection.tenantId,
      leadId: lead.id,
      connectionId: connection.id,
    });

    // Criar mensagem
    const message = await this.createMessage(normalized, lead, conversation, connection);

    // Processar mídia se houver
    if (normalized.mediaUrl && normalized.contentType !== ContentType.TEXT) {
      await this.processMedia(message, normalized, connection);
    }

    // Criar ou atualizar atendimento
    if (normalized.direction === MessageDirection.INCOMING) {
      await this.attendancesService.handleIncomingMessage({
        tenantId: connection.tenantId,
        leadId: lead.id,
        connectionId: connection.id,
        content: normalized.contentText || '',
        timestamp: normalized.timestamp,
      });
    }

    // Notificar via WebSocket
    this.messagesGateway.emitNewMessage(connection.tenantId, conversation, message);

    this.logger.log(`Mensagem social processada: messageId=${normalized.messageId}`);
    return true;
  }

  private async upsertLead({
    tenantId,
    senderId,
    name,
    profilePictureURL,
  }: {
    tenantId: string;
    senderId: string;
    name: string;
    profilePictureURL?: string | null;
  }): Promise<Lead> {
    // Para redes sociais, usar senderId como identificador único
    // Armazenar em um campo customizado ou usar phone como fallback
    // Por enquanto, vamos usar senderId como phone (formato: instagram_123456 ou facebook_123456)
    const phone = `social_${senderId}`;

    let lead = await this.prisma.lead.findFirst({
      where: {
        tenantId,
        phone,
      },
    });

    if (!lead) {
      // Buscar estágio padrão (order 0)
      const defaultPipelineStage = await this.prisma.pipelineStage.findFirst({
        where: {
          tenantId,
          order: 0,
          isActive: true,
        },
        select: {
          statusId: true,
        },
      });

      lead = await this.prisma.lead.create({
        data: {
          tenantId,
          phone,
          name,
          tags: [],
          // status removido - usar statusId
          statusId: defaultPipelineStage?.statusId || null,
          profilePictureURL: profilePictureURL || null,
          origin: 'Social Media',
        },
      });
    } else {
      const updateData: any = {};

      if (!lead.name && name) {
        updateData.name = name;
      }

      // if (profilePictureURL) { // Removido temporariamente até migration ser aplicada
      //   updateData.profilePictureURL = profilePictureURL;
      // }

      if (Object.keys(updateData).length > 0) {
        lead = await this.prisma.lead.update({
          where: { id: lead.id },
          data: updateData,
        });
      }
    }

    return lead;
  }

  private async getOrCreateConversation({
    tenantId,
    leadId,
    connectionId,
  }: {
    tenantId: string;
    leadId: string;
    connectionId: string;
  }) {
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        leadId,
        status: 'ACTIVE',
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          leadId,
          status: 'ACTIVE',
        },
      });
    }

    return conversation;
  }

  private async createMessage(
    normalized: any,
    lead: Lead,
    conversation: any,
    connection: any,
  ) {
    return this.prisma.message.create({
      data: {
        tenantId: connection.tenantId,
        conversationId: conversation.id,
        leadId: lead.id,
        connectionId: connection.id,
        messageId: normalized.messageId,
        contentText: normalized.contentText || null,
        contentType: normalized.contentType,
        senderType: normalized.senderType,
        direction: normalized.direction,
        sender: normalized.senderId,
        timestamp: normalized.timestamp,
      },
    });
  }

  private async processMedia(message: any, normalized: any, connection: any) {
    // Implementar download e upload de mídia para MinIO
    // Similar ao WahaWebhookController
    // Por enquanto, apenas logar
    this.logger.log(`Processando mídia: ${normalized.mediaUrl}`);
  }

  /**
   * Valida assinatura HMAC do webhook
   */
  private validateSignature(body: any, signature: string, secret: string): boolean {
    try {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      const hmac = crypto.createHmac('sha256', secret);
      const calculatedSignature = hmac.update(payload).digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(calculatedSignature),
      );
    } catch (error) {
      this.logger.error(`Erro ao validar assinatura: ${error}`);
      return false;
    }
  }
}

