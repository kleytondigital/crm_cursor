import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ConnectionProvider } from '@prisma/client';
import { N8nSocialMessagePayload } from '@/modules/connections/types/n8n-social-payload.interface';
import { SendSocialMessageDto } from '@/modules/connections/dto/send-social-message.dto';

@Injectable()
export class SocialMessageSenderService {
  private readonly logger = new Logger(SocialMessageSenderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private get n8nApiUrl(): string {
    return this.configService.get<string>('N8N_API_URL') || '';
  }

  private get n8nApiKey(): string {
    return this.configService.get<string>('N8N_API_KEY') || '';
  }

  /**
   * Envia mensagem via n8n para Instagram/Facebook
   */
  async sendToN8n(message: SendSocialMessageDto, connectionId: string, tenantId: string) {
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
      throw new NotFoundException('Conexão social não encontrada ou inativa');
    }

    // Validar que o provider da conexão corresponde ao esperado
    const expectedProvider = connection.provider === ConnectionProvider.INSTAGRAM ? 'INSTAGRAM' : 'FACEBOOK';
    
    // Preparar payload para n8n
    const payload: N8nSocialMessagePayload = {
      provider: expectedProvider,
      recipientId: message.recipientId,
      messageType: message.messageType,
      content: message.content,
      mediaUrl: message.mediaUrl,
      tempId: message.tempId,
      replyTo: message.replyTo,
    };

    try {
      // Enviar para endpoint do n8n
      const endpoint = `${this.n8nApiUrl}/webhook/send-social-message`;
      
      const response = await axios.post(
        endpoint,
        {
          connectionId: connection.id,
          tenantId: connection.tenantId,
          ...payload,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.n8nApiKey ? { 'X-N8N-API-KEY': this.n8nApiKey } : {}),
          },
          timeout: 30000, // 30 segundos para envio de mídia
        },
      );

      this.logger.log(`Mensagem social enviada via n8n: messageId=${message.tempId || 'N/A'}`);
      
      return {
        success: true,
        messageId: response.data?.messageId || message.tempId,
        data: response.data,
      };
    } catch (error: any) {
      this.logger.error(
        `Erro ao enviar mensagem social via n8n: ${error.message}`,
        error.stack,
      );

      if (error.response?.data) {
        throw new BadRequestException(
          error.response.data.error?.message || 'Erro ao enviar mensagem',
        );
      }

      throw new BadRequestException('Erro ao enviar mensagem via n8n');
    }
  }
}

