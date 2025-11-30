import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import {
  MetaAdAccount,
  MetaAdAccountDetails,
  MetaAdAccountsListResponse,
} from '../types/meta-ads-account.interface';

@Injectable()
export class MetaAdsApiService {
  private readonly logger = new Logger(MetaAdsApiService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';

  /**
   * Lista todas as contas de anúncio disponíveis para o usuário
   * IMPORTANTE: Requer user access token com escopo 'ads_read', não page access token
   */
  async listAvailableAdAccounts(userAccessToken: string): Promise<MetaAdAccount[]> {
    try {
      const response = await axios.get<MetaAdAccountsListResponse>(
        `${this.baseUrl}/me/adaccounts`,
        {
          params: {
            access_token: userAccessToken, // Deve ser user access token, não page token
            fields: 'id,account_id,name,currency,account_status,business{id,name}',
            limit: 100,
          },
        },
      );

      this.logger.log(`Listadas ${response.data.data.length} contas de anúncio disponíveis`);
      return response.data.data;
    } catch (error: unknown) {
      if (this.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        this.logger.error(`Erro ao listar contas de anúncio: ${JSON.stringify(errorData)}`);
        
        if (error.response?.status === 400 || error.response?.status === 403) {
          const errorMessage = errorData?.error?.message || 'Erro ao listar contas de anúncio';
          if (errorMessage.includes('adaccounts') || errorMessage.includes('Page')) {
            throw new BadRequestException(
              'Token inválido para acessar contas de anúncio. É necessário um user access token com escopo ads_read. Use um token de usuário, não um token de página.',
            );
          }
          throw new BadRequestException(
            errorMessage || 'Erro ao listar contas de anúncio. Verifique as permissões do token.',
          );
        }
      }
      throw new InternalServerErrorException('Erro inesperado ao listar contas de anúncio');
    }
  }

  /**
   * Obtém detalhes de uma conta de anúncio específica
   */
  async getAdAccountDetails(
    adAccountId: string,
    accessToken: string,
  ): Promise<MetaAdAccountDetails> {
    try {
      // Remover "act_" do ID se presente
      const cleanAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      const response = await axios.get<MetaAdAccountDetails>(
        `${this.baseUrl}/${cleanAccountId}`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,account_id,name,currency,account_status,business{id,name},timezone_name,timezone_offset_hours_utc,age,funding_source',
          },
        },
      );

      this.logger.log(`Detalhes obtidos para conta ${cleanAccountId}`);
      return response.data;
    } catch (error: unknown) {
      if (this.isAxiosError(error)) {
        const errorData = error.response?.data as any;
        this.logger.error(`Erro ao obter detalhes da conta: ${JSON.stringify(errorData)}`);
        
        if (error.response?.status === 400 || error.response?.status === 404) {
          throw new BadRequestException(
            errorData?.error?.message || 'Conta de anúncio não encontrada ou sem permissão',
          );
        }
      }
      throw new InternalServerErrorException('Erro inesperado ao obter detalhes da conta');
    }
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }
}

