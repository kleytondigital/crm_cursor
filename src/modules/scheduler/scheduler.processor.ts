import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { N8nService } from '@/shared/n8n/n8n.service';
import { ConfigService } from '@nestjs/config';
import {
  ScheduledMessageStatus,
  ScheduledContentType,
  CampaignStatus,
} from '@prisma/client';
import { SchedulerGateway } from './scheduler.gateway';

@Processor('message-scheduler')
@Injectable()
export class SchedulerProcessor {
  private readonly logger = new Logger(SchedulerProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nService: N8nService,
    private readonly configService: ConfigService,
    private readonly schedulerGateway: SchedulerGateway,
  ) {}

  @Process('send_scheduled_message')
  async handleScheduledMessage(job: Job<{ scheduledMessageId: string }>) {
    const { scheduledMessageId } = job.data;

    this.logger.log(`Processando mensagem agendada: ${scheduledMessageId}`);

    // Buscar mensagem agendada
    const scheduledMessage = await this.prisma.scheduledMessage.findUnique({
      where: { id: scheduledMessageId },
      include: {
        lead: true,
        connection: true,
        campaign: true,
      },
    });

    if (!scheduledMessage) {
      this.logger.error(
        `Mensagem agendada não encontrada: ${scheduledMessageId}`,
      );
      return;
    }

    // Verificar se ainda está pendente
    if (scheduledMessage.status !== ScheduledMessageStatus.PENDING) {
      this.logger.warn(
        `Mensagem agendada já processada: ${scheduledMessageId} (status: ${scheduledMessage.status})`,
      );
      return;
    }

    try {
      // Verificar se a conexão ainda está ativa
      if (scheduledMessage.connection.status !== 'ACTIVE') {
        throw new Error(
          `Conexão ${scheduledMessage.connection.id} não está ativa`,
        );
      }

      // Buscar ou criar conversa
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          leadId: scheduledMessage.leadId,
          tenantId: scheduledMessage.tenantId,
        },
      });

      if (!conversation) {
        // Criar conversa se não existir
        conversation = await this.prisma.conversation.create({
          data: {
            leadId: scheduledMessage.leadId,
            tenantId: scheduledMessage.tenantId,
            status: 'ACTIVE',
          },
        });
      } else if (conversation.status === 'CLOSED') {
        // Reabrir conversa se estiver fechada
        await this.prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            status: 'ACTIVE',
          },
        });
        conversation.status = 'ACTIVE';
      }

      // Preparar payload para N8N
      const payload = {
        session: scheduledMessage.connection.sessionName,
        phone: scheduledMessage.lead.phone,
        type: this.mapContentTypeToWebhook(scheduledMessage.contentType),
        text:
          scheduledMessage.contentType === ScheduledContentType.TEXT
            ? scheduledMessage.content ?? ''
            : scheduledMessage.caption ?? undefined,
        url: this.buildAbsoluteMediaUrl(scheduledMessage.content),
        mimetype: this.resolveMimeType(
          scheduledMessage.contentType,
          scheduledMessage.content,
        ),
        filename:
          scheduledMessage.contentType !== ScheduledContentType.TEXT
            ? this.extractFilename(scheduledMessage.content) || undefined
            : undefined,
      };

      // Enviar mensagem via N8N
      const webhookUrl =
        this.configService.get<string>('N8N_WEBHOOK_URL_MESSAGES_SEND') ??
        this.configService.get<string>('N8N_MESSAGES_WEBHOOK_URL');

      if (!webhookUrl) {
        throw new Error('N8N_WEBHOOK_URL_MESSAGES_SEND não configurado');
      }

      await this.n8nService.postToUrl(webhookUrl, payload);

      // Mapear contentType de ScheduledContentType para ContentType do Prisma
      let messageContentType: any;
      switch (scheduledMessage.contentType) {
        case ScheduledContentType.IMAGE:
          messageContentType = 'IMAGE';
          break;
        case ScheduledContentType.AUDIO:
          messageContentType = 'AUDIO';
          break;
        case ScheduledContentType.DOCUMENT:
          messageContentType = 'DOCUMENT';
          break;
        default:
          messageContentType = 'TEXT';
      }

      // Criar mensagem no banco de dados
      const message = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'USER',
          contentType: messageContentType,
          contentText:
            scheduledMessage.contentType === ScheduledContentType.TEXT
              ? scheduledMessage.content ?? null
              : scheduledMessage.caption ?? null,
          contentUrl: scheduledMessage.content ?? null,
          tenantId: scheduledMessage.tenantId,
          connectionId: scheduledMessage.connectionId,
          leadId: scheduledMessage.leadId,
          direction: 'OUTGOING',
        },
        include: {
          conversation: {
            include: {
              lead: true,
            },
          },
        },
      });

      // Atualizar mensagem agendada
      await this.prisma.scheduledMessage.update({
        where: { id: scheduledMessageId },
        data: {
          status: ScheduledMessageStatus.SENT,
          sentAt: new Date(),
        },
      });

      // Atualizar campanha se aplicável
      if (scheduledMessage.campaignId) {
        // Verificar se todas as mensagens da campanha foram enviadas
        const pendingCount = await this.prisma.scheduledMessage.count({
          where: {
            campaignId: scheduledMessage.campaignId,
            status: ScheduledMessageStatus.PENDING,
          },
        });

        // Verificar status atual da campanha
        const campaign = await this.prisma.campaign.findUnique({
          where: { id: scheduledMessage.campaignId },
        });

        if (pendingCount === 0) {
          // Todas as mensagens foram enviadas, atualizar status da campanha
          const updatedCampaign = await this.prisma.campaign.update({
            where: { id: scheduledMessage.campaignId },
            data: {
              status: CampaignStatus.COMPLETED,
            },
            include: {
              _count: {
                select: {
                  scheduledMessages: true,
                },
              },
            },
          });

          this.logger.log(
            `Campanha ${scheduledMessage.campaignId} concluída`,
          );

          // Emitir evento de atualização da campanha
          this.schedulerGateway.emitCampaignUpdated(
            scheduledMessage.tenantId,
            updatedCampaign,
          );
        } else if (campaign && campaign.status === CampaignStatus.SCHEDULED) {
          // Primeira mensagem sendo enviada, atualizar status para RUNNING
          const updatedCampaign = await this.prisma.campaign.update({
            where: { id: scheduledMessage.campaignId },
            data: {
              status: CampaignStatus.RUNNING,
            },
            include: {
              _count: {
                select: {
                  scheduledMessages: true,
                },
              },
            },
          });

          // Emitir evento de atualização da campanha
          this.schedulerGateway.emitCampaignUpdated(
            scheduledMessage.tenantId,
            updatedCampaign,
          );
        }
      }

      this.logger.log(
        `Mensagem agendada enviada com sucesso: ${scheduledMessageId}`,
      );

      // Emitir evento via WebSocket
      this.schedulerGateway.emitScheduledMessageSent(
        scheduledMessage.tenantId,
        {
          id: scheduledMessage.id,
          leadId: scheduledMessage.leadId,
          status: ScheduledMessageStatus.SENT,
          sentAt: new Date().toISOString(),
          message: {
            id: message.id,
            conversationId: message.conversationId,
            contentText: message.contentText,
            contentUrl: message.contentUrl,
            contentType: message.contentType,
          },
        },
      );

      return message;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar mensagem agendada: ${scheduledMessageId}`,
        error.stack,
      );

      // Atualizar status para FAILED
      await this.prisma.scheduledMessage.update({
        where: { id: scheduledMessageId },
        data: {
          status: ScheduledMessageStatus.FAILED,
          errorMessage: error.message || 'Erro desconhecido',
        },
      });

      // Se houver campanha, verificar se todas falharam
      if (scheduledMessage.campaignId) {
        const successCount = await this.prisma.scheduledMessage.count({
          where: {
            campaignId: scheduledMessage.campaignId,
            status: ScheduledMessageStatus.SENT,
          },
        });

        const failedCount = await this.prisma.scheduledMessage.count({
          where: {
            campaignId: scheduledMessage.campaignId,
            status: ScheduledMessageStatus.FAILED,
          },
        });

        const totalCount = await this.prisma.scheduledMessage.count({
          where: {
            campaignId: scheduledMessage.campaignId,
          },
        });

        // Se todas as mensagens falharam, marcar campanha como cancelada
        if (failedCount === totalCount && successCount === 0) {
          const updatedCampaign = await this.prisma.campaign.update({
            where: { id: scheduledMessage.campaignId },
            data: {
              status: CampaignStatus.CANCELLED,
            },
            include: {
              _count: {
                select: {
                  scheduledMessages: true,
                },
              },
            },
          });

          // Emitir evento de atualização da campanha
          this.schedulerGateway.emitCampaignUpdated(
            scheduledMessage.tenantId,
            updatedCampaign,
          );
        }
      }

      // Emitir evento de atualização da mensagem agendada com status FAILED
      this.schedulerGateway.emitScheduledMessageUpdated(
        scheduledMessage.tenantId,
        {
          id: scheduledMessage.id,
          leadId: scheduledMessage.leadId,
          status: ScheduledMessageStatus.FAILED,
          errorMessage: error.message || 'Erro desconhecido',
        },
      );

      throw error;
    }
  }

  private mapContentTypeToWebhook(
    contentType: ScheduledContentType,
  ): string {
    switch (contentType) {
      case ScheduledContentType.IMAGE:
        return 'imagem';
      case ScheduledContentType.AUDIO:
        return 'audio';
      case ScheduledContentType.DOCUMENT:
        return 'documento';
      default:
        return 'text';
    }
  }


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

  private extractExtension(url?: string | null): string | null {
    if (!url) return null;
    const match = url.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
    return match ? match[1].toLowerCase() : null;
  }

  private extractFilename(url?: string | null): string | null {
    if (!url) return null;
    const match = url.match(/\/([^/?#]+)(?:[?#]|$)/);
    return match ? match[1] : null;
  }

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

    const baseUrl =
      (mediaBase && mediaBase.trim().length > 0 ? mediaBase : null) ??
      (appBase && appBase.trim().length > 0 ? appBase : null) ??
      (publicBase && publicBase.trim().length > 0 ? publicBase : null) ??
      'http://localhost:3000';

    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}

