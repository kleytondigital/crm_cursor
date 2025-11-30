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
import { CreateSocialConnectionDto } from './dto/create-social-connection.dto';
import { UpdateSocialConnectionDto } from './dto/update-social-connection.dto';
import { CreateMetaApiConnectionDto, MetaService } from './dto/create-meta-api-connection.dto';
import { N8nService } from '@/shared/n8n/n8n.service';
import { MetaOAuthService } from './services/meta-oauth.service';
import { N8nSocialConfigService } from './services/n8n-social-config.service';
import { ConnectionStatus, ConnectionProvider } from '@prisma/client';
import { SocialConnectionMetadata } from './types/social-connection-metadata.interface';

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
    private readonly metaOAuthService: MetaOAuthService,
    private readonly n8nSocialConfigService: N8nSocialConfigService,
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

  // ========== Social Connections Methods ==========

  /**
   * Inicia fluxo OAuth para conexão social
   */
  async startSocialOAuth(provider: 'INSTAGRAM' | 'FACEBOOK', tenantId: string) {
    const authUrl = this.metaOAuthService.generateAuthUrl(tenantId, provider);
    return { authUrl, provider };
  }

  /**
   * Inicia fluxo OAuth para Meta API com serviços selecionados
   */
  async startMetaApiOAuth(dto: CreateMetaApiConnectionDto, tenantId: string) {
    // Determinar provider baseado nos serviços (Instagram ou Facebook para mensagens)
    const hasInstagram = dto.services.includes(MetaService.INSTAGRAM_DIRECT);
    const hasFacebook = dto.services.includes(MetaService.FACEBOOK_MESSENGER);
    const hasWhatsAppApi = dto.services.includes(MetaService.WHATSAPP_API);
    const hasMetaAds = dto.services.includes(MetaService.META_ADS);

    // Se tem mensagens, determinar provider (Instagram tem prioridade)
    const provider = hasInstagram ? 'INSTAGRAM' : hasFacebook ? 'FACEBOOK' : 'FACEBOOK';

    // Criar state com informações necessárias para o callback
    const state = Buffer.from(
      JSON.stringify({
        tenantId,
        name: dto.name,
        services: dto.services,
        provider,
        step: 'initial',
      }),
    ).toString('base64');

    // Gerar URL de autorização com escopos baseados nos serviços e state customizado
    const authUrl = this.metaOAuthService.generateMetaApiAuthUrl(
      tenantId,
      dto.services,
      undefined,
      state,
    );

    return {
      authUrl,
      provider,
      services: dto.services,
    };
  }

  /**
   * Processa callback OAuth da Meta
   */
  async handleOAuthCallback(code: string, state?: string) {
    if (!code) {
      throw new BadRequestException('Code OAuth não fornecido');
    }

    // Decodificar state para obter tenantId e provider
    let tenantId: string;
    let provider: 'INSTAGRAM' | 'FACEBOOK';
    let step: string | undefined;
    let connectionName: string | undefined;
    let enabledServices: string[] | undefined;

    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        tenantId = decoded.tenantId;
        provider = decoded.provider;
        step = decoded.step; // 'graph' se for segunda etapa
        
        // Detectar se é o novo fluxo Meta API (tem services e name)
        if (decoded.services && decoded.name) {
          connectionName = decoded.name;
          enabledServices = decoded.services;
          // No novo fluxo, sempre usar Graph App (tem todas as permissões)
          step = 'meta-api'; // Marcar como fluxo Meta API
          this.logger.log(`Novo fluxo Meta API detectado. Serviços: ${decoded.services.join(', ')}`);
        }
      } catch (error) {
        this.logger.error(`Erro ao decodificar state: ${error}`);
        throw new BadRequestException('State inválido');
      }
    } else {
      throw new BadRequestException('State não fornecido');
    }

    // Determinar qual app usar baseado na etapa
    // No novo fluxo Meta API, sempre usar Graph App (gerou URL com Graph App)
    // IMPORTANTE: O redirect_uri DEVE ser idêntico ao usado na geração da URL
    const isGraphStep = step === 'graph' || step === 'meta-api';
    
    // Para o novo fluxo Meta API, garantir que usamos o mesmo redirect_uri
    // que foi usado na geração da URL (normalizado)
    const redirectUri = step === 'meta-api' 
      ? this.configService.get<string>('META_REDIRECT_URI') 
      : undefined;
    
    this.logger.log(
      `Processando callback OAuth. Step: ${step}, isGraphStep: ${isGraphStep}, redirectUri: ${redirectUri}`,
    );
    
    // Trocar code por token
    // IMPORTANTE: 
    // - Na segunda etapa (Graph API), usar Graph App credentials
    // - No novo fluxo Meta API, usar Graph App credentials (gerou URL com Graph App)
    // - Na primeira etapa (OAuth básico), usar OAuth App credentials
    // - O redirect_uri DEVE ser EXATAMENTE o mesmo usado na geração da URL
    const tokenResponse = await this.metaOAuthService.exchangeCodeForToken(
      code,
      redirectUri, // Passar redirectUri explicitamente para garantir consistência
      isGraphStep,
    );

    // Se for primeira etapa (OAuth básico) e houver Graph App separado,
    // sempre solicitar segunda autorização (App OAuth não tem escopos de páginas)
    if (!isGraphStep) {
      const hasGraphApp = !!this.configService.get<string>('META_GRAPH_APP_ID') &&
                          this.configService.get<string>('META_GRAPH_APP_ID') !== 
                          this.configService.get<string>('META_OAUTH_APP_ID');
      
      if (hasGraphApp) {
        // Se há Graph App separado, o OAuth básico não tem escopos de páginas
        // Solicitar segunda autorização via Graph App
        this.logger.log(
          `Apps separados detectados. OAuth básico concluído. Solicitando segunda autorização via Graph App.`,
        );
        
        const graphAuthUrl = this.metaOAuthService.generateGraphApiAuthUrl(tenantId, provider);
        return {
          requiresSecondAuth: true,
          authUrl: graphAuthUrl,
          message: 'Autorização básica concluída. É necessário autorizar acesso às páginas e Instagram.',
        };
      }
    }

    // Converter para long-lived token
    // IMPORTANTE: Usar credenciais do mesmo app que gerou o token
    const longLivedToken = await this.metaOAuthService.getLongLivedToken(
      tokenResponse.access_token,
      isGraphStep, // Se for segunda etapa, usar Graph App credentials
    );

    // Buscar páginas do usuário
    const pages = await this.metaOAuthService.getPages(longLivedToken.access_token);

    if (pages.length === 0) {
      throw new BadRequestException('Nenhuma página encontrada. Conecte uma página do Facebook primeiro.');
    }

    // Para Instagram, precisamos de uma página com Instagram Business vinculado
    // Para Facebook, podemos usar qualquer página
    let selectedPage = pages[0];
    let instagramBusinessAccount = null;

    if (provider === 'INSTAGRAM') {
      // Tentar encontrar página com Instagram Business
      for (const page of pages) {
        if (page.access_token) {
          const instagram = await this.metaOAuthService.getInstagramBusinessAccount(
            page.id,
            page.access_token,
          );
          if (instagram) {
            selectedPage = page;
            instagramBusinessAccount = instagram;
            break;
          }
        }
      }

      if (!instagramBusinessAccount) {
        throw new BadRequestException(
          'Nenhuma página com Instagram Business encontrada. Configure o Instagram Business na sua página do Facebook primeiro.',
        );
      }
    }

    // Criar ou atualizar conexão
    const sessionName = `social_${provider.toLowerCase()}_${selectedPage.id}_${Date.now()}`;
    
    // Calcular data de expiração com validação
    let tokenExpiresAt: string | undefined;
    const expirationDate = this.metaOAuthService.calculateExpirationDate(longLivedToken.expires_in);
    if (expirationDate) {
      tokenExpiresAt = expirationDate.toISOString();
    } else {
      this.logger.warn(`Não foi possível calcular data de expiração. expires_in: ${longLivedToken.expires_in}. Token será salvo sem data de expiração.`);
    }
    
    // Determinar se precisa armazenar user token (para Meta Ads)
    const hasMetaAds = enabledServices?.includes('META_ADS');
    const hasMessages = enabledServices?.some(
      (s) => s === 'INSTAGRAM_DIRECT' || s === 'FACEBOOK_MESSENGER' || s === 'WHATSAPP_API',
    );
    
    const metadata: SocialConnectionMetadata = {
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      pageCategory: selectedPage.category,
      // Page access token (para mensagens)
      accessToken: hasMessages ? (selectedPage.access_token || longLivedToken.access_token) : undefined,
      // User access token (para Meta Ads)
      userAccessToken: hasMetaAds ? longLivedToken.access_token : undefined,
      tokenExpiresAt,
      permissions: tokenResponse.scope?.split(',') || [],
      instagramBusinessId: instagramBusinessAccount?.id,
      instagramUsername: instagramBusinessAccount?.username,
      // Serviços habilitados
      enabledServices: enabledServices as Array<'WHATSAPP_API' | 'INSTAGRAM_DIRECT' | 'FACEBOOK_MESSENGER' | 'META_ADS'> | undefined,
    };
    
    // Nome da conexão: usar o fornecido pelo usuário se disponível, senão gerar
    const finalConnectionName = connectionName || `${provider} - ${selectedPage.name}`;

    // Verificar se já existe conexão para esta página OU Instagram Business Account
    // Para Instagram: verifica por instagramBusinessId (mais específico)
    // Para Facebook: verifica por pageId
    const providerType = provider === 'INSTAGRAM' ? ConnectionProvider.INSTAGRAM : ConnectionProvider.FACEBOOK;
    
    // Buscar conexão existente
    const allExistingConnections = await this.prisma.connection.findMany({
      where: {
        tenantId,
        provider: providerType,
      },
    });

    // Para Instagram, priorizar busca por instagramBusinessId
    let existing = null;
    if (provider === 'INSTAGRAM' && instagramBusinessAccount?.id) {
      existing = allExistingConnections.find((conn) => {
        const connMetadata = conn.metadata as SocialConnectionMetadata | null;
        return connMetadata?.instagramBusinessId === instagramBusinessAccount.id;
      }) || null;
    }

    // Se não encontrou por instagramBusinessId, buscar por pageId
    if (!existing) {
      existing = allExistingConnections.find((conn) => {
        const connMetadata = conn.metadata as SocialConnectionMetadata | null;
        return connMetadata?.pageId === selectedPage.id;
      }) || null;
    }

    // Se ainda não encontrou, usar a primeira conexão do mesmo provider (se existir apenas uma)
    if (!existing && allExistingConnections.length === 1) {
      existing = allExistingConnections[0];
      this.logger.log(`Reutilizando conexão existente única para ${provider}: ${existing.id}`);
    }

    let connection;
    if (existing) {
      // Atualizar conexão existente
      this.logger.log(`Atualizando conexão existente ${existing.id} para ${provider} - ${selectedPage.name}`);
      connection = await this.prisma.connection.update({
        where: { id: existing.id },
        data: {
          name: finalConnectionName,
          metadata: metadata as any,
          refreshToken: tokenResponse.refresh_token || existing.refreshToken,
          status: ConnectionStatus.ACTIVE,
          isActive: true,
        },
      });

      // Se existem outras conexões do mesmo provider para o mesmo tenant, desativá-las
      // (mantém apenas a conexão atualizada ativa)
      const otherConnections = allExistingConnections.filter((conn) => conn.id !== existing!.id);
      if (otherConnections.length > 0) {
        this.logger.log(`Desativando ${otherConnections.length} conexão(ões) duplicada(s) do ${provider}`);
        await this.prisma.connection.updateMany({
          where: {
            id: {
              in: otherConnections.map((conn) => conn.id),
            },
          },
          data: {
            status: ConnectionStatus.STOPPED,
            isActive: false,
          },
        });
      }
    } else {
      // Criar nova conexão
      this.logger.log(`Criando nova conexão para ${provider} - ${selectedPage.name}`);
      
      // Antes de criar, desativar qualquer outra conexão ativa do mesmo provider
      // para garantir apenas uma conexão ativa por provider/tenant
      await this.prisma.connection.updateMany({
        where: {
          tenantId,
          provider: providerType,
          isActive: true,
        },
        data: {
          status: ConnectionStatus.STOPPED,
          isActive: false,
        },
      });

      connection = await this.prisma.connection.create({
        data: {
          tenantId,
          name: finalConnectionName,
          sessionName,
          provider: providerType,
          status: ConnectionStatus.ACTIVE,
          metadata: metadata as any,
          refreshToken: tokenResponse.refresh_token || null,
          isActive: true,
        },
      });
    }

    // Enviar configuração para n8n
    await this.n8nSocialConfigService.sendConnectionConfigToN8n(connection);

    return {
      success: true,
      connection: {
        id: connection.id,
        name: connection.name,
        provider: connection.provider,
        status: connection.status,
      },
    };
  }

  /**
   * Renova token de conexão social
   */
  async refreshSocialToken(connectionId: string, tenantId: string) {
    const connection = await this.getConnectionOrThrow(connectionId, tenantId);

    if (connection.provider === ConnectionProvider.WHATSAPP) {
      throw new BadRequestException('Este método é apenas para conexões sociais');
    }

    if (!connection.refreshToken) {
      throw new BadRequestException('Conexão não possui refresh token');
    }

    const tokenResponse = await this.metaOAuthService.refreshAccessToken(connection.refreshToken);

    const metadata = (connection.metadata as SocialConnectionMetadata) || {};
    metadata.accessToken = tokenResponse.access_token;
    
    // Calcular data de expiração com validação
    const expirationDate = this.metaOAuthService.calculateExpirationDate(tokenResponse.expires_in);
    if (expirationDate) {
      metadata.tokenExpiresAt = expirationDate.toISOString();
    } else {
      this.logger.warn(`Não foi possível calcular data de expiração. expires_in: ${tokenResponse.expires_in}. Token será salvo sem data de expiração.`);
      metadata.tokenExpiresAt = undefined;
    }

    const updated = await this.prisma.connection.update({
      where: { id: connection.id },
      data: {
        metadata: metadata as any,
      },
    });

    // Notificar n8n
    await this.n8nSocialConfigService.updateN8nOnTokenRefresh(updated);

    return {
      success: true,
      expiresAt: metadata.tokenExpiresAt,
    };
  }

  /**
   * Lista conexões sociais
   */
  async getSocialConnections(tenantId: string) {
    const connections = await this.prisma.connection.findMany({
      where: {
        tenantId,
        provider: {
          in: [ConnectionProvider.INSTAGRAM, ConnectionProvider.FACEBOOK],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      provider: conn.provider,
      status: conn.status,
      isActive: conn.isActive,
      metadata: conn.metadata,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));
  }

  /**
   * Cria conexão social (prepara para OAuth)
   */
  async createSocialConnection(dto: CreateSocialConnectionDto, tenantId: string) {
    // Verificar se já existe conexão com mesmo nome
    const existing = await this.prisma.connection.findFirst({
      where: {
        tenantId,
        name: dto.name,
        provider: dto.provider === 'INSTAGRAM' ? ConnectionProvider.INSTAGRAM : ConnectionProvider.FACEBOOK,
      },
    });

    if (existing) {
      throw new ConflictException('Já existe uma conexão com este nome');
    }

    // Retornar URL de OAuth para iniciar fluxo
    return this.startSocialOAuth(dto.provider, tenantId);
  }

  /**
   * Atualiza conexão social
   */
  async updateSocialConnection(
    connectionId: string,
    dto: UpdateSocialConnectionDto,
    tenantId: string,
  ) {
    const connection = await this.getConnectionOrThrow(connectionId, tenantId);

    if (connection.provider === ConnectionProvider.WHATSAPP) {
      throw new BadRequestException('Este método é apenas para conexões sociais');
    }

    const updateData: any = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    if (dto.metadata !== undefined) {
      const currentMetadata = (connection.metadata as SocialConnectionMetadata) || {};
      updateData.metadata = { ...currentMetadata, ...dto.metadata } as any;
    }

    return this.prisma.connection.update({
      where: { id: connection.id },
      data: updateData,
    });
  }

  /**
   * Desconecta conexão social
   */
  async disconnectSocial(connectionId: string, tenantId: string) {
    const connection = await this.getConnectionOrThrow(connectionId, tenantId);

    if (connection.provider === ConnectionProvider.WHATSAPP) {
      throw new BadRequestException('Este método é apenas para conexões sociais');
    }

    // Notificar n8n
    await this.n8nSocialConfigService.notifyN8nOnDisconnect(connection.id, tenantId);

    // Atualizar conexão
    return this.prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: ConnectionStatus.STOPPED,
        isActive: false,
        metadata: null,
        refreshToken: null,
      },
    });
  }
}

