import { Body, Controller, Logger, Post } from '@nestjs/common';
import { Public } from '@/shared/decorators/public.decorator';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { MessagesGateway } from '@/modules/messages/messages.gateway';
import {
  ContentType,
  Lead,
  LeadStatus,
  MessageDirection,
  SenderType,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { AttendancesService } from '@/modules/attendances/attendances.service';

const WA_REGEX = /@(c\.us|s\.whatsapp\.net)$/;

@Controller('webhooks/waha')
export class WahaWebhookController {
  private readonly logger = new Logger(WahaWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesGateway: MessagesGateway,
    private readonly configService: ConfigService,
    private readonly attendancesService: AttendancesService,
  ) {}

  @Public()
  @Post()
  async handleWebhook(@Body() body: any) {
    const events = Array.isArray(body) ? body : body ? [body] : [];

    if (events.length === 0) {
      this.logger.warn('Nenhum evento recebido em /webhooks/waha');
      return { status: 'ok', processed: 0 };
    }

    let processed = 0;

    for (const event of events) {
      try {
        const handled = await this.processEvent(event);
        if (handled) {
          processed += 1;
        }
      } catch (error) {
        this.logger.error(
          `Erro ao processar evento WAHA: ${error?.message || error}`,
          error?.stack,
        );
      }
    }

    return { status: 'ok', processed };
  }

  private async processEvent(event: any) {
    const session = event?.session ?? null;
    if (!session) {
      this.logger.warn('Evento WAHA sem session informado');
      return false;
    }

    const connection = await this.prisma.connection.findFirst({
      where: { sessionName: session },
    });

    if (!connection) {
      this.logger.warn(
        `Sessão WAHA não registrada, evento ignorado. session=${session}`,
      );
      return false;
    }

    const payload = event?.payload ?? event ?? {};
    const info = payload?._data?.Info ?? {};

    const media = payload?.media ?? event?.media ?? null;
    const hasMedia = payload?.hasMedia ?? event?.hasMedia ?? !!media;

    // Extrair latitude e longitude para mensagens de localização
    const latitude = payload?.latitude ?? event?.latitude ?? null;
    const longitude = payload?.longitude ?? event?.longitude ?? null;
    const hasLocation = latitude !== null && longitude !== null && 
                        typeof latitude === 'number' && typeof longitude === 'number';

    const from = payload?.from ?? event?.from ?? '';
    const sender =
      info?.Sender ??
      payload?.sender ??
      event?.sender ??
      event?.senderFinal ??
      '';
    const senderAlt =
      info?.SenderAlt ?? payload?.senderAlt ?? event?.senderAlt ?? '';
    const pushName =
      info?.PushName ?? payload?.pushName ?? event?.pushName ?? sender ?? '';
    const profilePictureURL =
      payload?.profilePictureURL ?? event?.profilePictureURL ?? null;
    const type = info?.Type ?? payload?.type ?? media?.mimetype ?? '';
    const fromMe = payload?.fromMe ?? event?.fromMe ?? false;
    const messageText = this.extractMessageText(payload);

    const timestampValue =
      info?.Timestamp ??
      payload?.timestamp ??
      event?.timestamp ??
      payload?._data?.timestamp ??
      null;
    const timestamp =
      typeof timestampValue === 'number'
        ? new Date(timestampValue * 1000)
        : timestampValue
        ? new Date(timestampValue)
        : new Date();
    const messageId =
      this.extractMessageId(payload) ?? this.extractMessageId(event);

    const explicitContact =
      event?.senderFinal ?? payload?.senderFinal ?? payload?.chatId ?? payload?.to;

    if (messageId) {
      const exists = await this.prisma.message.findFirst({
        where: { messageId },
      });
      if (exists) {
        this.logger.log(
          `Mensagem duplicada ignorada. session=${session} messageId=${messageId}`,
        );
        return false;
      }
    }

    let senderFinal = this.resolveSender(from, sender, senderAlt);

    if ((!senderFinal || fromMe) && explicitContact) {
      senderFinal = explicitContact;
    }

    if (!senderFinal) {
      this.logger.warn(
        `Não foi possível determinar senderFinal. session=${session}`,
      );
      return false;
    }

    this.logger.log(
      `Evento WAHA processado. session=${session} senderFinal=${senderFinal} hasLocation=${hasLocation} body =${JSON.stringify(payload)}`,
    );

    const lead = await this.upsertLead({
      tenantId: connection.tenantId,
      phone: senderFinal,
      name: pushName || senderFinal,
      profilePictureURL: profilePictureURL || null,
    });

    const conversation = await this.getOrCreateConversation({
      tenantId: connection.tenantId,
      leadId: lead.id,
    });

    const direction = fromMe
      ? MessageDirection.OUTGOING
      : MessageDirection.INCOMING;
    const senderType = fromMe ? SenderType.USER : SenderType.LEAD;

    // Determinar tipo de conteúdo: se tem localização, é LOCATION; caso contrário, verifica mídia
    let contentType: ContentType;
    if (hasLocation) {
      contentType = ContentType.LOCATION;
    } else {
      contentType = this.resolveContentType(type, media?.mimetype, hasMedia);
    }

    const resolvedContentText =
      hasLocation
        ? `Localização: ${latitude}, ${longitude}`
        : messageText ??
          (hasMedia ? this.describeMediaText(media?.mimetype) : null);

    let contentUrl: string | null = hasMedia ? media?.url ?? null : null;

    if (hasMedia && media?.url) {
      const downloadedUrl = await this.downloadAndSaveMedia(
        media.url,
        media?.mimetype ?? type,
      );
      if (downloadedUrl) {
        contentUrl = downloadedUrl;
      }
    }

    const message = await this.prisma.message.create({
      data: {
        tenantId: connection.tenantId,
        connectionId: connection.id,
        leadId: lead.id,
        conversationId: conversation.id,
        senderType,
        sender: senderFinal,
        contentType,
        contentText: resolvedContentText,
        contentUrl,
        latitude: hasLocation ? latitude : null,
        longitude: hasLocation ? longitude : null,
        direction,
        messageId,
        timestamp,
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

    // Buscar atendimento ativo para sincronizar departmentId com a conversa
    // Isso garante que a conversa tenha o mesmo departmentId do atendimento
    const activeAttendance = await this.prisma.attendance.findFirst({
      where: {
        tenantId: connection.tenantId,
        leadId: lead.id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED'] },
      },
      select: {
        departmentId: true,
        assignedUserId: true,
      },
    });

    // Se a conversa está fechada e o lead enviou uma mensagem, reabrir a conversa
    // e remover a atribuição (volta para disponível sem atendente)
    const shouldReopen = conversation.status === 'CLOSED' && !fromMe;

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Sincronizar departmentId da conversa com o atendimento (se existir)
    if (activeAttendance?.departmentId) {
      updateData.departmentId = activeAttendance.departmentId;
    }

    if (shouldReopen) {
      updateData.status = 'ACTIVE';
      updateData.assignedUserId = null; // Volta para disponível sem atendente
      // Quando reabre, usar o departmentId do atendimento se existir
      if (activeAttendance?.departmentId) {
        updateData.departmentId = activeAttendance.departmentId;
      }
    } else if (activeAttendance?.assignedUserId) {
      // Se há um atendimento ativo com usuário atribuído, sincronizar com a conversa
      updateData.assignedUserId = activeAttendance.assignedUserId;
    }

    const updatedConversation = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: updateData,
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

    // Converter URL de mídia para URL absoluta
    const mediaBase = this.configService.get<string>('MEDIA_BASE_URL');
    const appBase = this.configService.get<string>('APP_URL');
    const publicBase = this.configService.get<string>('PUBLIC_BACKEND_URL');
    const baseUrl =
      (mediaBase && mediaBase.trim().length > 0 ? mediaBase : null) ??
      (appBase && appBase.trim().length > 0 ? appBase : null) ??
      (publicBase && publicBase.trim().length > 0 ? publicBase : null) ??
      'http://localhost:3000';

    const absoluteContentUrl = message.contentUrl
      ? message.contentUrl.startsWith('http://') || message.contentUrl.startsWith('https://')
        ? message.contentUrl
        : `${baseUrl.replace(/\/$/, '')}${message.contentUrl.startsWith('/') ? '' : '/'}${message.contentUrl}`
      : null;

    const messageWithConversation = {
      ...message,
      contentUrl: absoluteContentUrl,
      conversation: updatedConversation,
    };

    const server = this.messagesGateway.server;
    if (server) {
      this.messagesGateway.emitNewMessage(
        connection.tenantId,
        updatedConversation,
        messageWithConversation,
      );
    }

    try {
      if (fromMe) {
        await this.attendancesService.handleOutgoingMessage({
          tenantId: connection.tenantId,
          leadId: lead.id,
          content: resolvedContentText,
          timestamp,
        });
      } else {
        await this.attendancesService.handleIncomingMessage({
          tenantId: connection.tenantId,
          leadId: lead.id,
          connectionId: connection.id,
          content: resolvedContentText,
          timestamp,
        });
      }
    } catch (error) {
      this.logger.error(
        `Erro ao sincronizar atendimento após webhook: ${error?.message || error}`,
      );
    }

    return true;
  }

  private async upsertLead({
    tenantId,
    phone,
    name,
    profilePictureURL,
  }: {
    tenantId: string;
    phone: string;
    name: string;
    profilePictureURL?: string | null;
  }): Promise<Lead> {
    let lead = await this.prisma.lead.findFirst({
      where: {
        tenantId,
        phone,
      },
    });

    if (!lead) {
      lead = await this.prisma.lead.create({
        data: {
          tenantId,
          phone,
          name,
          tags: [],
          status: LeadStatus.NOVO,
          profilePictureURL: profilePictureURL || null,
        },
      });
    } else {
      const updateData: any = {};
      
      if (!lead.name && name) {
        updateData.name = name;
      }
      
      // Atualizar profilePictureURL sempre que fornecido (mesmo que diferente)
      // Isso garante que fotos de perfil sejam atualizadas quando o WhatsApp envia
      if (profilePictureURL) {
        // Atualizar mesmo se já existir, pois a foto pode ter mudado
        updateData.profilePictureURL = profilePictureURL;
      }
      
      if (Object.keys(updateData).length > 0) {
        lead = await this.prisma.lead.update({
          where: { id: lead.id },
          data: updateData,
        });
        this.logger.log(
          `Lead atualizado. leadId=${lead.id} name=${updateData.name || lead.name} profilePictureURL=${updateData.profilePictureURL ? 'atualizado' : 'mantido'}`,
        );
      }
    }

    return lead;
  }

  private async getOrCreateConversation({
    tenantId,
    leadId,
  }: {
    tenantId: string;
    leadId: string;
  }) {
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        leadId,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            tags: true,
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
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          leadId,
        },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              tags: true,
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
    }

    return conversation;
  }

  private mapContentType(type: string): ContentType {
    const normalized = (type || 'text').toUpperCase();
    if (Object.values(ContentType).includes(normalized as ContentType)) {
      return normalized as ContentType;
    }
    return ContentType.TEXT;
  }

  private resolveContentType(
    type?: string,
    mimetype?: string,
    hasMedia?: boolean,
  ): ContentType {
    const rawType = (type || '').toUpperCase();

    if (hasMedia && mimetype) {
      const normalizedMime = mimetype.toLowerCase();
      if (normalizedMime.includes('image/')) {
        return ContentType.IMAGE;
      }
      if (normalizedMime.includes('audio/')) {
        return ContentType.AUDIO;
      }
      if (normalizedMime.includes('video/')) {
        return ContentType.VIDEO;
      }
      if (
        normalizedMime.includes('application/') ||
        normalizedMime.includes('text/') ||
        normalizedMime.includes('pdf') ||
        normalizedMime.includes('msword') ||
        normalizedMime.includes('sheet') ||
        normalizedMime.includes('presentation')
      ) {
        return ContentType.DOCUMENT;
      }
    }

    if (rawType === 'AUDIO') {
      return ContentType.AUDIO;
    }
    if (rawType === 'VIDEO') {
      return ContentType.VIDEO;
    }
    if (rawType === 'IMAGE') {
      return ContentType.IMAGE;
    }
    if (rawType === 'DOCUMENT') {
      return ContentType.DOCUMENT;
    }

    return ContentType.TEXT;
  }

  private describeMediaText(mimetype?: string | null): string {
    if (!mimetype) {
      return 'Arquivo recebido';
    }
    const normalized = mimetype.toLowerCase();
    if (normalized.includes('image/')) {
      return 'Imagem recebida';
    }
    if (normalized.includes('audio/')) {
      return 'Áudio recebido';
    }
    if (normalized.includes('video/')) {
      return 'Vídeo recebido';
    }
    if (normalized.includes('application/pdf')) {
      return 'Documento PDF recebido';
    }
    if (normalized.includes('application/')) {
      return 'Documento recebido';
    }
    if (normalized.includes('text/')) {
      return 'Arquivo de texto recebido';
    }
    return 'Arquivo recebido';
  }

  private async downloadAndSaveMedia(
    mediaUrl: string,
    mimetype?: string | null,
  ): Promise<string | null> {
    try {
      const apiKey =
        this.configService.get<string>('WAHA_API_KEY') ??
        this.configService.get<string>('WAHA_MEDIA_API_KEY') ??
        null;

      const response = await axios.get<ArrayBuffer>(mediaUrl, {
        responseType: 'arraybuffer',
        headers: apiKey
          ? {
              'X-Api-Key': apiKey,
            }
          : undefined,
      });

      const contentType =
        mimetype ?? response.headers['content-type'] ?? 'application/octet-stream';
      const extension = this.resolveExtension(contentType, mediaUrl);

      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}`;

      const uploadDir = join(process.cwd(), 'uploads', 'chats', yearMonth);
      await fs.mkdir(uploadDir, { recursive: true });

      const fileName = `${randomUUID()}.${extension}`;
      const filePath = join(uploadDir, fileName);

      await fs.writeFile(filePath, Buffer.from(response.data));

      const publicPath = `/uploads/chats/${yearMonth}/${fileName}`;

      return publicPath;
    } catch (error) {
      this.logger.warn(
        `Falha ao baixar mídia ${mediaUrl}: ${error?.message || error}`,
      );
      return null;
    }
  }

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

  private extractMessageText(payload: any): string | null {
    const candidates = [
      payload?.body,
      payload?.text,
      payload?.message,
      payload?.content,
      payload?.caption,
      payload?.value,
      payload?.description,
      payload?.conversation,
      payload?.message?.text,
      payload?.message?.conversation,
      payload?._data?.body,
      payload?._data?.Body,
      payload?._data?.message,
      payload?._data?.text,
      payload?._data?.Message?.conversation,
      payload?._data?.Message?.text,
      payload?._data?.Message?.body,
      payload?._data?.Message?.extendedTextMessage?.text,
      payload?._data?.Message?.templateMessage?.Format?.InteractiveMessageTemplate?.body?.text,
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    const fallback = this.findStringValue(payload, [
      'body',
      'text',
      'message',
      'conversation',
      'value',
    ]);

    return typeof fallback === 'string' && fallback.trim().length > 0
      ? fallback.trim()
      : null;
  }

  private extractMessageId(payload: any): string | null {
    const candidates = [
      payload?.messageId,
      payload?.id,
      payload?._data?.id,
      payload?._data?.Message?.id,
      payload?._data?.Message?.key?.id,
      payload?._data?.Key?.Id,
      payload?._data?.key?.id,
      payload?.key?.id,
    ];

    const result = candidates.find((value) => typeof value === 'string');
    return result || null;
  }

  private resolveSender(from: string, sender: string, senderAlt: string) {
    let result: string | undefined = undefined;

    if (WA_REGEX.test(from)) {
      result = from;
    } else {
      if (senderAlt.endsWith('@lid')) {
        result = sender;
      } else if (WA_REGEX.test(senderAlt)) {
        result = senderAlt;
      } else {
        result = sender || from;
      }
    }

    if (!WA_REGEX.test(result || '')) {
      if (WA_REGEX.test(from)) {
        result = from;
      }
    }

    return result || null;
  }

  private findStringValue(source: any, keys: string[]): string | null {
    if (!source) {
      return null;
    }

    if (typeof source === 'string') {
      return source;
    }

    if (Array.isArray(source)) {
      for (const item of source) {
        const result = this.findStringValue(item, keys);
        if (result) {
          return result;
        }
      }
      return null;
    }

    if (typeof source === 'object') {
      for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string') {
          return value;
        }
      }

      for (const value of Object.values(source)) {
        if (
          typeof value === 'object' ||
          Array.isArray(value) ||
          typeof value === 'string'
        ) {
          const result = this.findStringValue(value, keys);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  }
}

