import { Injectable, Logger } from '@nestjs/common';
import {
  ContentType,
  MessageDirection,
  SenderType,
} from '@prisma/client';
import { ConnectionProvider } from '@prisma/client';

export interface NormalizedSocialMessage {
  messageId: string;
  senderId: string;
  senderName?: string;
  senderPicture?: string;
  contentText?: string;
  contentType: ContentType;
  mediaUrl?: string;
  mediaMimeType?: string;
  timestamp: Date;
  direction: MessageDirection;
  senderType: SenderType;
  provider: ConnectionProvider;
  connectionId: string;
  tenantId: string;
}

@Injectable()
export class SocialMessageNormalizerService {
  private readonly logger = new Logger(SocialMessageNormalizerService.name);

  /**
   * Normaliza payload do n8n (que vem da Meta) para formato interno do CRM
   */
  normalize(
    payload: any,
    connection: any,
  ): NormalizedSocialMessage | null {
    try {
      // Payload esperado do n8n:
      // {
      //   provider: 'INSTAGRAM' | 'FACEBOOK',
      //   tenantId: string,
      //   connectionId: string,
      //   message: {
      //     id: string,
      //     from: { id: string, name?: string, picture?: string },
      //     text?: string,
      //     type: 'text' | 'image' | 'video' | 'audio' | 'file',
      //     mediaUrl?: string,
      //     mediaMimeType?: string,
      //     timestamp: string | number,
      //     isFromMe?: boolean,
      //   }
      // }

      const provider = payload.provider === 'INSTAGRAM' 
        ? ConnectionProvider.INSTAGRAM 
        : ConnectionProvider.FACEBOOK;

      const message = payload.message || payload;
      const from = message.from || {};
      const senderId = from.id || message.senderId || message.fromId || '';
      const senderName = from.name || message.senderName || null;
      const senderPicture = from.picture || message.senderPicture || null;

      if (!senderId) {
        this.logger.warn('Payload sem senderId. Ignorando mensagem.');
        return null;
      }

      const messageId = message.id || message.messageId || `${provider}_${senderId}_${Date.now()}`;
      const messageType = message.type || 'text';
      const isFromMe = message.isFromMe || false;

      // Determinar tipo de conteúdo
      const contentType = this.mapContentType(messageType, message.mediaMimeType);

      // Extrair texto
      const contentText = message.text || message.content || null;

      // Extrair mídia
      const mediaUrl = message.mediaUrl || message.attachment?.url || null;
      const mediaMimeType = message.mediaMimeType || message.attachment?.mimeType || null;

      // Timestamp
      let timestamp: Date;
      if (message.timestamp) {
        if (typeof message.timestamp === 'number') {
          // Se for timestamp em segundos, converter para milissegundos
          timestamp = new Date(message.timestamp * 1000);
        } else if (typeof message.timestamp === 'string') {
          timestamp = new Date(message.timestamp);
        } else {
          timestamp = new Date();
        }
      } else {
        timestamp = new Date();
      }

      return {
        messageId,
        senderId,
        senderName: senderName || undefined,
        senderPicture: senderPicture || undefined,
        contentText: contentText || undefined,
        contentType,
        mediaUrl: mediaUrl || undefined,
        mediaMimeType: mediaMimeType || undefined,
        timestamp,
        direction: isFromMe ? MessageDirection.OUTGOING : MessageDirection.INCOMING,
        senderType: isFromMe ? SenderType.USER : SenderType.LEAD,
        provider,
        connectionId: connection.id,
        tenantId: connection.tenantId,
      };
    } catch (error: any) {
      this.logger.error(
        `Erro ao normalizar mensagem social: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Mapeia tipo de mensagem da Meta para ContentType do Prisma
   */
  private mapContentType(
    messageType: string,
    mimeType?: string,
  ): ContentType {
    const normalizedType = messageType?.toLowerCase() || 'text';

    switch (normalizedType) {
      case 'image':
        return ContentType.IMAGE;
      case 'video':
        return ContentType.VIDEO;
      case 'audio':
        return ContentType.AUDIO;
      case 'file':
      case 'document':
        return ContentType.DOCUMENT;
      case 'location':
        return ContentType.LOCATION;
      case 'text':
      default:
        return ContentType.TEXT;
    }
  }
}

