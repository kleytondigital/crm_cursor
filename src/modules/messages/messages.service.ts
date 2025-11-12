import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import {
  ContentType,
  SenderType,
  ConversationStatus,
  MessageDirection,
} from '@prisma/client';
import { N8nService } from '@/shared/n8n/n8n.service';
import { ConfigService } from '@nestjs/config';
import { AttendancesService } from '@/modules/attendances/attendances.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly n8nService: N8nService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AttendancesService))
    private readonly attendancesService: AttendancesService,
  ) {}

  async create(createMessageDto: CreateMessageDto, tenantId: string, userId?: string, userRole?: string) {
    // Verificar se a conversa existe e pertence ao tenant
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: createMessageDto.conversationId,
        tenantId: tenantId,
      },
      include: {
        lead: true,
        assignedUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    // Verificar se a conversa está ativa (apenas para mensagens enviadas por usuários)
    // Leads podem enviar mensagens em conversas fechadas para reabrir (será tratado abaixo)
    if (createMessageDto.senderType === SenderType.USER && conversation.status === ConversationStatus.CLOSED) {
      throw new ForbiddenException('Não é possível enviar mensagens em conversas fechadas. Apenas administradores podem reabrir conversas.');
    }

    // Verificar permissões (apenas para mensagens enviadas por usuários)
    if (createMessageDto.senderType === SenderType.USER && userId) {
      // Se a conversa está atribuída a um usuário, verificar se é o usuário atribuído ou um admin
      if (conversation.assignedUserId) {
        const isAssignedUser = conversation.assignedUserId === userId;
        const isAdmin = userRole === 'ADMIN';

        if (!isAssignedUser && !isAdmin) {
          throw new ForbiddenException('Você não tem permissão para enviar mensagens nesta conversa');
        }
      }
      // Se a conversa não está atribuída, qualquer usuário do tenant pode enviar (pode ser ajustado conforme necessário)
    }

    // Se a conversa está fechada e o lead está enviando uma mensagem, reabrir a conversa
    // e remover a atribuição (volta para disponível sem atendente)
    const shouldReopen =
      conversation.status === 'CLOSED' && createMessageDto.senderType === SenderType.LEAD;

    if (shouldReopen) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'ACTIVE',
          assignedUserId: null, // Volta para disponível sem atendente
        },
      });
      // Recarregar a conversa atualizada
      conversation.status = 'ACTIVE';
      conversation.assignedUserId = null;
    }

    // Criar a mensagem
    const connection = await this.resolveConversationConnection(conversation.id, tenantId);

    const message = await this.prisma.message.create({
      data: {
        conversationId: createMessageDto.conversationId,
        senderType: createMessageDto.senderType,
        contentType: createMessageDto.contentType,
        contentUrl: createMessageDto.contentUrl,
        contentText: createMessageDto.contentText,
        tenantId: tenantId,
        connectionId: connection?.id ?? undefined,
        leadId: conversation.leadId,
        direction:
          createMessageDto.senderType === SenderType.USER
            ? MessageDirection.OUTGOING
            : MessageDirection.INCOMING,
      },
      include: {
        conversation: {
          include: {
            lead: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (createMessageDto.senderType === SenderType.USER) {
      await this.forwardMessageToN8n(message, connection ?? null);
    }

    this.handleAttendanceSync(
      message,
      tenantId,
      createMessageDto.senderType,
      userId,
    ).catch((error) =>
      this.logger.error(
        `Falha ao sincronizar atendimento: ${error?.message || error}`,
      ),
    );

    // Converter URL de mídia para URL absoluta antes de retornar
    return {
      ...message,
      contentUrl: this.buildAbsoluteMediaUrl(message.contentUrl),
    };
  }

  async findByConversation(conversationId: string, tenantId: string) {
    // Verificar se a conversa pertence ao tenant e incluir lead com profilePictureURL
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId: tenantId,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            tags: true,
            profilePictureURL: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: conversationId,
        tenantId: tenantId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Converter URLs de mídia para URLs absolutas e incluir conversa com lead
    return messages.map((message) => ({
      ...message,
      contentUrl: this.buildAbsoluteMediaUrl(message.contentUrl),
      conversation: {
        id: conversation.id,
        leadId: conversation.leadId,
        lead: conversation.lead,
        assignedUserId: conversation.assignedUserId,
        assignedUser: conversation.assignedUser,
        status: conversation.status,
        tenantId: conversation.tenantId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    }));
  }

  private async handleAttendanceSync(
    message: any,
    tenantId: string,
    senderType: SenderType,
    userId?: string,
  ) {
    if (!this.attendancesService) {
      return;
    }

    const payload = {
      tenantId,
      leadId: message.leadId,
      connectionId: message.connectionId,
      content: message.contentText,
      timestamp: message.createdAt,
    };

    if (senderType === SenderType.USER) {
      await this.attendancesService.handleOutgoingMessage({
        ...payload,
        userId,
      });
    } else {
      await this.attendancesService.handleIncomingMessage(payload);
    }
  }

  async findOne(id: string, tenantId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
      include: {
        conversation: {
          include: {
            lead: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    return message;
  }

  private async resolveConversationConnection(conversationId: string, tenantId: string) {
    return this.prisma.connection.findFirst({
      where: {
        tenantId,
        messages: {
          some: {
            conversationId,
          },
        },
      },
      select: {
        id: true,
        sessionName: true,
      },
    });
  }

  private mapContentTypeToWebhook(contentType: ContentType): string {
    switch (contentType) {
      case ContentType.IMAGE:
        return 'imagem';
      case ContentType.AUDIO:
        return 'audio';
      case ContentType.VIDEO:
        return 'video';
      case ContentType.DOCUMENT:
        return 'documento';
      default:
        return 'text';
    }
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
    const frontendBase = this.configService.get<string>('NEXT_PUBLIC_API_URL');

    const baseUrl =
      (mediaBase && mediaBase.trim().length > 0 ? mediaBase : null) ??
      (appBase && appBase.trim().length > 0 ? appBase : null) ??
      (publicBase && publicBase.trim().length > 0 ? publicBase : null) ??
      (frontendBase && frontendBase.trim().length > 0 ? frontendBase : null) ??
      'http://localhost:3000';

    return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private resolveMimeType(contentType: ContentType, url?: string | null): string | undefined {
    const extension = url ? this.extractExtension(url) : null;

    switch (contentType) {
      case ContentType.IMAGE:
        if (extension === 'png') return 'image/png';
        if (extension === 'gif') return 'image/gif';
        if (extension === 'webp') return 'image/webp';
        return 'image/jpeg';
      case ContentType.AUDIO:
        if (extension === 'ogg') return 'audio/ogg; codecs=opus';
        if (extension === 'mp3') return 'audio/mpeg';
        if (extension === 'aac') return 'audio/aac';
        return 'audio/ogg';
      case ContentType.VIDEO:
        if (extension === 'mov') return 'video/quicktime';
        return 'video/mp4';
      case ContentType.DOCUMENT:
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

  private extractExtension(url: string): string | null {
    const sanitizedUrl = url.split('?')[0];
    const parts = sanitizedUrl.split('.');
    if (parts.length <= 1) {
      return null;
    }
    return parts[parts.length - 1].toLowerCase();
  }

  private extractFilename(url?: string | null): string | undefined {
    if (!url) {
      return undefined;
    }
    const sanitizedUrl = url.split('?')[0];
    const parts = sanitizedUrl.split('/');
    return parts[parts.length - 1] || undefined;
  }

  private async forwardMessageToN8n(message: any, connection: { id: string; sessionName: string } | null) {
    try {
      if (!connection?.sessionName) {
        this.logger.warn(
          `Não foi possível enviar mensagem via N8N: sessão não encontrada para conversation=${message.conversationId}`,
        );
        return;
      }

      const conversation = message.conversation ?? (await this.prisma.conversation.findUnique({
        where: { id: message.conversationId },
        include: {
          lead: {
            select: {
              phone: true,
              name: true,
            },
          },
        },
      }));

      const leadPhone = conversation?.lead?.phone;

      if (!leadPhone) {
        this.logger.warn(
          `Não foi possível enviar mensagem via N8N: telefone do lead não encontrado para conversation=${message.conversationId}`,
        );
        return;
      }

      const payload = {
        session: connection.sessionName,
        phone: leadPhone,
        type: this.mapContentTypeToWebhook(message.contentType),
        text: message.contentType === ContentType.TEXT ? message.contentText ?? '' : undefined,
        url: this.buildAbsoluteMediaUrl(message.contentUrl),
        mimetype: this.resolveMimeType(message.contentType, message.contentUrl),
        filename:
          message.contentType === ContentType.TEXT
            ? undefined
            : message.contentText || this.extractFilename(message.contentUrl) || undefined,
      };

      const webhookUrl =
        this.configService.get<string>('N8N_WEBHOOK_URL_MESSAGES_SEND') ??
        this.configService.get<string>('N8N_MESSAGES_WEBHOOK_URL');

      if (!webhookUrl) {
        this.logger.warn('N8N_WEBHOOK_URL_MESSAGES_SEND não configurado.');
        return;
      }

      await this.n8nService.postToUrl(webhookUrl, payload);
      this.logger.log(
        `Mensagem encaminhada ao N8N para envio. session=${connection.sessionName} phone=${leadPhone}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao encaminhar mensagem ao N8N: ${error?.message || error}`,
      );
    }
  }
}

