import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  constructor(private readonly configService: ConfigService) {}

  private get webhookUrl(): string {
    const url = this.configService.get<string>('N8N_WEBHOOK_GESTOR_META');
    if (!url) {
      throw new InternalServerErrorException('N8N_WEBHOOK_GESTOR_META não configurado');
    }
    return url;
  }

  /**
   * Chama o webhook gestor do n8n com uma ação específica
   */
  async callGestor(request: MetaAdsGestorRequest): Promise<MetaAdsGestorResponse> {
    try {
      this.logger.log(
        `Chamando webhook gestor Meta Ads. Action: ${request.action}, ConnectionId: ${request.connectionId}`,
      );

      const response = await axios.post<MetaAdsGestorResponse>(this.webhookUrl, request, {
        timeout: 30000, // 30 segundos
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.data.success) {
        this.logger.error(
          `Webhook gestor retornou erro. Action: ${request.action}, Erro: ${response.data.error}`,
        );
        throw new BadRequestException(
          response.data.error || `Erro ao processar ação ${request.action}`,
        );
      }

      this.logger.log(`Webhook gestor executado com sucesso. Action: ${request.action}`);
      return response.data;
    } catch (error: unknown) {
      if (this.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        this.logger.error(
          `Erro ao chamar webhook gestor. Action: ${request.action}, Erro: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          errorData?.error?.message || errorData?.error || 'Erro ao chamar webhook gestor Meta Ads',
        );
      }
      throw new InternalServerErrorException('Erro inesperado ao chamar webhook gestor');
    }
  }

  /**
   * Lista contas de anúncio disponíveis para uma conexão
   */
  async listContas(tenantId: string, connectionId: string): Promise<any[]> {
    const response = await this.callGestor({
      action: MetaAdsGestorAction.LIST_CONTAS,
      tenantId,
      connectionId,
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
    const response = await this.callGestor({
      action: MetaAdsGestorAction.LIST_CAMPANHAS,
      tenantId,
      connectionId,
      adAccountId,
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
    const request: MetaAdsGestorRequest = {
      action: MetaAdsGestorAction.LIST_METRICAS,
      tenantId,
      connectionId,
      adAccountId,
      dateStart,
      dateEnd,
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

