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
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { AttendancesService } from '@/modules/attendances/attendances.service';
import { MinioService } from '@/shared/minio/minio.service';

const WA_REGEX = /@(c\.us|s\.whatsapp\.net)$/;

@Controller('webhooks/waha')
export class WahaWebhookController {
  private readonly logger = new Logger(WahaWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesGateway: MessagesGateway,
    private readonly configService: ConfigService,
    private readonly attendancesService: AttendancesService,
    private readonly minioService: MinioService,
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
    // Log do evento recebido para debug
    this.logger.debug(`Evento WAHA recebido: ${JSON.stringify(event).substring(0, 500)}`);
    
    const session = event?.session ?? null;
    if (!session) {
      this.logger.warn('Evento WAHA sem session informado');
      return false;
    }
    
    this.logger.log(`Processando evento WAHA para session: ${session}`);

    // Buscar conexão por sessionName (case-sensitive primeiro)
    let connection = await this.prisma.connection.findFirst({
      where: { sessionName: session },
    });

    // Se não encontrou, tentar case-insensitive (para compatibilidade)
    if (!connection) {
      const allConnections = await this.prisma.connection.findMany({
        where: {},
        select: { id: true, sessionName: true, tenantId: true, name: true, status: true },
      });
      connection = allConnections.find(
        (c) => c.sessionName.toLowerCase() === session.toLowerCase(),
      ) as any;
      
      if (connection) {
        this.logger.log(
          `Conexão encontrada com case-insensitive: session=${session} -> sessionName=${connection.sessionName}`,
        );
      }
    }

    if (!connection) {
      this.logger.warn(
        `Sessão WAHA não registrada, evento ignorado. session=${session}. Verifique se a conexão foi criada no sistema.`,
      );
      // Log adicional para debug: listar todas as sessões disponíveis
      const allSessions = await this.prisma.connection.findMany({
        select: { sessionName: true, name: true },
      });
      this.logger.warn(
        `Sessões registradas no sistema: ${allSessions.map((c) => `${c.sessionName} (nome: ${c.name})`).join(', ')}`,
      );
      return false;
    }

    // Processar payload: pode estar em event.payload ou diretamente em event
    const payload = event?.payload ?? event ?? {};
    const info = payload?._data?.Info ?? {};

    // Extrair informações de mídia
    const media = payload?.media ?? event?.media ?? null;
    const hasMedia = payload?.hasMedia ?? event?.hasMedia ?? !!media;

    // Extrair latitude e longitude para mensagens de localização
    const latitude = payload?.latitude ?? event?.latitude ?? null;
    const longitude = payload?.longitude ?? event?.longitude ?? null;
    const hasLocation = latitude !== null && longitude !== null && 
                        typeof latitude === 'number' && typeof longitude === 'number';

    // Extrair informações do remetente (múltiplas fontes possíveis)
    const from = payload?.from ?? event?.from ?? '';
    const sender =
      info?.Sender ??
      payload?.sender ??
      event?.sender ??
      event?.senderFinal ??
      payload?.senderFinal ??
      '';
    const senderAlt =
      info?.SenderAlt ?? payload?.senderAlt ?? event?.senderAlt ?? '';
    const pushName =
      info?.PushName ?? payload?.pushName ?? event?.pushName ?? sender ?? '';
    const profilePictureURL =
      payload?.profilePictureURL ?? event?.profilePictureURL ?? null;
    
    // Extrair tipo de mensagem e conteúdo
    const type = info?.Type ?? payload?.type ?? event?.type ?? media?.mimetype ?? '';
    const fromMe = payload?.fromMe ?? event?.fromMe ?? false;
    
    // Extrair informações de resposta (reply)
    // reply pode vir como boolean true/false ou string "true"/"false"
    const replyValue = payload?.reply ?? event?.reply ?? false;
    const isReply = replyValue === true || replyValue === 'true' || replyValue === 'TRUE';
    const replyTo = payload?.replyTo ?? event?.replyTo ?? null;
    const replyToId = replyTo?.id ?? null;
    const replyToBody = replyTo?.body ?? null;
    
    // Extrair texto da mensagem (verificar múltiplas fontes incluindo 'conversation')
    const messageText = this.extractMessageText(payload, event);
    
    // Log detalhado para debug
    this.logger.log(
      `Processando evento WAHA: session=${session} fromMe=${fromMe} reply=${isReply} sender=${sender} senderFinal=${event?.senderFinal ?? payload?.senderFinal ?? 'N/A'} messageText=${messageText ? messageText.substring(0, 50) : 'N/A'}...`,
    );

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

    // Para mensagens com fromMe=true, o senderFinal geralmente está em senderFinal ou explicitContact
    // Isso é importante porque mensagens enviadas do celular/WhatsApp Web têm fromMe=true
    // IMPORTANTE: Para mensagens com fromMe=true, o senderFinal deve ser o DESTINATÁRIO (lead),
    // não o remetente, pois são mensagens que o USUÁRIO enviou para o LEAD
    if ((!senderFinal || fromMe) && explicitContact) {
      senderFinal = explicitContact;
      this.logger.debug(`Usando explicitContact como senderFinal: ${senderFinal} (fromMe=${fromMe})`);
    }

    // Se ainda não tiver senderFinal e fromMe=true, tentar usar campos alternativos
    if (!senderFinal && fromMe) {
      // Para mensagens enviadas do celular/WhatsApp Web com fromMe=true,
      // o senderFinal (destinatário/lead) pode estar em 'to' ou 'chatId'
      const fallbackSender = event?.to ?? payload?.to ?? event?.chatId ?? payload?.chatId;
      if (fallbackSender && WA_REGEX.test(fallbackSender)) {
        senderFinal = fallbackSender;
        this.logger.log(`Usando fallback senderFinal para mensagem fromMe=true: ${senderFinal}`);
      }
    }

    if (!senderFinal) {
      this.logger.warn(
        `Não foi possível determinar senderFinal. session=${session} fromMe=${fromMe} event=${JSON.stringify(event).substring(0, 200)}...`,
      );
      return false;
    }
    
    this.logger.log(`senderFinal determinado: ${senderFinal} (fromMe=${fromMe})`);

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

    let resolvedContentText =
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

    // Buscar mensagem original se for uma resposta (reply)
    // Nota: O schema atual não tem campo quotedMessageId, então por enquanto
    // vamos adicionar a informação da resposta no contentText se necessário
    if (isReply && replyToId) {
      // Tentar encontrar a mensagem original pelo messageId do WhatsApp
      const quotedMessage = await this.prisma.message.findFirst({
        where: {
          messageId: replyToId,
          tenantId: connection.tenantId,
        },
        select: { id: true, contentText: true },
      });
      
      if (quotedMessage) {
        this.logger.log(
          `Mensagem é resposta (reply). Mensagem original encontrada: messageId=${replyToId} -> id=${quotedMessage.id}`,
        );
        // Se não encontramos a mensagem original no banco, adicionar informação no texto
        // (em uma futura atualização do schema, podemos adicionar quotedMessageId)
        if (replyToBody && !resolvedContentText?.includes('↪') && !resolvedContentText?.includes('Resposta:')) {
          const quotedText = replyToBody.length > 50 
            ? `${replyToBody.substring(0, 50)}...` 
            : replyToBody;
          resolvedContentText = `↪ ${quotedText}\n\n${resolvedContentText || ''}`.trim();
        }
      } else {
        this.logger.warn(
          `Mensagem é resposta (reply) mas mensagem original não encontrada: messageId=${replyToId}. replyToBody=${replyToBody}`,
        );
        // Adicionar informação da resposta no texto da mensagem se não encontrar a original
        if (replyToBody && !resolvedContentText?.includes('↪') && !resolvedContentText?.includes('Resposta:')) {
          const quotedText = replyToBody.length > 50 
            ? `${replyToBody.substring(0, 50)}...` 
            : replyToBody;
          resolvedContentText = `↪ ${quotedText}\n\n${resolvedContentText || ''}`.trim();
        }
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

      const fileName = `${randomUUID()}.${extension}`;
      
      // Chave (caminho) do arquivo no MinIO
      const key = `chats/${yearMonth}/${fileName}`;
      
      // Upload para MinIO
      const publicUrl = await this.minioService.uploadFile(
        Buffer.from(response.data),
        key,
        contentType,
      );

      return publicUrl;
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

  private extractMessageText(payload: any, event?: any): string | null {
    // Lista completa de possíveis campos onde o texto pode estar
    const candidates = [
      // Campos no payload
      payload?.body,
      payload?.text,
      payload?.message,
      payload?.content,
      payload?.caption,
      payload?.value,
      payload?.description,
      payload?.conversation, // Campo importante para mensagens com fromMe
      // Campos aninhados no payload
      payload?.message?.text,
      payload?.message?.conversation,
      payload?.message?.body,
      // Campos no event (caso não esteja no payload)
      event?.body,
      event?.text,
      event?.message,
      event?.content,
      event?.conversation, // Campo importante para mensagens com fromMe
      // Campos em _data
      payload?._data?.body,
      payload?._data?.Body,
      payload?._data?.message,
      payload?._data?.text,
      payload?._data?.conversation,
      payload?._data?.Message?.conversation,
      payload?._data?.Message?.text,
      payload?._data?.Message?.body,
      payload?._data?.Message?.extendedTextMessage?.text,
      payload?._data?.Message?.templateMessage?.Format?.InteractiveMessageTemplate?.body?.text,
    ];

    // Procurar primeiro valor válido (string não vazia)
    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        const trimmed = value.trim();
        this.logger.debug(`Texto da mensagem extraído de: ${value} -> ${trimmed.substring(0, 50)}...`);
        return trimmed;
      }
    }

    // Fallback: buscar recursivamente em objetos aninhados
    const fallback = this.findStringValue(payload, [
      'body',
      'text',
      'message',
      'conversation', // Incluir 'conversation' na busca recursiva
      'content',
      'value',
      'caption',
    ]) || this.findStringValue(event, [
      'body',
      'text',
      'message',
      'conversation',
      'content',
      'value',
      'caption',
    ]);

    if (typeof fallback === 'string' && fallback.trim().length > 0) {
      this.logger.debug(`Texto da mensagem extraído (fallback): ${fallback.substring(0, 50)}...`);
      return fallback.trim();
    }

    this.logger.debug('Nenhum texto encontrado na mensagem');
    return null;
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

