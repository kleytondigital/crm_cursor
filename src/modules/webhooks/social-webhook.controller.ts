import { Body, Controller, Logger, Post, Get, Query, Headers, BadRequestException, UseGuards } from '@nestjs/common';
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
import { ApiKeyGuard } from '@/shared/guards/api-key.guard';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Controller('webhooks/social')
@Public() // Marcar como público para JwtAuthGuard global não interferir
@UseGuards(ApiKeyGuard) // ApiKeyGuard fará a validação de API Key
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

  @Post()
  async handleWebhook(@Body() body: any) {
    // Validação de API Key é feita pelo ApiKeyGuard
    this.logger.debug(`Webhook social recebido: ${JSON.stringify(body).substring(0, 200)}`);

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

  /**
   * Webhook para confirmação de mensagens enviadas (message.sent)
   * Chamado pelo n8n após enviar mensagem para Meta API
   */
  @Post('message.sent')
  async handleMessageSent(@Body() body: any) {
    // Validação de API Key é feita pelo ApiKeyGuard

    try {
      this.logger.debug(`Webhook message.sent recebido: ${JSON.stringify(body).substring(0, 500)}`);

      // Extrair informações do payload
      const { tenantId, connectionId, messageId, tempId, payload } = body;

      if (!tenantId || !connectionId || !messageId) {
        this.logger.warn('Webhook message.sent sem tenantId, connectionId ou messageId');
        return { status: 'error', message: 'Campos obrigatórios faltando' };
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
        return { status: 'error', message: 'Conexão não encontrada' };
      }

      // Buscar mensagem otimista pelo tempId
      if (tempId) {
        const existingMessage = await this.prisma.message.findFirst({
          where: {
            tempId: tempId,
            tenantId: connection.tenantId,
            messageId: null, // Mensagem otimista ainda não confirmada
          },
          include: {
            conversation: {
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
            },
          },
        });

        if (existingMessage) {
          // Atualizar mensagem otimista com messageId da Meta
          const updatedMessage = await this.prisma.message.update({
            where: { id: existingMessage.id },
            data: {
              messageId: messageId,
              timestamp: payload?.timestamp ? new Date(payload.timestamp) : new Date(),
            },
            select: {
              id: true,
              conversationId: true,
              leadId: true,
              connectionId: true,
              senderType: true,
              sender: true,
              contentType: true,
              contentUrl: true,
              contentText: true,
              transcriptionText: true,
              direction: true,
              messageId: true,
              tempId: true,
              timestamp: true,
              tenantId: true,
              createdAt: true,
              reply: true,
              replyText: true,
              replyMessageId: true,
              conversation: {
                select: {
                  id: true,
                  tenantId: true,
                  leadId: true,
                  assignedUserId: true,
                  departmentId: true,
                  status: true,
                  isBotAttending: true,
                  createdAt: true,
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
              },
            },
          });

          // Emitir atualização via WebSocket
          this.messagesGateway.emitNewMessage(
            connection.tenantId,
            updatedMessage.conversation,
            updatedMessage,
          );

          this.logger.log(
            `Mensagem otimista atualizada com messageId da Meta. tempId=${tempId} messageId=${messageId}`,
          );

          return { status: 'ok', updated: true };
        } else {
          this.logger.warn(`Mensagem otimista não encontrada para tempId=${tempId}`);
          return { status: 'ok', updated: false, message: 'Mensagem não encontrada' };
        }
      } else {
        this.logger.warn('Webhook message.sent sem tempId');
        return { status: 'ok', updated: false, message: 'tempId não fornecido' };
      }
    } catch (error: any) {
      this.logger.error(
        `Erro ao processar webhook message.sent: ${error?.message || error}`,
        error?.stack,
      );
      return { status: 'error', message: error?.message || 'Erro desconhecido' };
    }
  }

  private async processEvent(event: any) {
    try {
      this.logger.debug(`[processEvent] Evento social recebido: ${JSON.stringify(event).substring(0, 500)}`);

      // Extrair tenantId e connectionId do payload
      const tenantId = event.tenantId || event.connection?.tenantId;
      const connectionId = event.connectionId || event.connection?.id;

      if (!tenantId || !connectionId) {
        this.logger.warn(
          `[processEvent] Evento social sem tenantId ou connectionId. tenantId=${tenantId || 'N/A'} connectionId=${connectionId || 'N/A'} payload=${JSON.stringify(event).substring(0, 200)}`,
        );
        return false;
      }

      this.logger.log(
        `[processEvent] Processando evento social. tenantId=${tenantId} connectionId=${connectionId}`,
      );

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
        this.logger.warn(
          `[processEvent] Conexão social não encontrada ou inativa. connectionId=${connectionId} tenantId=${tenantId}`,
        );
        return false;
      }

      this.logger.log(
        `[processEvent] Conexão encontrada. provider=${connection.provider} connectionId=${connection.id}`,
      );

      // Normalizar mensagem
      const normalized = this.normalizer.normalize(event, connection);
      if (!normalized) {
        this.logger.warn(
          `[processEvent] Falha ao normalizar mensagem social. connectionId=${connection.id} event=${JSON.stringify(event).substring(0, 300)}`,
        );
        return false;
      }

      this.logger.log(
        `[processEvent] Mensagem normalizada. messageId=${normalized.messageId} senderId=${normalized.senderId} contentType=${normalized.contentType} direction=${normalized.direction}`,
      );

      // Verificar se mensagem já existe
      const existingMessage = await this.prisma.message.findFirst({
        where: {
          messageId: normalized.messageId,
          tenantId: connection.tenantId,
        },
      });

      if (existingMessage) {
        this.logger.log(
          `[processEvent] Mensagem já existe no banco. messageId=${normalized.messageId} id=${existingMessage.id}`,
        );
        return true;
      }

      // Criar ou atualizar lead
      const lead = await this.upsertLead({
        tenantId: connection.tenantId,
        senderId: normalized.senderId,
        name: normalized.senderName || normalized.senderId,
        profilePictureURL: normalized.senderPicture || null,
      });

      this.logger.log(
        `[processEvent] Lead processado. leadId=${lead.id} name=${lead.name}`,
      );

      // Criar ou buscar conversa
      const conversation = await this.getOrCreateConversation({
        tenantId: connection.tenantId,
        leadId: lead.id,
        connectionId: connection.id,
      });

      this.logger.log(
        `[processEvent] Conversa processada. conversationId=${conversation.id}`,
      );

      // Criar mensagem
      const message = await this.createMessage(normalized, lead, conversation, connection);

      this.logger.log(
        `[processEvent] Mensagem criada. messageId=${message.id} metaMessageId=${normalized.messageId}`,
      );

      // Processar mídia se houver
      if (normalized.mediaUrl && normalized.contentType !== ContentType.TEXT) {
        this.logger.log(
          `[processEvent] Processando mídia. mediaUrl=${normalized.mediaUrl} contentType=${normalized.contentType}`,
        );
        await this.processMedia(message, normalized, connection);
      }

      // Criar ou atualizar atendimento
      if (normalized.direction === MessageDirection.INCOMING) {
        try {
          await this.attendancesService.handleIncomingMessage({
            tenantId: connection.tenantId,
            leadId: lead.id,
            connectionId: connection.id,
            content: normalized.contentText || '',
            timestamp: normalized.timestamp,
          });
          this.logger.log(`[processEvent] Atendimento sincronizado para leadId=${lead.id}`);
        } catch (error: any) {
          this.logger.error(
            `[processEvent] Erro ao sincronizar atendimento: ${error?.message || error}`,
            error?.stack,
          );
          // Não bloquear o processamento se falhar
        }
      }

      // Notificar via WebSocket
      try {
        this.messagesGateway.emitNewMessage(connection.tenantId, conversation, message);
        this.logger.log(
          `[processEvent] Mensagem emitida via WebSocket. tenantId=${connection.tenantId} conversationId=${conversation.id}`,
        );
      } catch (error: any) {
        this.logger.error(
          `[processEvent] Erro ao emitir mensagem via WebSocket: ${error?.message || error}`,
          error?.stack,
        );
        // Não bloquear o processamento se falhar
      }

      this.logger.log(
        `[processEvent] ✅ Mensagem social processada com sucesso. messageId=${normalized.messageId} id=${message.id}`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `[processEvent] ❌ Erro ao processar evento social: ${error?.message || error}`,
        error?.stack,
      );
      throw error;
    }
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

      if (profilePictureURL) {
        updateData.profilePictureURL = profilePictureURL;
      }

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
    try {
      if (!normalized.mediaUrl) {
        this.logger.warn(`Processamento de mídia chamado sem mediaUrl. messageId=${normalized.messageId}`);
        return;
      }

      this.logger.log(`Processando mídia: ${normalized.mediaUrl} para mensagem ${message.id}`);

      // Buscar token de acesso da conexão para autenticação com Meta API
      const connectionWithMetadata = await this.prisma.connection.findUnique({
        where: { id: connection.id },
        select: { metadata: true },
      });

      const metadata = connectionWithMetadata?.metadata as any;
      const accessToken = metadata?.accessToken;

      // Download e upload da mídia
      const downloadedUrl = await this.downloadAndSaveMedia(
        normalized.mediaUrl,
        normalized.mediaMimeType,
        accessToken,
      );

      if (downloadedUrl) {
        // Atualizar mensagem com a URL do MinIO
        await this.prisma.message.update({
          where: { id: message.id },
          data: { contentUrl: downloadedUrl },
        });

        this.logger.log(
          `Mídia processada com sucesso. messageId=${message.id} originalUrl=${normalized.mediaUrl} minioUrl=${downloadedUrl}`,
        );
      } else {
        this.logger.warn(
          `Falha ao processar mídia. messageId=${message.id} mediaUrl=${normalized.mediaUrl}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Erro ao processar mídia: ${error?.message || error}`,
        error?.stack,
      );
      // Não bloquear o processamento da mensagem se a mídia falhar
    }
  }

  /**
   * Download e upload de mídia para MinIO
   */
  private async downloadAndSaveMedia(
    mediaUrl: string,
    mimetype?: string | null,
    accessToken?: string,
  ): Promise<string | null> {
    try {
      // Headers para autenticação com Meta API (se disponível)
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await axios.get<ArrayBuffer>(mediaUrl, {
        responseType: 'arraybuffer',
        headers,
        timeout: 30000, // 30 segundos para download de mídia
      });

      const contentType =
        mimetype ?? response.headers['content-type'] ?? 'application/octet-stream';
      const extension = this.resolveExtension(contentType, mediaUrl);

      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}`;

      const fileName = `${randomUUID()}.${extension}`;
      
      // Chave (caminho) do arquivo no MinIO
      const key = `chats/${yearMonth}/${fileName}`;
      
      // Upload para MinIO
      const publicUrl = await this.minioService.uploadFile(
        Buffer.from(response.data),
        key,
        contentType,
      );

      this.logger.log(`Mídia baixada e salva: ${publicUrl}`);
      return publicUrl;
    } catch (error: any) {
      this.logger.error(
        `Falha ao baixar e salvar mídia ${mediaUrl}: ${error?.message || error}`,
        error?.stack,
      );
      return null;
    }
  }

  /**
   * Resolve extensão de arquivo baseado no content type e URL
   */
  private resolveExtension(contentType: string, mediaUrl: string): string {
    const normalized = contentType.toLowerCase();

    if (normalized.includes('image/jpeg')) return 'jpg';
    if (normalized.includes('image/png')) return 'png';
    if (normalized.includes('image/gif')) return 'gif';
    if (normalized.includes('image/webp')) return 'webp';
    if (normalized.includes('audio/ogg')) return 'ogg';
    if (normalized.includes('audio/mpeg')) return 'mp3';
    if (normalized.includes('audio/aac')) return 'aac';
    if (normalized.includes('video/mp4')) return 'mp4';
    if (normalized.includes('video/3gpp')) return '3gp';
    if (normalized.includes('application/pdf')) return 'pdf';
    if (normalized.includes('application/msword')) return 'doc';
    if (normalized.includes('presentation')) return 'ppt';
    if (normalized.includes('spreadsheet')) return 'xls';
    if (normalized.includes('text/plain')) return 'txt';
    if (normalized.includes('application/zip')) return 'zip';

    const urlExtension = extname(mediaUrl).replace('.', '');
    if (urlExtension) {
      return urlExtension;
    }

    return 'bin';
  }

  /**
   * Endpoint para n8n consultar conexão por identificadores
   * Permite ao n8n buscar tenantId e connectionId baseado em pageId ou instagramBusinessId
   * Protegido por API Key (ApiKeyGuard)
   */
  @Get('connection/lookup')
  async lookupConnection(
    @Query('provider') provider: string,
    @Query('pageId') pageId?: string,
    @Query('instagramBusinessId') instagramBusinessId?: string,
  ) {
    try {

      if (!provider || (provider !== 'INSTAGRAM' && provider !== 'FACEBOOK')) {
        throw new BadRequestException('Query parameter "provider" deve ser INSTAGRAM ou FACEBOOK');
      }

      if (!pageId && !instagramBusinessId) {
        throw new BadRequestException('Query parameter "pageId" ou "instagramBusinessId" deve ser fornecido');
      }

      // Buscar conexões do provider especificado
      const providerEnum = provider === 'INSTAGRAM' ? ConnectionProvider.INSTAGRAM : ConnectionProvider.FACEBOOK;

      const connections = await this.prisma.connection.findMany({
        where: {
          provider: providerEnum,
          isActive: true,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          tenantId: true,
          provider: true,
          name: true,
          metadata: true,
        },
      });

      // Filtrar por identificadores
      let foundConnection = null;

      for (const conn of connections) {
        const metadata = (conn.metadata as any) || {};

        // Para Instagram, priorizar instagramBusinessId
        if (provider === 'INSTAGRAM' && instagramBusinessId) {
          if (metadata.instagramBusinessId === instagramBusinessId) {
            foundConnection = conn;
            break;
          }
        }

        // Buscar por pageId (funciona para ambos)
        if (pageId && metadata.pageId === pageId) {
          foundConnection = conn;
          break;
        }
      }

      if (!foundConnection) {
        this.logger.warn(
          `Conexão não encontrada. provider=${provider} pageId=${pageId} instagramBusinessId=${instagramBusinessId}`,
        );
        return {
          found: false,
          message: 'Conexão não encontrada',
        };
      }

      // Retornar apenas informações necessárias (sem tokens sensíveis)
      const metadata = (foundConnection.metadata as any) || {};
      return {
        found: true,
        tenantId: foundConnection.tenantId,
        connectionId: foundConnection.id,
        provider: foundConnection.provider,
        name: foundConnection.name,
        pageId: metadata.pageId,
        instagramBusinessId: metadata.instagramBusinessId,
        pageName: metadata.pageName,
        instagramUsername: metadata.instagramUsername,
      };
    } catch (error: any) {
      this.logger.error(`Erro ao buscar conexão: ${error?.message || error}`, error?.stack);
      throw new BadRequestException(error?.message || 'Erro ao buscar conexão');
    }
  }

}

