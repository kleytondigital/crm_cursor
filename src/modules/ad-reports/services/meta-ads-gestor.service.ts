import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { SocialConnectionMetadata } from '@/modules/connections/types/social-connection-metadata.interface';
import axios, { AxiosError } from 'axios';

export enum MetaAdsGestorAction {
  LIST_CONTAS = 'list_contas',
  LIST_CAMPANHAS = 'list_campanhas',
  LIST_METRICAS = 'list_metricas',
}

export interface MetaAdsGestorRequest {
  action: MetaAdsGestorAction;
  tenantId: string;
  connectionId: string;
  userAccessToken: string; // Token de acesso do usuário (obrigatório para Meta Ads)
  adAccountId?: string;
  campaignId?: string;
  adsetId?: string;
  adId?: string;
  dateStart?: string;
  dateEnd?: string;
  [key: string]: any;
}

export interface MetaAdsGestorResponse {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable()
export class MetaAdsGestorService {
  private readonly logger = new Logger(MetaAdsGestorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Verificar se a URL está configurada na inicialização
    const url = this.configService.get<string>('N8N_WEBHOOK_GESTOR_META');
    if (url) {
      this.logger.log(`[MetaAdsGestor] Inicializado. Webhook URL: ${url}`);
    } else {
      this.logger.warn('[MetaAdsGestor] N8N_WEBHOOK_GESTOR_META não configurado no .env');
    }
  }

  private get webhookUrl(): string {
    const url = this.configService.get<string>('N8N_WEBHOOK_GESTOR_META');
    if (!url) {
      this.logger.error('[MetaAdsGestor] Tentativa de usar webhook URL sem configuração');
      throw new InternalServerErrorException(
        'N8N_WEBHOOK_GESTOR_META não configurado. Configure a variável de ambiente no .env',
      );
    }
    return url;
  }

  /**
   * Chama o webhook gestor do n8n com uma ação específica
   */
  async callGestor(request: MetaAdsGestorRequest): Promise<MetaAdsGestorResponse> {
    const webhookUrl = this.webhookUrl;
    
    this.logger.log(
      `[MetaAdsGestor] Iniciando chamada ao webhook gestor. Action: ${request.action}, URL: ${webhookUrl}, ConnectionId: ${request.connectionId}, TenantId: ${request.tenantId}`,
    );

    try {
      this.logger.log(
        `[MetaAdsGestor] Payload da requisição: ${JSON.stringify(request)}`,
      );

      const response = await axios.post<MetaAdsGestorResponse>(webhookUrl, request, {
        timeout: 30000, // 30 segundos
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(
        `[MetaAdsGestor] Resposta recebida. Status: ${response.status}, Data: ${JSON.stringify(response.data)}`,
      );

      if (!response.data.success) {
        this.logger.error(
          `[MetaAdsGestor] Webhook retornou success=false. Action: ${request.action}, Erro: ${response.data.error}`,
        );
        throw new BadRequestException(
          response.data.error || `Erro ao processar ação ${request.action}`,
        );
      }

      this.logger.log(`[MetaAdsGestor] Webhook executado com sucesso. Action: ${request.action}`);
      return response.data;
    } catch (error: unknown) {
      if (this.isAxiosError(error)) {
        // Erro de conexão (não chegou no servidor)
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          this.logger.error(
            `[MetaAdsGestor] Erro de conexão ao webhook. URL: ${webhookUrl}, Código: ${error.code}, Mensagem: ${error.message}`,
          );
          throw new InternalServerErrorException(
            `Não foi possível conectar ao webhook gestor. Verifique se a URL está correta e se o n8n está rodando. URL: ${webhookUrl}`,
          );
        }

        // Erro de timeout
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          this.logger.error(
            `[MetaAdsGestor] Timeout ao chamar webhook. URL: ${webhookUrl}, Timeout: 30s`,
          );
          throw new InternalServerErrorException(
            'Timeout ao chamar webhook gestor. O n8n pode estar sobrecarregado ou o workflow está demorando muito para responder.',
          );
        }

        // Erro HTTP (resposta do servidor)
        const status = error.response?.status;
        const errorData = error.response?.data as any;
        this.logger.error(
          `[MetaAdsGestor] Erro HTTP ao chamar webhook. Status: ${status}, URL: ${webhookUrl}, Response: ${JSON.stringify(errorData)}`,
        );
        
        throw new BadRequestException(
          errorData?.error?.message || 
          errorData?.error || 
          errorData?.message ||
          `Erro ao chamar webhook gestor Meta Ads. Status: ${status}`,
        );
      }

      // Erro não-Axios
      this.logger.error(
        `[MetaAdsGestor] Erro inesperado ao chamar webhook. Tipo: ${typeof error}, Mensagem: ${error instanceof Error ? error.message : String(error)}, Stack: ${error instanceof Error ? error.stack : 'N/A'}`,
      );
      throw new InternalServerErrorException(
        `Erro inesperado ao chamar webhook gestor: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Busca token de acesso da conexão
   */
  private async getConnectionToken(tenantId: string, connectionId: string): Promise<string> {
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId,
        isActive: true,
      },
    });

    if (!connection) {
      throw new BadRequestException('Conexão não encontrada ou inativa');
    }

    const metadata = connection.metadata as SocialConnectionMetadata | null;
    const userAccessToken = metadata?.userAccessToken || metadata?.accessToken;

    if (!userAccessToken) {
      throw new BadRequestException(
        'Token de acesso não encontrado na conexão. É necessário um user access token com escopo ads_read para acessar contas de anúncio.',
      );
    }

    return userAccessToken;
  }

  /**
   * Lista contas de anúncio disponíveis para uma conexão
   */
  async listContas(tenantId: string, connectionId: string): Promise<any[]> {
    const userAccessToken = await this.getConnectionToken(tenantId, connectionId);
    
    const response = await this.callGestor({
      action: MetaAdsGestorAction.LIST_CONTAS,
      tenantId,
      connectionId,
      userAccessToken,
    });

    return response.data || [];
  }

  /**
   * Lista campanhas de uma conta de anúncio
   */
  async listCampanhas(
    tenantId: string,
    connectionId: string,
    adAccountId: string,
  ): Promise<any[]> {
    const userAccessToken = await this.getConnectionToken(tenantId, connectionId);
    
    const response = await this.callGestor({
      action: MetaAdsGestorAction.LIST_CAMPANHAS,
      tenantId,
      connectionId,
      adAccountId,
      userAccessToken,
    });

    return response.data || [];
  }

  /**
   * Lista métricas de uma conta/campanha/conjunto/anúncio
   */
  async listMetricas(
    tenantId: string,
    connectionId: string,
    adAccountId: string,
    dateStart: string,
    dateEnd: string,
    campaignId?: string,
    adsetId?: string,
    adId?: string,
  ): Promise<any> {
    const userAccessToken = await this.getConnectionToken(tenantId, connectionId);
    
    const request: MetaAdsGestorRequest = {
      action: MetaAdsGestorAction.LIST_METRICAS,
      tenantId,
      connectionId,
      adAccountId,
      dateStart,
      dateEnd,
      userAccessToken,
    };

    if (campaignId) request.campaignId = campaignId;
    if (adsetId) request.adsetId = adsetId;
    if (adId) request.adId = adId;

    const response = await this.callGestor(request);
    return response.data || {};
  }

  private isAxiosError(error: any): error is AxiosError {
    return !!error?.isAxiosError;
  }
}

