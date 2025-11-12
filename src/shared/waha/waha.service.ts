import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

interface WahaRequestConfig extends AxiosRequestConfig {
  path: string;
}

interface CreateSessionOptions {
  webhookUrl?: string;
  start?: boolean;
  config?: Record<string, any>;
}

@Injectable()
export class WahaService {
  private readonly logger = new Logger(WahaService.name);
  private baseUrl: string;
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.normalizeUrl(
      this.configService.get<string>('WAHA_BASE_URL', ''),
    );
    this.apiKey = this.configService.get<string>('WAHA_API_KEY', '');
  }

  /**
   * Permite sobrescrever as configurações em tempo de execução
   */
  setConfig(config: { baseUrl?: string; apiKey?: string }) {
    if (config.baseUrl) {
      this.baseUrl = this.normalizeUrl(config.baseUrl);
      this.logger.log(`WAHA base URL atualizada: ${this.baseUrl}`);
    }
    if (config.apiKey) {
      this.apiKey = config.apiKey;
      this.logger.log(`WAHA API key atualizada`);
    }
  }

  async createSession(name: string, options: CreateSessionOptions = {}) {
    const data: Record<string, any> = {
      name,
    };

    if (options.start !== undefined) {
      data.start = options.start;
    }

    if (options.config) {
      data.config = options.config;
    } else if (options.webhookUrl) {
      data.config = {
        proxy: null,
        debug: false,
        ignore: { status: null, groups: null, channels: null },
        webhooks: [
          {
            url: options.webhookUrl,
            events: ['message'],
          },
        ],
      };
    }

    return this.request({
      method: 'POST',
      path: '/sessions',
      data,
    });
  }

  async updateSession(name: string) {
    return this.request({
      method: 'PATCH',
      path: `/sessions/${name}`,
      data: {},
    });
  }

  async deleteSession(name: string) {
    return this.request({
      method: 'DELETE',
      path: `/sessions/${name}`,
    });
  }

  async startSession(name: string) {
    return this.request({
      method: 'POST',
      path: `/sessions/${name}/start`,
    });
  }

  async stopSession(name: string) {
    return this.request({
      method: 'POST',
      path: `/sessions/${name}/stop`,
    });
  }

  async restartSession(name: string) {
    return this.request({
      method: 'POST',
      path: `/sessions/${name}/restart`,
    });
  }

  async logoutSession() {
    return this.request({
      method: 'POST',
      path: `/sessions/logout`,
    });
  }

  async getSessionMe(name: string) {
    return this.request({
      method: 'GET',
      path: `/sessions/${name}/me`,
    });
  }

  async getSessionQR(name: string) {
    return this.request({
      method: 'GET',
      path: `/sessions/${name}/qr`,
    });
  }

  async requestAuthCode(name: string) {
    return this.request({
      method: 'POST',
      path: `/sessions/${name}/auth-code`,
    });
  }

  private async request<T = any>(config: WahaRequestConfig): Promise<T> {
    const baseUrl = this.baseUrl;
    const apiKey = this.apiKey;

    if (!baseUrl) {
      const message = 'WAHA_BASE_URL não configurada';
      this.logger.error(message);
      throw new HttpException(message, 500);
    }

    if (!apiKey) {
      const message = 'WAHA_API_KEY não configurada';
      this.logger.error(message);
      throw new HttpException(message, 500);
    }

    const url = `${baseUrl}${config.path}`;
    const requestConfig: AxiosRequestConfig = {
      ...config,
      url,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(config.headers || {}),
      },
    };

    this.logger.log(
      `Requisição WAHA -> ${config.method?.toUpperCase()} ${url}`,
    );

    try {
      const response = await axios.request<T>(requestConfig);
      this.logger.log(
        `Resposta WAHA <- ${config.method?.toUpperCase()} ${url} [${response.status}]`,
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, config);
    }
  }

  private handleError(error: any, config: WahaRequestConfig): never {
    if (this.isAxiosError(error)) {
      const status = error.response?.status ?? 500;
      const responseData = error.response?.data ?? {
        message: 'Erro ao comunicar com WAHA',
      };

      this.logger.error(
        `Erro WAHA <- ${config.method?.toUpperCase()} ${config.path} [${status}]`,
        JSON.stringify(responseData),
      );

      throw new HttpException(responseData, status);
    }

    this.logger.error(
      `Erro inesperado ao comunicar com WAHA: ${error?.message || error}`,
    );
    throw new HttpException('Erro interno ao comunicar com WAHA', 500);
  }

  private normalizeUrl(url: string | undefined): string {
    if (!url) {
      return '';
    }
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  private isAxiosError(error: any): error is AxiosError {
    return !!error?.isAxiosError;
  }
}

