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
  // Campos para correlação com Meta Ads
  adId?: string;
  campaignId?: string;
  adsetId?: string;
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

      this.logger.debug(
        `[normalize] Provider determinado: ${provider} (payload.provider=${payload.provider})`,
      );

      const message = payload.message || payload;
      this.logger.debug(
        `[normalize] Message extraído. Keys: ${Object.keys(message).join(', ')}`,
      );

      const from = message.from || {};
      const senderId = from.id || message.senderId || message.fromId || '';
      const senderName = from.name || message.senderName || null;
      const senderPicture = from.picture || message.senderPicture || null;

      this.logger.debug(
        `[normalize] Dados do remetente: senderId=${senderId} senderName=${senderName} from=${JSON.stringify(from)}`,
      );

      if (!senderId) {
        this.logger.error('❌ Payload sem senderId. Ignorando mensagem.');
        this.logger.error(`Payload completo: ${JSON.stringify(payload, null, 2)}`);
        this.logger.error(`Message extraído: ${JSON.stringify(message, null, 2)}`);
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

      // Extrair informações de Meta Ads (quando disponível)
      const adId = message.ad_id || message.adId || undefined;
      const campaignId = message.campaign_id || message.campaignId || undefined;
      const adsetId = message.adset_id || message.adsetId || undefined;

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
        adId,
        campaignId,
        adsetId,
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

