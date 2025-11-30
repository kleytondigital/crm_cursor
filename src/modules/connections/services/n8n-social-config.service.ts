import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Connection } from '@prisma/client';
import { N8nSocialConnectionConfig } from '../types/n8n-social-payload.interface';
import { SocialConnectionMetadata } from '../types/social-connection-metadata.interface';

@Injectable()
export class N8nSocialConfigService {
  private readonly logger = new Logger(N8nSocialConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  private get n8nApiUrl(): string {
    return this.configService.get<string>('N8N_API_URL') || '';
  }

  private get n8nApiKey(): string {
    return this.configService.get<string>('N8N_API_KEY') || '';
  }

  /**
   * Obtém OAuth App ID (para referência no n8n)
   */
  private get oauthAppId(): string {
    return (
      this.configService.get<string>('META_OAUTH_APP_ID') ||
      this.configService.get<string>('META_APP_ID') ||
      ''
    );
  }

  /**
   * Obtém Graph App ID (para referência no n8n)
   */
  private get graphAppId(): string {
    return (
      this.configService.get<string>('META_GRAPH_APP_ID') ||
      this.oauthAppId ||
      ''
    );
  }

  /**
   * Envia configuração de conexão social para o n8n após OAuth bem-sucedido
   */
  async sendConnectionConfigToN8n(connection: Connection): Promise<void> {
    if (!this.n8nApiUrl) {
      this.logger.warn('N8N_API_URL não configurado. Pulando envio de configuração para n8n.');
      return;
    }

    const metadata = (connection.metadata as SocialConnectionMetadata) || {};
    const provider = connection.provider;

    if (provider !== 'INSTAGRAM' && provider !== 'FACEBOOK') {
      this.logger.warn(`Provider ${provider} não é uma conexão social. Pulando envio para n8n.`);
      return;
    }

    if (!metadata.accessToken) {
      this.logger.warn(`Conexão ${connection.id} não possui accessToken. Pulando envio para n8n.`);
      return;
    }

    const webhookUrl = this.configService.get<string>('WEBHOOK_SOCIAL_URL') || 
                      `${this.configService.get<string>('API_BASE_URL') || ''}/webhooks/social`;

    const config: N8nSocialConnectionConfig = {
      tenantId: connection.tenantId,
      connectionId: connection.id,
      provider,
      pageId: metadata.pageId,
      instagramBusinessId: metadata.instagramBusinessId,
      accessToken: metadata.accessToken,
      refreshToken: connection.refreshToken || undefined,
      tokenExpiresAt: metadata.tokenExpiresAt,
      webhookUrl,
      // Informações dos apps Meta (opcional - para referência no n8n)
      oauthAppId: this.oauthAppId || undefined,
      graphAppId: this.graphAppId || undefined,
      metadata: {
        pageName: metadata.pageName,
        instagramUsername: metadata.instagramUsername,
        pageCategory: metadata.pageCategory,
        permissions: metadata.permissions,
      },
    };

    try {
      // Enviar para endpoint do n8n (ajustar conforme sua configuração)
      const endpoint = `${this.n8nApiUrl}/webhook/social-connection-config`;
      
      await axios.post(endpoint, config, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.n8nApiKey ? { 'X-N8N-API-KEY': this.n8nApiKey } : {}),
        },
        timeout: 10000,
      });

      this.logger.log(`Configuração de conexão ${connection.id} enviada para n8n com sucesso`);
    } catch (error: any) {
      this.logger.error(
        `Erro ao enviar configuração para n8n: ${error.message}`,
        error.stack,
      );
      // Não lançar erro para não quebrar o fluxo de OAuth
    }
  }

  /**
   * Notifica n8n sobre atualização de token
   */
  async updateN8nOnTokenRefresh(connection: Connection): Promise<void> {
    if (!this.n8nApiUrl) {
      return;
    }

    const metadata = (connection.metadata as SocialConnectionMetadata) || {};

    try {
      const endpoint = `${this.n8nApiUrl}/webhook/social-token-update`;
      
      await axios.post(
        endpoint,
        {
          connectionId: connection.id,
          tenantId: connection.tenantId,
          accessToken: metadata.accessToken,
          refreshToken: connection.refreshToken,
          tokenExpiresAt: metadata.tokenExpiresAt,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.n8nApiKey ? { 'X-N8N-API-KEY': this.n8nApiKey } : {}),
          },
          timeout: 10000,
        },
      );

      this.logger.log(`Token atualizado notificado ao n8n para conexão ${connection.id}`);
    } catch (error: any) {
      this.logger.error(
        `Erro ao notificar n8n sobre atualização de token: ${error.message}`,
      );
    }
  }

  /**
   * Notifica n8n sobre desconexão
   */
  async notifyN8nOnDisconnect(connectionId: string, tenantId: string): Promise<void> {
    if (!this.n8nApiUrl) {
      return;
    }

    try {
      const endpoint = `${this.n8nApiUrl}/webhook/social-disconnect`;
      
      await axios.post(
        endpoint,
        {
          connectionId,
          tenantId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.n8nApiKey ? { 'X-N8N-API-KEY': this.n8nApiKey } : {}),
          },
          timeout: 10000,
        },
      );

      this.logger.log(`Desconexão notificada ao n8n para conexão ${connectionId}`);
    } catch (error: any) {
      this.logger.error(
        `Erro ao notificar n8n sobre desconexão: ${error.message}`,
      );
    }
  }
}

