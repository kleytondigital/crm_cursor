import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';

interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApiKeyDto, context: AuthContext) {
    // Apenas ADMIN e SUPER_ADMIN podem criar API keys
    if (context.role !== UserRole.ADMIN && context.role !== UserRole.SUPER_ADMIN && context.role !== UserRole.MANAGER) {
      throw new ForbiddenException('Apenas administradores podem criar API Keys');
    }

    // Gerar uma chave aleatória
    const rawKey = this.generateRawKey();
    const hashedKey = this.hashApiKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: dto.name,
        key: hashedKey,
        tenantId: context.role === UserRole.SUPER_ADMIN ? null : context.tenantId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    // Retornar a chave raw apenas uma vez (não será possível recuperá-la depois)
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // IMPORTANTE: Mostrar apenas na criação
      tenantId: apiKey.tenantId,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      warning: 'Guarde esta chave em local seguro. Ela não poderá ser recuperada novamente.',
    };
  }

  async findAll(context: AuthContext) {
    const where: any = {
      isActive: true,
    };

    // SUPER_ADMIN vê todas as keys
    // Admins veem apenas as keys do seu tenant
    if (context.role !== UserRole.SUPER_ADMIN) {
      where.tenantId = context.tenantId;
    }

    const keys = await this.prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        tenantId: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        // Não retornar a chave hasheada
      },
    });

    return keys;
  }

  async findOne(id: string, context: AuthContext) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        tenantId: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key não encontrada');
    }

    // Verificar permissão
    if (context.role !== UserRole.SUPER_ADMIN && apiKey.tenantId !== context.tenantId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta API Key');
    }

    return apiKey;
  }

  async revoke(id: string, context: AuthContext) {
    const apiKey = await this.findOne(id, context);

    return this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
  }

  async remove(id: string, context: AuthContext) {
    const apiKey = await this.findOne(id, context);

    await this.prisma.apiKey.delete({
      where: { id: apiKey.id },
    });

    return { message: 'API Key removida com sucesso' };
  }

  private generateRawKey(): string {
    // Gerar uma chave de 32 bytes (256 bits) em formato hexadecimal
    // Formato: crm_<32 bytes hex>
    const randomBytes = crypto.randomBytes(32);
    return `crm_${randomBytes.toString('hex')}`;
  }

  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }
}

