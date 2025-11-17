import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '@/shared/prisma/prisma.service';
import * as crypto from 'crypto';

export interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    tenantId: string | null;
    name: string;
  };
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API Key não fornecida');
    }

    // Hash da API key para comparação
    const hashedKey = this.hashApiKey(apiKey);

    // Buscar API key no banco
    const keyRecord = await this.prisma.apiKey.findFirst({
      where: {
        key: hashedKey,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: {
        id: true,
        name: true,
        tenantId: true,
      },
    });

    if (!keyRecord) {
      throw new UnauthorizedException('API Key inválida ou expirada');
    }

    // Adicionar informações da API key na request
    request.apiKey = keyRecord;

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    // Buscar no header X-API-Key
    const headerKey = request.headers['x-api-key'] as string;
    if (headerKey) {
      return headerKey;
    }

    // Buscar no query param (alternativa)
    const queryKey = request.query.apiKey as string;
    if (queryKey) {
      return queryKey;
    }

    return undefined;
  }

  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}

