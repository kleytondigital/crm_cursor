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

  /**
   * Chamar webhook especialista em criação de prompts estruturados
   */
  async createPrompt(payload: {
    type: 'system' | 'user';
    variables?: Array<Record<string, any>>;
    prompt_ajuste?: string;
    text_ajuste?: string;
  }): Promise<{ prompt: string }> {
    const webhookUrl =
      this.configService.get<string>('N8N_WEBHOOK_CREATE_PROMPT') ||
      '';

    if (!webhookUrl) {
      this.logger.error('N8N_WEBHOOK_CREATE_PROMPT não configurado');
      throw new InternalServerErrorException(
        'Webhook de criação de prompt não configurado no ambiente',
      );
    }

    try {
      this.logger.log(
        `Chamando webhook de criação de prompt - Type: ${payload.type}`,
      );

      const response = await axios.post<any>(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'X-N8N-API-KEY': this.apiKey } : {}),
        },
        timeout: 60000, // 60 segundos para criação de prompt (pode demorar)
      });

      // Log detalhado da resposta para debug
      this.logger.debug(
        `Resposta bruta do webhook de criação de prompt: ${JSON.stringify(response.data)}`,
      );

      // Tratar diferentes formatos de resposta
      let promptData: { prompt: string };

      // Formato 1: Array com objeto que tem propriedade "data" contendo o prompt
      // [{ "data": { "prompt": "..." } }]
      if (Array.isArray(response.data) && response.data.length > 0) {
        const firstItem = response.data[0];
        if (firstItem?.data?.prompt) {
          promptData = { prompt: firstItem.data.prompt };
          this.logger.log('Prompt extraído de array com data');
        } else if (firstItem?.prompt) {
          promptData = { prompt: firstItem.prompt };
          this.logger.log('Prompt extraído de array direto');
        } else {
          throw new InternalServerErrorException(
            'Formato de resposta inesperado do webhook de criação de prompt (array)',
          );
        }
      }
      // Formato 2: Objeto direto com propriedade "data"
      // { "data": { "prompt": "..." } }
      else if (response.data?.data?.prompt) {
        promptData = { prompt: response.data.data.prompt };
        this.logger.log('Prompt extraído de data dentro de objeto');
      }
      // Formato 3: Objeto direto com propriedade "prompt"
      // { "prompt": "..." }
      else if (response.data?.prompt) {
        promptData = { prompt: response.data.prompt };
        this.logger.log('Prompt extraído diretamente do objeto');
      } else {
        this.logger.error(
          `Formato de resposta inesperado: ${JSON.stringify(response.data)}`,
        );
        throw new InternalServerErrorException(
          'Webhook não retornou prompt válido. Formato de resposta inesperado.',
        );
      }

      // Validar se o prompt não está vazio
      if (!promptData.prompt || !promptData.prompt.trim()) {
        throw new InternalServerErrorException(
          'Webhook retornou prompt vazio',
        );
      }

      this.logger.log(
        `Prompt criado com sucesso. Tamanho: ${promptData.prompt.length} caracteres`,
      );

      return promptData;
    } catch (error) {
      if (this.isAxiosError(error)) {
        const status = error.response?.status ?? 500;
        const data = error.response?.data ?? {
          message: 'Erro ao criar prompt',
        };
        this.logger.error(
          `Erro ao criar prompt: status=${status} data=${JSON.stringify(data)}`,
        );
        throw new HttpException(data, status);
      }

      this.logger.error(
        `Erro inesperado ao criar prompt: ${error?.message || error}`,
      );
      throw new InternalServerErrorException(
        `Erro interno ao criar prompt data=${JSON.stringify(error.response.data)}`,
      );
    }
  }
}

