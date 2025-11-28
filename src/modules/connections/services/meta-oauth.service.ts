import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  MetaOAuthResponse,
  MetaLongLivedTokenResponse,
  MetaPageInfo,
  MetaInstagramBusinessAccount,
} from '../types/meta-oauth-response.interface';
import { SocialConnectionMetadata } from '../types/social-connection-metadata.interface';

@Injectable()
export class MetaOAuthService {
  private readonly logger = new Logger(MetaOAuthService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';

  constructor(private readonly configService: ConfigService) {}

  private get appId(): string {
    return this.configService.get<string>('META_APP_ID') || '';
  }

  private get appSecret(): string {
    return this.configService.get<string>('META_APP_SECRET') || '';
  }

  private get redirectUri(): string {
    return this.configService.get<string>('META_REDIRECT_URI') || '';
  }

  /**
   * Gera URL de autorização OAuth da Meta
   */
  generateAuthUrl(tenantId: string, provider: 'INSTAGRAM' | 'FACEBOOK', redirectUri?: string): string {
    if (!this.appId) {
      throw new InternalServerErrorException('META_APP_ID não configurado');
    }

    const finalRedirectUri = redirectUri || this.redirectUri;
    if (!finalRedirectUri) {
      throw new InternalServerErrorException('META_REDIRECT_URI não configurado');
    }

    // Escopos necessários para Instagram e Facebook Messenger
    const scopes = [
      'pages_show_list',
      'pages_messaging',
      'instagram_basic',
      'instagram_manage_messages',
      'pages_read_engagement',
    ].join(',');

    // State contém tenantId e provider para recuperar no callback
    const state = Buffer.from(JSON.stringify({ tenantId, provider })).toString('base64');

    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: finalRedirectUri,
      scope: scopes,
      response_type: 'code',
      state,
      auth_type: 'rerequest', // Força re-autorização se necessário
    });

    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Troca code OAuth por access_token
   */
  async exchangeCodeForToken(code: string, redirectUri?: string): Promise<MetaOAuthResponse> {
    if (!this.appId || !this.appSecret) {
      throw new InternalServerErrorException('Credenciais Meta não configuradas');
    }

    const finalRedirectUri = redirectUri || this.redirectUri;
    if (!finalRedirectUri) {
      throw new InternalServerErrorException('META_REDIRECT_URI não configurado');
    }

    try {
      const response = await axios.get<MetaOAuthResponse>(`${this.baseUrl}/oauth/access_token`, {
        params: {
          client_id: this.appId,
          client_secret: this.appSecret,
          redirect_uri: finalRedirectUri,
          code,
        },
      });

      this.logger.log('Token OAuth obtido com sucesso');
      return response.data;
    } catch (error: unknown) {
      if (this.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        this.logger.error(`Erro ao trocar code por token: ${JSON.stringify(errorData)}`);
        throw new BadRequestException(
          errorData?.error?.message || 'Erro ao obter token de acesso',
        );
      }
      throw new InternalServerErrorException('Erro inesperado ao obter token OAuth');
    }
  }

  /**
   * Converte short-lived token para long-lived token (60 dias)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<MetaLongLivedTokenResponse> {
    if (!this.appSecret) {
      throw new InternalServerErrorException('META_APP_SECRET não configurado');
    }

    try {
      const response = await axios.get<MetaLongLivedTokenResponse>(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken,
          },
        },
      );

      this.logger.log('Long-lived token obtido com sucesso');
      return response.data;
    } catch (error: unknown) {
      if (this.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        this.logger.error(`Erro ao obter long-lived token: ${JSON.stringify(errorData)}`);
        throw new BadRequestException(
          errorData?.error?.message || 'Erro ao obter token de longa duração',
        );
      }
      throw new InternalServerErrorException('Erro inesperado ao obter long-lived token');
    }
  }

  /**
   * Renova access_token usando refresh_token
   */
  async refreshAccessToken(refreshToken: string): Promise<MetaLongLivedTokenResponse> {
    if (!this.appSecret) {
      throw new InternalServerErrorException('META_APP_SECRET não configurado');
    }

    try {
      const response = await axios.get<MetaLongLivedTokenResponse>(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: refreshToken,
          },
        },
      );

      this.logger.log('Token renovado com sucesso');
      return response.data;
    } catch (error: unknown) {
      if (this.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        this.logger.error(`Erro ao renovar token: ${JSON.stringify(errorData)}`);
        throw new BadRequestException(
          errorData?.error?.message || 'Erro ao renovar token',
        );
      }
      throw new InternalServerErrorException('Erro inesperado ao renovar token');
    }
  }

  /**
   * Busca informações das páginas do usuário
   */
  async getPages(accessToken: string): Promise<MetaPageInfo[]> {
    try {
      const response = await axios.get<{ data: MetaPageInfo[] }>(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,category,tasks,access_token',
        },
      });

      return response.data.data || [];
    } catch (error: unknown) {
      if (this.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        this.logger.error(`Erro ao buscar páginas: ${JSON.stringify(errorData)}`);
        throw new BadRequestException(
          errorData?.error?.message || 'Erro ao buscar páginas',
        );
      }
      throw new InternalServerErrorException('Erro inesperado ao buscar páginas');
    }
  }

  /**
   * Busca informações de uma página específica
   */
  async getPageInfo(pageId: string, accessToken: string): Promise<MetaPageInfo> {
    try {
      const response = await axios.get<MetaPageInfo>(`${this.baseUrl}/${pageId}`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,category,tasks',
        },
      });

      return response.data;
    } catch (error: unknown) {
      if (this.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        this.logger.error(`Erro ao buscar informações da página: ${JSON.stringify(errorData)}`);
        throw new BadRequestException(
          errorData?.error?.message || 'Erro ao buscar informações da página',
        );
      }
      throw new InternalServerErrorException('Erro inesperado ao buscar informações da página');
    }
  }

  /**
   * Busca conta Instagram Business vinculada a uma página
   */
  async getInstagramBusinessAccount(
    pageId: string,
    pageAccessToken: string,
  ): Promise<MetaInstagramBusinessAccount | null> {
    try {
      const response = await axios.get<{ instagram_business_account?: MetaInstagramBusinessAccount }>(
        `${this.baseUrl}/${pageId}`,
        {
          params: {
            access_token: pageAccessToken,
            fields: 'instagram_business_account{id,username,profile_picture_url}',
          },
        },
      );

      return response.data.instagram_business_account || null;
    } catch (error) {
      if (this.isAxiosError(error)) {
        this.logger.warn(`Página ${pageId} não possui Instagram Business vinculado`);
        return null;
      }
      this.logger.error(`Erro ao buscar Instagram Business: ${error}`);
      return null;
    }
  }

  /**
   * Busca informações do token (validade, permissões, etc.)
   */
  async getTokenInfo(accessToken: string): Promise<{
    app_id: string;
    type: string;
    application: string;
    expires_at: number;
    is_valid: boolean;
    issued_at: number;
    scopes: string[];
    user_id: string;
  }> {
    try {
      const response = await axios.get(`${this.baseUrl}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: `${this.appId}|${this.appSecret}`,
        },
      });

      return response.data.data;
    } catch (error) {
      if (this.isAxiosError(error)) {
        this.logger.error(`Erro ao buscar informações do token: ${JSON.stringify(error.response?.data)}`);
        throw new BadRequestException('Erro ao validar token');
      }
      throw new InternalServerErrorException('Erro inesperado ao validar token');
    }
  }

  /**
   * Calcula data de expiração baseado em expires_in (segundos)
   */
  calculateExpirationDate(expiresIn: number): Date {
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + expiresIn);
    return expirationDate;
  }

  private isAxiosError(error: any): error is AxiosError {
    return !!error?.isAxiosError;
  }
}

