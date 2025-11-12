import {
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

interface ExecuteOptions {
  action: string;
  payload?: Record<string, any>;
}

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);

  constructor(private readonly configService: ConfigService) {}

  private get webhookUrl() {
    return (
      this.configService.get<string>('N8N_WEBHOOK_URL') ??
      this.configService.get<string>('N8N_SESSION_WEBHOOK_URL') ??
      ''
    );
  }

  private get apiKey() {
    return this.configService.get<string>('N8N_API_KEY') ?? '';
  }

  async execute({ action, payload = {} }: ExecuteOptions) {
    const url = this.webhookUrl;

    if (!url) {
      this.logger.error('N8N_WEBHOOK_URL não configurado');
      throw new InternalServerErrorException(
        'Webhook do N8N não configurado no ambiente',
      );
    }

    const body = {
      action,
      ...payload,
    };

    try {
      this.logger.log(`Chamando N8N webhook: action=${action}`);
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'X-N8N-API-KEY': this.apiKey } : {}),
        },
      });

      return response.data;
    } catch (error) {
      if (this.isAxiosError(error)) {
        const status = error.response?.status ?? 500;
        const data = error.response?.data ?? {
          message: 'Erro ao comunicar com N8N',
        };
        this.logger.error(
          `Erro ao executar ação no N8N: status=${status} data=${JSON.stringify(
            data,
          )}`,
        );
        throw new HttpException(data, status);
      }

      this.logger.error(
        `Erro inesperado ao comunicar com N8N: ${error?.message || error}`,
      );
      throw new InternalServerErrorException(
        'Erro interno ao comunicar com N8N',
      );
    }
  }

  private isAxiosError(error: any): error is AxiosError {
    return !!error?.isAxiosError;
  }

  async postToUrl(url: string, payload: Record<string, any>) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'X-N8N-API-KEY': this.apiKey } : {}),
      };

      const response = await axios.post(url, payload, { headers });
      return response.data;
    } catch (error) {
      if (this.isAxiosError(error)) {
        const status = error.response?.status ?? 500;
        const data = error.response?.data ?? {
          message: 'Erro ao comunicar com N8N',
        };
        this.logger.error(
          `Erro ao chamar webhook N8N customizado: status=${status} data=${JSON.stringify(
            data,
          )}`,
        );
        throw new HttpException(data, status);
      }

      this.logger.error(
        `Erro inesperado ao chamar webhook N8N customizado: ${error?.message || error}`,
      );
      throw new InternalServerErrorException(
        'Erro interno ao comunicar com N8N',
      );
    }
  }
}

