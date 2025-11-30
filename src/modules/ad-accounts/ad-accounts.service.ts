import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { MetaAdsApiService } from './services/meta-ads-api.service';
import { CreateAdAccountDto } from './dto/create-ad-account.dto';
import { MetaAdAccount } from './types/meta-ads-account.interface';
import { SocialConnectionMetadata } from '@/modules/connections/types/social-connection-metadata.interface';

@Injectable()
export class AdAccountsService {
  private readonly logger = new Logger(AdAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metaAdsApi: MetaAdsApiService,
  ) {}

  /**
   * Lista contas de anúncio disponíveis para conexão (via Meta API)
   */
  async listAvailable(tenantId: string, connectionId: string): Promise<MetaAdAccount[]> {
    // Verificar se a conexão existe e pertence ao tenant
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId,
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Conexão não encontrada ou inativa');
    }

    // Verificar se é uma conexão Meta (Instagram ou Facebook)
    if (connection.provider !== 'INSTAGRAM' && connection.provider !== 'FACEBOOK') {
      throw new BadRequestException('Esta conexão não é compatível com Meta Ads');
    }

    // Obter user access token da conexão (obrigatório para acessar contas de anúncio)
    const metadata = connection.metadata as SocialConnectionMetadata | null;
    const userAccessToken = metadata?.userAccessToken || metadata?.accessToken;
    
    if (!userAccessToken) {
      throw new BadRequestException(
        'Token de acesso de usuário não encontrado na conexão. É necessário um user access token com escopo ads_read para acessar contas de anúncio.',
      );
    }

    // TODO: Implementar refresh do token se necessário
    // const refreshedToken = await this.refreshTokenIfNeeded(connection);

    // Listar contas disponíveis via Meta API (usa user access token)
    const accounts = await this.metaAdsApi.listAvailableAdAccounts(userAccessToken);

    // Filtrar contas já conectadas
    const connectedAccounts = await this.prisma.adAccount.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        adAccountId: true,
      },
    });

    const connectedIds = new Set(connectedAccounts.map((acc) => acc.adAccountId));

    return accounts.filter((account) => !connectedIds.has(account.id));
  }

  /**
   * Conecta uma conta de anúncio ao tenant
   */
  async connect(
    tenantId: string,
    connectionId: string,
    adAccountId: string,
  ): Promise<any> {
    // Verificar se a conexão existe e pertence ao tenant
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        tenantId,
        isActive: true,
      },
    });

    if (!connection) {
      throw new NotFoundException('Conexão não encontrada ou inativa');
    }

    // Verificar se a conta já está conectada
    const existing = await this.prisma.adAccount.findFirst({
      where: {
        tenantId,
        adAccountId,
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('Esta conta de anúncio já está conectada');
      } else {
        // Reativar conta existente
        const metadata = connection.metadata as SocialConnectionMetadata | null;
        const userAccessToken = metadata?.userAccessToken || metadata?.accessToken || '';
        if (!userAccessToken) {
          throw new BadRequestException('Token de acesso de usuário não encontrado na conexão');
        }
        const accountDetails = await this.metaAdsApi.getAdAccountDetails(
          adAccountId,
          userAccessToken,
        );

        return this.prisma.adAccount.update({
          where: { id: existing.id },
          data: {
            name: accountDetails.name,
            currency: accountDetails.currency,
            accountStatus: accountDetails.account_status.toString(),
            businessId: accountDetails.business?.id,
            connectionId,
            isActive: true,
            metadata: {
              timezone_name: accountDetails.timezone_name,
              timezone_offset_hours_utc: accountDetails.timezone_offset_hours_utc,
              age: accountDetails.age,
              funding_source: accountDetails.funding_source,
            },
            updatedAt: new Date(),
          },
        });
      }
    }

    // Obter detalhes da conta via Meta API (usa user access token)
    const metadata = connection.metadata as SocialConnectionMetadata | null;
    const userAccessToken = metadata?.userAccessToken || metadata?.accessToken;
    if (!userAccessToken) {
      throw new BadRequestException('Token de acesso de usuário não encontrado na conexão');
    }

    const accountDetails = await this.metaAdsApi.getAdAccountDetails(
      adAccountId,
      userAccessToken,
    );

    // Criar registro da conta
    return this.prisma.adAccount.create({
      data: {
        tenantId,
        adAccountId: accountDetails.id,
        name: accountDetails.name,
        currency: accountDetails.currency,
        accountStatus: accountDetails.account_status.toString(),
        businessId: accountDetails.business?.id,
        connectionId,
        metadata: {
          timezone_name: accountDetails.timezone_name,
          timezone_offset_hours_utc: accountDetails.timezone_offset_hours_utc,
          age: accountDetails.age,
          funding_source: accountDetails.funding_source,
        },
      },
    });
  }

  /**
   * Lista contas de anúncio conectadas ao tenant
   */
  async listConnected(tenantId: string) {
    return this.prisma.adAccount.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        connection: {
          select: {
            id: true,
            name: true,
            provider: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Remove vínculo de uma conta de anúncio (soft delete)
   */
  async disconnect(tenantId: string, accountId: string) {
    const account = await this.prisma.adAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
      },
    });

    if (!account) {
      throw new NotFoundException('Conta de anúncio não encontrada');
    }

    return this.prisma.adAccount.update({
      where: { id: accountId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Atualiza status de uma conta de anúncio (para sincronização periódica)
   */
  async updateAccountStatus(tenantId: string, accountId: string) {
    const account = await this.prisma.adAccount.findFirst({
      where: {
        id: accountId,
        tenantId,
        isActive: true,
      },
      include: {
        connection: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Conta de anúncio não encontrada');
    }

    const metadata = account.connection.metadata as SocialConnectionMetadata | null;
    const userAccessToken = metadata?.userAccessToken || metadata?.accessToken;
    if (!userAccessToken) {
      throw new BadRequestException('Token de acesso de usuário não encontrado na conexão');
    }

    const accountDetails = await this.metaAdsApi.getAdAccountDetails(
      account.adAccountId,
      userAccessToken,
    );

    return this.prisma.adAccount.update({
      where: { id: accountId },
      data: {
        name: accountDetails.name,
        accountStatus: accountDetails.account_status.toString(),
        updatedAt: new Date(),
      },
    });
  }
}

