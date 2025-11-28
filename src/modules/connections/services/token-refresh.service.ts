import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ConnectionProvider, ConnectionStatus } from '@prisma/client';
import { MetaOAuthService } from './meta-oauth.service';
import { N8nSocialConfigService } from './n8n-social-config.service';
import { SocialConnectionMetadata } from '../types/social-connection-metadata.interface';

@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaOAuthService: MetaOAuthService,
    private readonly n8nSocialConfigService: N8nSocialConfigService,
  ) {}

  /**
   * Verifica tokens próximos do vencimento
   * Nota: Para habilitar execução automática, instale @nestjs/schedule e adicione ScheduleModule ao AppModule
   * Depois, descomente o decorator @Cron abaixo
   */
  // @Cron(CronExpression.EVERY_6_HOURS)
  async checkAndRefreshTokens() {
    this.logger.log('Iniciando verificação de tokens próximos do vencimento...');

    try {
      // Buscar conexões sociais ativas com token expirando em menos de 7 dias
      const connections = await this.prisma.connection.findMany({
        where: {
          provider: {
            in: [ConnectionProvider.INSTAGRAM, ConnectionProvider.FACEBOOK],
          },
          status: ConnectionStatus.ACTIVE,
          isActive: true,
          refreshToken: {
            not: null,
          },
        },
      });

      this.logger.log(`Encontradas ${connections.length} conexões sociais para verificar`);

      for (const connection of connections) {
        try {
          await this.refreshTokenIfNeeded(connection);
        } catch (error: any) {
          this.logger.error(
            `Erro ao renovar token da conexão ${connection.id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log('Verificação de tokens concluída');
    } catch (error: any) {
      this.logger.error(`Erro na verificação de tokens: ${error.message}`, error.stack);
    }
  }

  /**
   * Verifica se o token precisa ser renovado e renova se necessário
   */
  private async refreshTokenIfNeeded(connection: any) {
    const metadata = (connection.metadata as SocialConnectionMetadata) || {};

    if (!metadata.tokenExpiresAt) {
      this.logger.warn(`Conexão ${connection.id} não possui data de expiração`);
      return;
    }

    if (!connection.refreshToken) {
      this.logger.warn(`Conexão ${connection.id} não possui refresh token`);
      return;
    }

    const expirationDate = new Date(metadata.tokenExpiresAt);
    const now = new Date();
    const daysUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // Renovar se expirar em menos de 7 dias
    if (daysUntilExpiration < 7) {
      this.logger.log(
        `Token da conexão ${connection.id} expira em ${daysUntilExpiration.toFixed(1)} dias. Renovando...`,
      );

      await this.refreshToken(connection);
    } else {
      this.logger.debug(
        `Token da conexão ${connection.id} ainda válido por ${daysUntilExpiration.toFixed(1)} dias`,
      );
    }
  }

  /**
   * Renova token de uma conexão específica
   */
  async refreshToken(connection: any) {
    if (!connection.refreshToken) {
      throw new Error('Conexão não possui refresh token');
    }

    try {
      const tokenResponse = await this.metaOAuthService.refreshAccessToken(
        connection.refreshToken,
      );

      const metadata = (connection.metadata as SocialConnectionMetadata) || {};
      metadata.accessToken = tokenResponse.access_token;
      metadata.tokenExpiresAt = this.metaOAuthService
        .calculateExpirationDate(tokenResponse.expires_in)
        .toISOString();

      const updated = await this.prisma.connection.update({
        where: { id: connection.id },
        data: {
          metadata: metadata as any,
        },
      });

      // Notificar n8n sobre atualização
      await this.n8nSocialConfigService.updateN8nOnTokenRefresh(updated);

      this.logger.log(
        `Token da conexão ${connection.id} renovado com sucesso. Nova expiração: ${metadata.tokenExpiresAt}`,
      );

      return updated;
    } catch (error: any) {
      this.logger.error(
        `Erro ao renovar token da conexão ${connection.id}: ${error.message}`,
      );

      // Se o refresh token também expirou, marcar conexão como erro
      if (error.response?.data?.error?.code === 190) {
        await this.prisma.connection.update({
          where: { id: connection.id },
          data: {
            status: ConnectionStatus.ERROR,
            isActive: false,
          },
        });

        this.logger.warn(
          `Conexão ${connection.id} marcada como erro devido a refresh token expirado`,
        );
      }

      throw error;
    }
  }
}

