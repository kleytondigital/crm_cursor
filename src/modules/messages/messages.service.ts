import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateMessageDto, EditMessageDto, DeleteMessageDto } from './dto/create-message.dto';
import {
  ContentType,
  SenderType,
  ConversationStatus,
  MessageDirection,
} from '@prisma/client';
import { N8nService } from '@/shared/n8n/n8n.service';
import { ConfigService } from '@nestjs/config';
import { AttendancesService } from '@/modules/attendances/attendances.service';
import { SocialMessageSenderService } from './services/social-message-sender.service';
import { ConnectionProvider } from '@prisma/client';
import { SocialMessageType } from '@/modules/connections/dto/send-social-message.dto';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly n8nService: N8nService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AttendancesService))
    private readonly attendancesService: AttendancesService,
    private readonly socialMessageSender: SocialMessageSenderService,
  ) {}

  async create(createMessageDto: CreateMessageDto, tenantId: string, userId?: string, userRole?: string) {
    // Verificar se a conversa existe e pertence ao tenant
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: createMessageDto.conversationId,
        tenantId: tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        leadId: true,
        status: true,
        departmentId: true,
        assignedUserId: true,
        createdAt: true,
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            tags: true,
            profilePictureURL: true,
            statusId: true,
            tenantId: true,
            createdAt: true,
          },
        },
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

    // Buscar mensagem original se for uma resposta (reply)
    let replyMessageId: string | null = null;
    let replyText: string | null = null;
    
    if (createMessageDto.replyTo) {
      // Tentar encontrar a mensagem original pelo messageId do WhatsApp
      const quotedMessage = await this.prisma.message.findFirst({
        where: {
          messageId: createMessageDto.replyTo,
          tenantId: tenantId,
        },
        select: { id: true, messageId: true, contentText: true },
      });
      
      if (quotedMessage) {
        replyMessageId = quotedMessage.id;
        replyText = quotedMessage.contentText ?? null;
        this.logger.log(
          `Mensagem de resposta encontrada. messageId=${createMessageDto.replyTo} -> id interno=${quotedMessage.id}`,
        );
      } else {
        this.logger.warn(
          `Mensagem original não encontrada para replyTo=${createMessageDto.replyTo}`,
        );
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: createMessageDto.conversationId,
        senderType: createMessageDto.senderType,
        contentType: createMessageDto.contentType,
        contentUrl: createMessageDto.contentUrl,
        contentText: createMessageDto.contentText,
        tempId: createMessageDto.tempId, // Armazenar tempId para correlação posterior
        tenantId: tenantId,
        connectionId: connection?.id ?? undefined,
        leadId: conversation.leadId,
        direction:
          createMessageDto.senderType === SenderType.USER
            ? MessageDirection.OUTGOING
            : MessageDirection.INCOMING,
        reply: !!createMessageDto.replyTo,
        replyMessageId: replyMessageId,
        replyText: replyText,
      },
      select: {
        id: true,
        conversationId: true,
        senderType: true,
        contentType: true,
        contentUrl: true,
        contentText: true,
        transcriptionText: true,
        latitude: true,
        longitude: true,
        direction: true,
        messageId: true,
        tempId: true,
        reply: true,
        replyText: true,
        replyMessageId: true,
        editedAt: true,
        deletedAt: true,
        editedBy: true,
        deletedBy: true,
        originalText: true,
        timestamp: true,
        tenantId: true,
        connectionId: true,
        leadId: true,
        createdAt: true,
        conversation: {
          select: {
            id: true,
            tenantId: true,
            leadId: true,
            status: true,
            departmentId: true,
            assignedUserId: true,
            createdAt: true,
            lead: {
              select: {
                id: true,
                name: true,
                phone: true,
                tags: true,
                profilePictureURL: true,
                statusId: true,
                tenantId: true,
                createdAt: true,
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
        },
      },
    });

    if (createMessageDto.senderType === SenderType.USER) {
      // Passar replyTo, action e tempId para o forwardMessageToN8n
      // Se action não foi especificado mas temos replyTo, assumir action=reply
      const action = createMessageDto.action || (createMessageDto.replyTo ? 'reply' : undefined);
      await this.forwardMessageToN8n(message, connection ?? null, createMessageDto.replyTo, action, createMessageDto.tempId);
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

    // NÃO emitir via WebSocket aqui - deixar o webhook do WAHA emitir quando a mensagem retornar
    // Isso evita duplicação: a mensagem é emitida apenas uma vez, quando confirmada pelo WhatsApp
    // A mensagem otimista no frontend será substituída pela mensagem real quando o webhook chegar

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

  private async forwardMessageToN8n(message: any, connection: { id: string; sessionName: string } | null, replyTo?: string, action?: string, tempId?: string) {
    try {
      if (!connection?.id) {
        this.logger.warn(
          `Não foi possível enviar mensagem via N8N: conexão não encontrada para conversation=${message.conversationId}`,
        );
        return;
      }

      // Buscar conexão completa para verificar provider
      const fullConnection = await this.prisma.connection.findUnique({
        where: { id: connection.id },
        select: {
          id: true,
          provider: true,
          tenantId: true,
          sessionName: true,
        },
      });

      if (!fullConnection) {
        this.logger.warn(`Conexão ${connection.id} não encontrada`);
        return;
      }

      // Se for conexão social, usar SocialMessageSenderService
      if (fullConnection.provider === ConnectionProvider.INSTAGRAM || fullConnection.provider === ConnectionProvider.FACEBOOK) {
        return this.forwardSocialMessage(message, fullConnection, replyTo, tempId);
      }

      // Para WhatsApp, usar lógica existente
      if (!fullConnection.sessionName) {
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

      const payload: any = {
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
        tempId: tempId, // Adicionar tempId para correlação no webhook
      };
      
      // Adicionar action e replyTo se for uma resposta ou se action foi especificado
      if (action === 'reply' || replyTo || message.replyMessageId) {
        let replyToId = replyTo;
        
        // Se não temos replyTo mas temos replyMessageId, buscar o messageId (WhatsApp) da mensagem original
        if (!replyToId && message.replyMessageId) {
          const originalMessage = await this.prisma.message.findUnique({
            where: { id: message.replyMessageId },
            select: { messageId: true },
          });
          
          if (originalMessage?.messageId) {
            replyToId = originalMessage.messageId;
          }
        }
        
        // Se temos replyTo ou action=reply, adicionar ao payload
        if (replyToId || action === 'reply') {
          payload.action = action || 'reply';
          if (replyToId) {
            payload.replyTo = replyToId;
          }
          this.logger.log(
            `Mensagem é resposta. action=${payload.action} replyTo=${replyToId || 'N/A'}`,
          );
        }
      }

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

  /**
   * Encaminha mensagem para conexão social (Instagram/Facebook)
   */
  private async forwardSocialMessage(
    message: any,
    connection: { id: string; tenantId: string; provider: ConnectionProvider },
    replyTo?: string,
    tempId?: string,
  ) {
    try {
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

      // Para redes sociais, o phone do lead contém o senderId (formato: social_123456)
      const leadPhone = conversation?.lead?.phone;
      if (!leadPhone) {
        this.logger.warn(
          `Não foi possível enviar mensagem social: senderId do lead não encontrado para conversation=${message.conversationId}`,
        );
        return;
      }

      // Extrair senderId do phone (formato: social_123456)
      const senderId = leadPhone.replace(/^social_/, '');

      // Mapear ContentType para tipo de mensagem social
      let messageType: SocialMessageType = SocialMessageType.TEXT;
      switch (message.contentType) {
        case ContentType.IMAGE:
          messageType = SocialMessageType.IMAGE;
          break;
        case ContentType.VIDEO:
          messageType = SocialMessageType.VIDEO;
          break;
        case ContentType.AUDIO:
          messageType = SocialMessageType.AUDIO;
          break;
        case ContentType.DOCUMENT:
          messageType = SocialMessageType.FILE;
          break;
        default:
          messageType = SocialMessageType.TEXT;
      }

      // Buscar replyTo se necessário
      let replyToId = replyTo;
      if (!replyToId && message.replyMessageId) {
        const originalMessage = await this.prisma.message.findUnique({
          where: { id: message.replyMessageId },
          select: { messageId: true },
        });
        if (originalMessage?.messageId) {
          replyToId = originalMessage.messageId;
        }
      }

      const sendDto = {
        connectionId: connection.id,
        recipientId: senderId,
        messageType,
        content: message.contentType === ContentType.TEXT ? message.contentText : undefined,
        mediaUrl: this.buildAbsoluteMediaUrl(message.contentUrl),
        tempId,
        replyTo: replyToId,
      };

      await this.socialMessageSender.sendToN8n(sendDto, connection.id, connection.tenantId);
      this.logger.log(
        `Mensagem social encaminhada ao N8N. connectionId=${connection.id} recipientId=${senderId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Erro ao encaminhar mensagem social ao N8N: ${error?.message || error}`,
        error?.stack,
      );
    }
  }

  async editMessage(editMessageDto: EditMessageDto, tenantId: string, userId?: string) {
    // Buscar a mensagem pelo messageId do WhatsApp
    const message = await this.prisma.message.findFirst({
      where: {
        messageId: editMessageDto.idMessage,
        tenantId: tenantId,
      },
      include: {
        conversation: {
          include: {
            lead: true,
          },
        },
        connection: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    // Verificar se a mensagem é do tipo TEXT (apenas mensagens de texto podem ser editadas)
    if (message.contentType !== ContentType.TEXT) {
      throw new BadRequestException('Apenas mensagens de texto podem ser editadas');
    }

    // Verificar se a mensagem foi enviada pelo usuário (apenas mensagens enviadas podem ser editadas)
    if (message.direction !== MessageDirection.OUTGOING) {
      throw new ForbiddenException('Apenas mensagens enviadas podem ser editadas');
    }

    // Salvar histórico da edição antes de atualizar
    // Se é a primeira edição, salvar o texto original
    const isFirstEdit = !message.editedAt;
    const originalText = isFirstEdit ? message.contentText : message.originalText;

    // Criar registro de histórico
    await this.prisma.messageEditHistory.create({
      data: {
        messageId: message.id,
        oldText: message.contentText,
        newText: editMessageDto.Texto,
        editedBy: userId || undefined,
        tenantId: tenantId,
      },
    });

    // Atualizar o conteúdo da mensagem no banco
    const updatedMessage = await this.prisma.message.update({
      where: { id: message.id },
      data: {
        contentText: editMessageDto.Texto,
        editedAt: new Date(),
        editedBy: userId || undefined,
        originalText: originalText || message.contentText, // Preservar texto original na primeira edição
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

    // Enviar comando de edição para o N8N/WAHA
    const connection = await this.resolveConversationConnection(message.conversationId, tenantId);

    if (!connection?.sessionName) {
      throw new BadRequestException('Conexão não encontrada');
    }

    const webhookUrl =
      this.configService.get<string>('N8N_WEBHOOK_URL_MESSAGES_SEND') ??
      this.configService.get<string>('N8N_MESSAGES_WEBHOOK_URL');

    if (!webhookUrl) {
      throw new BadRequestException('N8N_WEBHOOK_URL_MESSAGES_SEND não configurado');
    }

    // Obter o telefone do lead da conversa (se não foi fornecido)
    const leadPhone = editMessageDto.phone || message.conversation?.lead?.phone;
    
    if (!leadPhone) {
      throw new BadRequestException('Telefone do destinatário não encontrado');
    }

    const payload = {
      action: 'edit',
      session: connection.sessionName,
      phone: leadPhone,
      idMessage: editMessageDto.idMessage,
      Texto: editMessageDto.Texto,
    };

    await this.n8nService.postToUrl(webhookUrl, payload);
    this.logger.log(
      `Mensagem editada. messageId=${editMessageDto.idMessage} session=${connection.sessionName} phone=${leadPhone}`,
    );

    return {
      ...updatedMessage,
      contentUrl: this.buildAbsoluteMediaUrl(updatedMessage.contentUrl),
    };
  }

  async deleteMessage(deleteMessageDto: DeleteMessageDto, tenantId: string, userId?: string) {
    // Buscar a mensagem pelo messageId do WhatsApp
    const message = await this.prisma.message.findFirst({
      where: {
        messageId: deleteMessageDto.idMessage,
        tenantId: tenantId,
      },
      include: {
        conversation: {
          include: {
            lead: true,
          },
        },
        connection: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Mensagem não encontrada');
    }

    // Verificar se a mensagem foi enviada pelo usuário (apenas mensagens enviadas podem ser excluídas)
    if (message.direction !== MessageDirection.OUTGOING) {
      throw new ForbiddenException('Apenas mensagens enviadas podem ser excluídas');
    }

    // Enviar comando de exclusão para o N8N/WAHA
    const connection = await this.resolveConversationConnection(message.conversationId, tenantId);

    if (!connection?.sessionName) {
      throw new BadRequestException('Conexão não encontrada');
    }

    const webhookUrl =
      this.configService.get<string>('N8N_WEBHOOK_URL_MESSAGES_SEND') ??
      this.configService.get<string>('N8N_MESSAGES_WEBHOOK_URL');

    if (!webhookUrl) {
      throw new BadRequestException('N8N_WEBHOOK_URL_MESSAGES_SEND não configurado');
    }

    // Obter o telefone do lead da conversa (se não foi fornecido)
    const leadPhone = deleteMessageDto.phone || message.conversation?.lead?.phone;
    
    if (!leadPhone) {
      throw new BadRequestException('Telefone do destinatário não encontrado');
    }

    const payload = {
      action: 'delete',
      session: connection.sessionName,
      phone: leadPhone,
      idMessage: deleteMessageDto.idMessage,
    };

    await this.n8nService.postToUrl(webhookUrl, payload);
    this.logger.log(
      `Mensagem excluída. messageId=${deleteMessageDto.idMessage} session=${connection.sessionName} phone=${leadPhone}`,
    );

    // Marcar mensagem como excluída (soft delete) em vez de excluir fisicamente
    // Isso preserva o histórico para auditoria
    const deletedMessage = await this.prisma.message.update({
      where: { id: message.id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId || undefined,
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

    return {
      ...deletedMessage,
      contentUrl: this.buildAbsoluteMediaUrl(deletedMessage.contentUrl),
    };
  }
}

