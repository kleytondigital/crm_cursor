import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreatePipelineStageDto } from './dto/create-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-stage.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class PipelineStagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar novo estágio de pipeline
   * Apenas ADMIN e SUPER_ADMIN podem criar
   */
  async create(
    dto: CreatePipelineStageDto,
    tenantId: string,
    role: UserRole,
  ) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Apenas administradores podem criar estágios');
    }

    // Verificar se já existe estágio com mesmo nome e status para este tenant
    const existing = await this.prisma.pipelineStage.findFirst({
      where: {
        tenantId,
        name: dto.name,
        status: dto.status,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe um estágio com nome "${dto.name}" e status "${dto.status}"`,
      );
    }

    // Se não informou order, pegar o próximo número disponível
    let order = dto.order;
    if (order === undefined) {
      const maxOrder = await this.prisma.pipelineStage.findFirst({
        where: { tenantId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (maxOrder?.order ?? -1) + 1;
    }

    return this.prisma.pipelineStage.create({
      data: {
        name: dto.name,
        status: dto.status,
        color: dto.color || '#6B7280',
        order,
        isActive: dto.isActive ?? true,
        tenantId,
      },
    });
  }

  /**
   * Listar todos os estágios do tenant (incluindo estágios padrão globais)
   */
  async findAll(tenantId: string) {
    // Buscar estágios personalizados do tenant + estágios padrão globais
    const customStages = await this.prisma.pipelineStage.findMany({
      where: { tenantId },
      orderBy: { order: 'asc' },
    });

    const defaultStages = await this.prisma.pipelineStage.findMany({
      where: { tenantId: null, isDefault: true, isActive: true },
      orderBy: { order: 'asc' },
    });

    // Se o tenant não tem estágios personalizados, retornar apenas os padrões
    if (customStages.length === 0) {
      return defaultStages;
    }

    // Retornar estágios personalizados (eles sobrescrevem os padrões)
    return customStages;
  }

  /**
   * Buscar estágio por ID
   */
  async findOne(id: string, tenantId: string) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: {
        id,
        OR: [
          { tenantId },
          { tenantId: null, isDefault: true }, // Estágios padrão globais
        ],
      },
    });

    if (!stage) {
      throw new NotFoundException('Estágio não encontrado');
    }

    return stage;
  }

  /**
   * Atualizar estágio
   * Apenas ADMIN e SUPER_ADMIN podem atualizar
   * Estágios padrão (isDefault=true) não podem ser editados
   */
  async update(
    id: string,
    dto: UpdatePipelineStageDto,
    tenantId: string,
    role: UserRole,
  ) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Apenas administradores podem editar estágios');
    }

    const stage = await this.findOne(id, tenantId);

    if (stage.isDefault) {
      throw new BadRequestException('Estágios padrão não podem ser editados');
    }

    if (stage.tenantId !== tenantId) {
      throw new ForbiddenException('Você não pode editar estágios de outros tenants');
    }

    // Se mudou nome ou status, verificar se não existe outro com mesmo nome/status
    if (dto.name || dto.status) {
      const existing = await this.prisma.pipelineStage.findFirst({
        where: {
          tenantId,
          name: dto.name ?? stage.name,
          status: dto.status ?? stage.status,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Já existe outro estágio com nome "${dto.name ?? stage.name}" e status "${dto.status ?? stage.status}"`,
        );
      }
    }

    return this.prisma.pipelineStage.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        color: dto.color,
        order: dto.order,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Remover estágio
   * Apenas ADMIN e SUPER_ADMIN podem remover
   * Estágios padrão não podem ser removidos
   */
  async remove(id: string, tenantId: string, role: UserRole) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Apenas administradores podem remover estágios');
    }

    const stage = await this.findOne(id, tenantId);

    if (stage.isDefault) {
      throw new BadRequestException('Estágios padrão não podem ser removidos');
    }

    if (stage.tenantId !== tenantId) {
      throw new ForbiddenException('Você não pode remover estágios de outros tenants');
    }

    await this.prisma.pipelineStage.delete({
      where: { id },
    });

    return { message: 'Estágio removido com sucesso' };
  }

  /**
   * Reordenar estágios
   */
  async reorder(
    stages: Array<{ id: string; order: number }>,
    tenantId: string,
    role: UserRole,
  ) {
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Apenas administradores podem reordenar estágios');
    }

    // Atualizar ordem de cada estágio
    await Promise.all(
      stages.map((stage) =>
        this.prisma.pipelineStage.updateMany({
          where: {
            id: stage.id,
            tenantId,
          },
          data: {
            order: stage.order,
          },
        }),
      ),
    );

    return { message: 'Estágios reordenados com sucesso' };
  }
}

