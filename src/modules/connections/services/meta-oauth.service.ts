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

  /**
   * App ID para autenticação OAuth (login)
   * Se META_OAUTH_APP_ID não existir, usa META_APP_ID para compatibilidade
   */
  private get oauthAppId(): string {
    return (
      this.configService.get<string>('META_OAUTH_APP_ID') ||
      this.configService.get<string>('META_APP_ID') ||
      ''
    );
  }

  /**
   * App Secret para autenticação OAuth (login)
   * Se META_OAUTH_APP_SECRET não existir, usa META_APP_SECRET para compatibilidade
   */
  private get oauthAppSecret(): string {
    return (
      this.configService.get<string>('META_OAUTH_APP_SECRET') ||
      this.configService.get<string>('META_APP_SECRET') ||
      ''
    );
  }

  /**
   * App ID para operações Graph API (Instagram/Messenger)
   * Se META_GRAPH_APP_ID não existir, usa o OAuth App ID para compatibilidade
   */
  private get graphAppId(): string {
    return (
      this.configService.get<string>('META_GRAPH_APP_ID') ||
      this.oauthAppId ||
      ''
    );
  }

  /**
   * App Secret para operações Graph API (Instagram/Messenger)
   * Se META_GRAPH_APP_SECRET não existir, usa o OAuth App Secret para compatibilidade
   */
  private get graphAppSecret(): string {
    return (
      this.configService.get<string>('META_GRAPH_APP_SECRET') ||
      this.oauthAppSecret ||
      ''
    );
  }

  /**
   * Mantido para compatibilidade (deprecated - usar oauthAppId)
   * @deprecated Use oauthAppId ou graphAppId conforme necessário
   */
  private get appId(): string {
    return this.oauthAppId;
  }

  /**
   * Mantido para compatibilidade (deprecated - usar oauthAppSecret)
   * @deprecated Use oauthAppSecret ou graphAppSecret conforme necessário
   */
  private get appSecret(): string {
    return this.oauthAppSecret;
  }

  private get redirectUri(): string {
    return this.configService.get<string>('META_REDIRECT_URI') || '';
  }

  /**
   * Gera URL de autorização OAuth da Meta
   * 
   * IMPORTANTE: O App OAuth deve ter escopos mínimos apenas para login.
   * Os escopos de páginas/Instagram devem ser solicitados via App Graph API separadamente.
   */
  generateAuthUrl(tenantId: string, provider: 'INSTAGRAM' | 'FACEBOOK', redirectUri?: string): string {
    if (!this.oauthAppId) {
      throw new InternalServerErrorException(
        'META_OAUTH_APP_ID ou META_APP_ID não configurado',
      );
    }

    const finalRedirectUri = this.normalizeRedirectUri(redirectUri || this.redirectUri);
    if (!finalRedirectUri) {
      throw new InternalServerErrorException('META_REDIRECT_URI não configurado');
    }

    // Escopos mínimos para login OAuth (apenas autenticação básica)
    // NOTA: Os escopos de páginas/Instagram devem ser solicitados via App Graph API
    // Se o App Graph API estiver configurado, não solicita escopos aqui para evitar erro
    const useGraphApp = !!this.graphAppId && this.graphAppId !== this.oauthAppId;
    
    const scopes = useGraphApp 
      ? [] // App OAuth apenas para login - escopos serão solicitados via Graph App
      : [
          // Fallback: se usar app único, solicita todos os escopos (compatibilidade)
          'pages_show_list',
          'pages_messaging',
          'instagram_basic',
          'instagram_manage_messages',
          'pages_read_engagement',
        ];

    // State contém tenantId e provider para recuperar no callback
    const state = Buffer.from(JSON.stringify({ tenantId, provider })).toString('base64');

    const params = new URLSearchParams({
      client_id: this.oauthAppId, // Usar OAuth App ID para autenticação
      redirect_uri: finalRedirectUri, // URI normalizado
      response_type: 'code',
      state,
      auth_type: 'rerequest', // Força re-autorização se necessário
      ...(scopes.length > 0 && { scope: scopes.join(',') }), // Só adiciona scope se houver escopos
    });

    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Normaliza redirect URI para garantir consistência (remove trailing slash, etc)
   */
  private normalizeRedirectUri(uri: string): string {
    return uri.replace(/\/+$/, ''); // Remove trailing slash
  }

  /**
   * Troca code OAuth por access_token
   */
  async exchangeCodeForToken(code: string, redirectUri?: string, useGraphApp: boolean = false): Promise<MetaOAuthResponse> {
    const finalRedirectUri = this.normalizeRedirectUri(redirectUri || this.redirectUri);
    if (!finalRedirectUri) {
      throw new InternalServerErrorException('META_REDIRECT_URI não configurado');
    }

    // Determinar qual app usar baseado no parâmetro
    const appId = useGraphApp ? this.graphAppId : this.oauthAppId;
    const appSecret = useGraphApp ? this.graphAppSecret : this.oauthAppSecret;

    if (!appId || !appSecret) {
      const appType = useGraphApp ? 'Graph API' : 'OAuth';
      throw new InternalServerErrorException(
        `Credenciais Meta ${appType} não configuradas`,
      );
    }

    try {
      const response = await axios.get<MetaOAuthResponse>(`${this.baseUrl}/oauth/access_token`, {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: finalRedirectUri, // Usar URI normalizado
          code,
        },
      });

      this.logger.log(`Token OAuth obtido com sucesso usando ${useGraphApp ? 'Graph' : 'OAuth'} App`);
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
    if (!this.oauthAppSecret) {
      throw new InternalServerErrorException(
        'META_OAUTH_APP_SECRET ou META_APP_SECRET não configurado',
      );
    }

    try {
      const response = await axios.get<MetaLongLivedTokenResponse>(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.oauthAppId, // Usar OAuth App ID
            client_secret: this.oauthAppSecret, // Usar OAuth App Secret
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
    if (!this.oauthAppSecret) {
      throw new InternalServerErrorException(
        'META_OAUTH_APP_SECRET ou META_APP_SECRET não configurado',
      );
    }

    try {
      const response = await axios.get<MetaLongLivedTokenResponse>(
        `${this.baseUrl}/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.oauthAppId, // Usar OAuth App ID
            client_secret: this.oauthAppSecret, // Usar OAuth App Secret
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
    // Para debug_token, usar Graph App ID/Secret (pode ser diferente do OAuth)
    if (!this.graphAppId || !this.graphAppSecret) {
      throw new InternalServerErrorException(
        'Credenciais Meta Graph API não configuradas (META_GRAPH_APP_ID/META_GRAPH_APP_SECRET ou fallback)',
      );
    }

    try {
      const response = await axios.get(`${this.baseUrl}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: `${this.graphAppId}|${this.graphAppSecret}`, // Usar Graph App para debug
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
   * Gera URL de autorização adicional para solicitar escopos de páginas/Instagram
   * Usa o App Graph API para solicitar permissões específicas após login OAuth básico
   * 
   * IMPORTANTE: Este método deve ser chamado após o login OAuth básico para obter
   * os escopos necessários para acessar páginas e Instagram.
   */
  generateGraphApiAuthUrl(
    tenantId: string,
    provider: 'INSTAGRAM' | 'FACEBOOK',
    redirectUri?: string,
  ): string {
    if (!this.graphAppId || this.graphAppId === this.oauthAppId) {
      // Se não houver Graph App separado, não precisa de segunda autorização
      throw new InternalServerErrorException(
        'META_GRAPH_APP_ID não configurado ou igual ao OAuth App. Use generateAuthUrl() com escopos.',
      );
    }

    const finalRedirectUri = this.normalizeRedirectUri(redirectUri || this.redirectUri);
    if (!finalRedirectUri) {
      throw new InternalServerErrorException('META_REDIRECT_URI não configurado');
    }

    // Escopos necessários para páginas e Instagram (solicitados via Graph App)
    const scopes = [
      'pages_show_list',
      'pages_messaging',
      'instagram_basic',
      'instagram_manage_messages',
      'pages_read_engagement',
    ].join(',');

    // State contém tenantId e provider para recuperar no callback
    const state = Buffer.from(JSON.stringify({ tenantId, provider, step: 'graph' })).toString('base64');

    const params = new URLSearchParams({
      client_id: this.graphAppId, // Usar Graph App ID
      redirect_uri: finalRedirectUri, // URI normalizado (deve ser EXATAMENTE o mesmo da primeira etapa)
      scope: scopes,
      response_type: 'code',
      state,
      auth_type: 'rerequest',
    });

    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
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

