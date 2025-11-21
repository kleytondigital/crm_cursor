import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { N8nService } from '@/shared/n8n/n8n.service';
import { ConnectionStatus } from '@prisma/client';

type ConnectionAction =
  | 'start'
  | 'stop'
  | 'restart'
  | 'delete'
  | 'reload'
  | 'connect'
  | 'disconnect'
  | 'auth-code';

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nService: N8nService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateConnectionDto, tenantId: string) {
    const existing = await this.prisma.connection.findFirst({
      where: { tenantId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Já existe uma conexão com este nome');
    }

    const messageWebhook =
      this.configService.get<string>('WAHA_WEBHOOK_MESSAGES') || null;
    const defaultWebhook =
      dto.webhookUrl ||
      messageWebhook ||
      this.configService.get<string>('WEBHOOK_SESSION_WAHA') ||
      this.configService.get<string>('WAHA_WEBHOOK') ||
      '';

    this.logger.log(
      `Solicitando criação de conexão ao N8N para tenant ${tenantId}`,
    );

    const configPayload =
      dto.config ||
      (defaultWebhook
        ? {
            webhooks: [
              {
                url: defaultWebhook,
                events: ['session.status', 'message'],
                hmac: null,
                retries: null,
                customHeaders: null,
              },
            ],
          }
        : undefined);

    const response = await this.n8nService.execute({
      action: 'criar',
      payload: {
        name: dto.name,
        webhook: defaultWebhook,
        start: dto.start ?? true,
        ...(configPayload ? { config: configPayload } : {}),
      },
    });

    this.logger.debug(
      `Resposta do N8N para criação de sessão (${dto.name}): ${JSON.stringify(
        response,
      )}`,
    );

    const normalizedResponse = Array.isArray(response) ? response[0] : response;
    const success =
      normalizedResponse?.success === true ||
      normalizedResponse?.success === 'true';
    const sessionName = normalizedResponse?.name as string | undefined;

    if (!success || !sessionName) {
      throw new InternalServerErrorException(
        'N8N não retornou dados de sessão válidos' + JSON.stringify(response),
      );
    }

    const connection = await this.prisma.connection.create({
      data: {
        tenantId,
        name: dto.name,
        sessionName,
        status: ConnectionStatus.PENDING,
        webhookUrl: defaultWebhook || null,
      },
    });

    return connection;
  }

  async findAll(tenantId: string) {
    const connections = await this.prisma.connection.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      connections.map((connection) => this.enrichConnection(connection)),
    );
  }

  async getQr(id: string, tenantId: string) {
    const connection = await this.getConnectionOrThrow(id, tenantId);

    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const infoResponse = await this.n8nService.execute({
        action: 'getinfo',
        payload: { session: connection.sessionName },
      });

      const status = this.resolveStatus(infoResponse);

      if (status === 'WORKING') {
        if (connection.status !== ConnectionStatus.ACTIVE) {
          await this.updateStatus(connection.id, ConnectionStatus.ACTIVE);
        }

        return {
          sessionName: connection.sessionName,
          status,
          qr: null,
        };
      }

      const qrResponse = await this.n8nService.execute({
        action: 'qr',
        payload: { session: connection.sessionName },
      });

      const { qr, mimetype } = this.extractQrData(qrResponse);

      if (qr) {
        return {
          sessionName: connection.sessionName,
          status: status ?? connection.status,
          qr,
          mimetype: mimetype ?? 'image/png',
        };
      }

      // Aguarda brevemente antes da próxima tentativa
      await this.delay(1000);
    }

    throw new InternalServerErrorException(
      'Não foi possível gerar QR Code. Tente novamente em instantes.',
    );
  }

  async performAction(
    id: string,
    action: ConnectionAction,
    tenantId: string,
    payload?: Record<string, any>,
  ) {
    const connection = await this.getConnectionOrThrow(id, tenantId);

    this.logger.log(
      `Executando ação ${action.toUpperCase()} via N8N para conexão ${connection.id}`,
    );

    const result = await this.n8nService.execute({
      action,
      payload: {
        session: connection.sessionName,
        name: connection.name,
        ...(payload || {}),
      },
    });

    switch (action) {
      case 'start':
      case 'connect':
        return this.updateStatus(connection.id, ConnectionStatus.ACTIVE);
      case 'stop':
        return this.updateStatus(connection.id, ConnectionStatus.STOPPED);
      case 'restart':
        return this.updateStatus(connection.id, ConnectionStatus.ACTIVE);
      case 'reload':
        return connection;
      case 'delete':
        await this.prisma.connection.delete({
          where: { id: connection.id },
        });
        return { success: true };
      case 'disconnect':
        await this.updateStatus(connection.id, ConnectionStatus.STOPPED);
        return { success: true };

      case 'auth-code':
        return result;

      default:
        return connection;
    }
  }

  private async updateStatus(id: string, status: ConnectionStatus) {
    return this.prisma.connection.update({
      where: { id },
      data: { status },
    });
  }

  async getWebhooks(id: string, tenantId: string) {
    const connection = await this.getConnectionOrThrow(id, tenantId);
    const response = await this.n8nService.execute({
      action: 'webhooks',
      payload: {
        session: connection.sessionName,
        name: connection.name,
      },
    });

    // O retorno pode ser:
    // 1. Array direto: [{ id: "...", webhooks: [...] }]
    // 2. Objeto com webhooks: { webhooks: [...] }
    // 3. Array de webhooks: [{ url: "...", events: [...] }]
    
    if (Array.isArray(response) && response.length > 0) {
      // Se for array, retornar como está (pode ser array de objetos com webhooks ou array direto de webhooks)
      return response;
    }
    
    if (response && typeof response === 'object' && Array.isArray(response.webhooks)) {
      // Se for objeto com propriedade webhooks
      return response.webhooks;
    }
    
    // Fallback: retornar array vazio
    return [];
  }

  async updateWebhooks(
    id: string,
    tenantId: string,
    config: {
      webhooks: {
        url: string;
        events: string[];
        hmac: null | string;
        retries: null | {
          delaySeconds: number;
          attempts: number;
          policy: string;
        };
        customHeaders?: Record<string, string> | null;
      }[];
    },
  ) {
    const webhooks = config?.webhooks;

    if (!Array.isArray(webhooks)) {
      throw new BadRequestException('Lista de webhooks inválida.');
    }

    if (webhooks.length > 3) {
      throw new BadRequestException(
        'É permitido configurar no máximo 3 webhooks.',
      );
    }

    const connection = await this.getConnectionOrThrow(id, tenantId);

    // Filtrar apenas webhooks válidos (com URL obrigatória)
    // IMPORTANTE: Validar URL ANTES de mapear para evitar criar webhooks vazios
    const validWebhooks = webhooks
      .filter((hook) => {
        // Validar que o hook existe e tem URL válida
        if (!hook || !hook.url || typeof hook.url !== 'string') {
          this.logger.warn(
            `Webhook inválido ignorado (sem URL): ${JSON.stringify(hook)}`,
          );
          return false;
        }
        const trimmedUrl = hook.url.trim();
        if (!trimmedUrl) {
          this.logger.warn(`Webhook com URL vazia ignorado`);
          return false;
        }
        return true;
      })
      .map((hook) => ({
        url: hook.url.trim(),
        events: hook.events || [],
        hmac: hook.hmac ?? null,
        retries: hook.retries ?? null,
        customHeaders:
          hook.customHeaders === undefined ? null : hook.customHeaders,
      }));

    if (validWebhooks.length === 0) {
      throw new BadRequestException('Nenhum webhook válido fornecido. Todos os webhooks devem ter uma URL válida.');
    }

    if (validWebhooks.length > 3) {
      throw new BadRequestException(
        'É permitido configurar no máximo 3 webhooks.',
      );
    }

    this.logger.log(
      `Atualizando webhooks da conexão ${connection.name} (${connection.sessionName}): ${validWebhooks.length} webhook(s) válido(s)`,
    );
    this.logger.debug(
      `Webhooks a serem enviados: ${JSON.stringify(validWebhooks.map((h) => ({ url: h.url, events: h.events })))}`,
    );

    await this.n8nService.execute({
      action: 'update',
      payload: {
        session: connection.sessionName,
        name: connection.name,
        config: {
          webhooks: validWebhooks,
        },
      },
    });

    this.logger.log(
      `Webhooks da conexão ${connection.name} atualizados com sucesso`,
    );

    return { success: true };
  }

  /**
   * Listar automações (workflow instances) conectadas a uma conexão
   */
  async getInstancesForConnection(
    connectionId: string,
    tenantId: string,
  ): Promise<any[]> {
    const connection = await this.getConnectionOrThrow(connectionId, tenantId);

    // Buscar webhooks da conexão
    // O retorno é um array, e o primeiro elemento contém a propriedade 'webhooks'
    const webhooksResponse = await this.getWebhooks(connectionId, tenantId);
    
    // Extrair array de webhooks do formato retornado
    let webhookUrls: string[] = [];
    
    if (Array.isArray(webhooksResponse) && webhooksResponse.length > 0) {
      // Formato: [{ id: "...", webhooks: [...] }]
      const firstItem = webhooksResponse[0];
      if (firstItem && Array.isArray(firstItem.webhooks)) {
        webhookUrls = firstItem.webhooks.map((hook: any) => hook.url);
      } else if (Array.isArray(firstItem) || typeof firstItem === 'object' && firstItem.url) {
        // Formato alternativo: array direto de webhooks ou objeto com url
        webhookUrls = Array.isArray(firstItem)
          ? firstItem.map((hook: any) => hook.url).filter(Boolean)
          : [firstItem.url].filter(Boolean);
      }
    } else if (Array.isArray(webhooksResponse)) {
      // Se for array direto de webhooks
      webhookUrls = webhooksResponse.map((hook: any) => hook.url).filter(Boolean);
    }

    if (webhookUrls.length === 0) {
      this.logger.log(
        `Nenhum webhook encontrado para conexão ${connectionId}. Resposta recebida: ${JSON.stringify(webhooksResponse).substring(0, 200)}`,
      );
      return [];
    }

    this.logger.log(
      `Buscando instâncias de workflow com webhookUrls: ${webhookUrls.join(', ')}`,
    );

    // Buscar instâncias de workflow que têm webhookUrl correspondente
    const instances = await this.prisma.workflowInstance.findMany({
      where: {
        tenantId,
        webhookUrl: {
          in: webhookUrls,
        },
      },
      select: {
        id: true,
        name: true,
        webhookUrl: true,
        isActive: true,
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            icon: true,
          },
        },
        aiAgent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Encontradas ${instances.length} instância(s) de workflow conectada(s) à conexão ${connectionId}`,
    );

    return instances;
  }

  private async getConnectionOrThrow(id: string, tenantId: string) {
    const connection = await this.prisma.connection.findFirst({
      where: { id, tenantId },
    });

    if (!connection) {
      throw new NotFoundException('Conexão não encontrada');
    }

    return connection;
  }

  private resolveStatus(response: any): string | null {
    const value = this.findStringValue(response, [
      'status',
      'Status',
      'state',
      'State',
      'connectionStatus',
      'sessionStatus',
    ]);

    return typeof value === 'string' ? value.toUpperCase() : null;
  }

  private extractQrData(response: any): {
    qr: string | null;
    mimetype?: string | null;
  } {
    if (!response) {
      return { qr: null, mimetype: null };
    }

    if (Array.isArray(response)) {
      for (const item of response) {
        const result = this.extractQrData(item);
        if (result.qr) {
          return result;
        }
      }
      return { qr: null, mimetype: null };
    }

    if (typeof response === 'object') {
      const base64 = response.data || response.qr || response.base64 || null;
      const mimetype =
        response.mimetype || response.mimeType || response.contentType || null;

      if (typeof base64 === 'string') {
        return { qr: base64, mimetype };
      }

      for (const value of Object.values(response)) {
        if (typeof value === 'object' || Array.isArray(value)) {
          const result = this.extractQrData(value);
          if (result.qr) {
            return result;
          }
        }
      }
    }

    if (typeof response === 'string') {
      return { qr: response, mimetype: null };
    }

    return { qr: null, mimetype: null };
  }

  private findStringValue(source: any, keys: string[]): string | null {
    if (!source) {
      return null;
    }

    if (typeof source === 'string') {
      return source;
    }

    if (Array.isArray(source)) {
      for (const item of source) {
        const result = this.findStringValue(item, keys);
        if (result) {
          return result;
        }
      }
      return null;
    }

    if (typeof source === 'object') {
      for (const key of keys) {
        const value = source[key];
        if (typeof value === 'string') {
          return value;
        }
      }

      for (const value of Object.values(source)) {
        if (
          typeof value === 'object' ||
          Array.isArray(value) ||
          typeof value === 'string'
        ) {
          const result = this.findStringValue(value, keys);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async enrichConnection(connection: any) {
    const baseConnection = { ...connection };
    let statusInfo: {
      status?: string | null;
      waId?: string | null;
      pushName?: string | null;
      picture?: string | null;
      webhooks?: any[] | null;
      raw?: unknown;
    } | null = null;

    try {
      const response = await this.n8nService.execute({
        action: 'getinfo',
        payload: { session: connection.sessionName },
      });

      statusInfo = this.extractSessionInfo(response);

      const normalizedStatus = statusInfo?.status
        ? statusInfo.status.toUpperCase()
        : null;

      const mappedStatus = normalizedStatus
        ? this.mapConnectionStatus(normalizedStatus)
        : null;

      if (mappedStatus && mappedStatus !== connection.status) {
        await this.prisma.connection.update({
          where: { id: connection.id },
          data: { status: mappedStatus },
        });
        baseConnection.status = mappedStatus;
      }
    } catch (error) {
      this.logger.warn(
        `Não foi possível obter status para a sessão ${connection.sessionName}`,
      );
    }

    return {
      ...baseConnection,
      statusInfo,
    };
  }

  private extractSessionInfo(response: any) {
    if (!response) {
      return null;
    }

    const item = Array.isArray(response) ? response[0] : response;

    if (!item || typeof item !== 'object') {
      return null;
    }

    return {
      status: this.findStringValue(item, [
        'status',
        'Status',
        'state',
        'connectionStatus',
      ]),
      waId:
        this.findStringValue(item, ['id', 'Id', 'number', 'session']) ?? null,
      pushName:
        this.findStringValue(item, ['pushName', 'PushName', 'name']) ?? null,
      picture:
        this.findStringValue(item, ['picture', 'avatar', 'image']) ?? null,
      webhooks: Array.isArray((item as any).webhooks)
        ? ((item as any).webhooks as any[])
        : null,
      raw: item,
    };
  }

  private mapConnectionStatus(status: string): ConnectionStatus | null {
    switch (status) {
      case 'WORKING':
      case 'CONNECTED':
        return ConnectionStatus.ACTIVE;
      case 'STOPPED':
      case 'PAUSED':
      case 'SUSPENDED':
        return ConnectionStatus.STOPPED;
      case 'PENDING':
      case 'CONNECTING':
      case 'INITIALIZING':
        return ConnectionStatus.PENDING;
      case 'ERROR':
      case 'FAILED':
      case 'DISCONNECTED':
        return ConnectionStatus.ERROR;
      default:
        return null;
    }
  }
}

