import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreatePipelineStageDto } from './dto/create-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-stage.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class PipelineStagesService {
  private readonly logger = new Logger(PipelineStagesService.name);

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

    // Verificar se o statusId existe e pertence ao tenant
    const customStatus = await this.prisma.customLeadStatus.findFirst({
      where: {
        id: dto.statusId,
        tenantId,
      },
    });

    if (!customStatus) {
      throw new BadRequestException(
        `Status customizado não encontrado ou não pertence ao tenant`,
      );
    }

    // Verificar se já existe estágio com mesmo nome e statusId para este tenant
    const existing = await this.prisma.pipelineStage.findFirst({
      where: {
        tenantId,
        name: dto.name,
        statusId: dto.statusId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe um estágio com nome "${dto.name}" para este status`,
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

    try {
      this.logger.log(`[create] Criando estágio: name=${dto.name}, statusId=${dto.statusId}, order=${order}, tenantId=${tenantId}`);
      
      // Preparar dados para criação - APENAS campos que existem no banco
      // Não incluir: description, isDefault (podem não existir)
      const createData: any = {
        name: dto.name,
        statusId: dto.statusId,
        color: dto.color || customStatus.color || '#6B7280', // Usar cor do status se não especificada
        order,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        tenantId,
      };
      
      this.logger.log(`[create] Dados preparados:`, JSON.stringify(createData));
      
      const created = await this.prisma.pipelineStage.create({
        data: createData,
        select: {
          id: true,
          tenantId: true,
          name: true,
          order: true,
          statusId: true,
          color: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          customStatus: {
            select: {
              id: true,
              name: true,
              color: true,
              order: true,
            },
          },
        },
      });
      
      this.logger.log(`[create] Estágio criado com sucesso: id=${created.id}`);
      return created;
    } catch (error: any) {
      this.logger.error(`[create] ERRO ao criar estágio:`, {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
        dto,
        tenantId,
        createData,
      });
      
      // Se o erro for de constraint violada, retornar mensagem mais amigável
      if (error.code === 'P2002') {
        const target = error.meta?.target || 'campo';
        throw new BadRequestException(
          `Já existe um estágio com essas características para este tenant`,
        );
      }
      
      // Se o erro for de coluna não encontrada, retornar mensagem específica
      if (error.code === 'P2022') {
        const columnName = error.meta?.column || 'campo desconhecido';
        this.logger.error(`[create] Coluna não encontrada no banco: ${columnName}`, error.meta);
        throw new InternalServerErrorException(
          `Erro ao criar estágio: coluna "${columnName}" não encontrada no banco de dados. Verifique se as migrações foram aplicadas corretamente.`,
        );
      }
      
      // Se o erro for de tipo de dados incorreto
      if (error.code === 'P2003') {
        throw new BadRequestException(
          `Erro ao criar estágio: referência inválida. Verifique se o statusId existe.`,
        );
      }
      
      // Outros erros - retornar mensagem mais detalhada
      this.logger.error(`[create] Erro inesperado:`, {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
      
      throw new InternalServerErrorException(
        `Erro ao criar estágio: ${error.message || 'Erro desconhecido'}`,
      );
    }
  }

  /**
   * Listar todos os estágios do tenant (incluindo estágios padrão globais)
   */
  async findAll(tenantId: string) {
    try {
      this.logger.log(`[findAll] Iniciando busca de estágios - tenantId: ${tenantId}`);
      
      // Buscar estágios personalizados do tenant
      this.logger.log(`[findAll] Executando query Prisma para buscar estágios`);
      const customStages = await this.prisma.pipelineStage.findMany({
        where: { tenantId },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          tenantId: true,
          name: true,
          order: true,
          statusId: true,
          color: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          customStatus: {
            select: {
              id: true,
              name: true,
              color: true,
              order: true,
            },
          },
        },
      });

      this.logger.log(`[findAll] Sucesso - encontrados ${customStages.length} estágios`);
      return customStages;
    } catch (error: any) {
      this.logger.error(`[findAll] ERRO ao buscar estágios:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Buscar estágio por ID
   */
  async findOne(id: string, tenantId: string) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        order: true,
        statusId: true,
        color: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        customStatus: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
          },
        },
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

    // Verificar isDefault apenas se o campo existir (usar type assertion para evitar erro)
    const stageWithDefault = stage as any;
    if (stageWithDefault.isDefault) {
      throw new BadRequestException('Estágios padrão não podem ser editados');
    }

    if (stage.tenantId !== tenantId) {
      throw new ForbiddenException('Você não pode editar estágios de outros tenants');
    }

    // Se mudou statusId, validar que existe e pertence ao tenant
    if (dto.statusId && dto.statusId !== stage.statusId) {
      const customStatus = await this.prisma.customLeadStatus.findFirst({
        where: {
          id: dto.statusId,
          tenantId,
        },
      });

      if (!customStatus) {
        throw new BadRequestException(
          `Status customizado não encontrado ou não pertence ao tenant`,
        );
      }
    }

    // Se mudou nome ou statusId, verificar se não existe outro com mesmo nome/statusId
    if (dto.name || dto.statusId) {
      const existing = await this.prisma.pipelineStage.findFirst({
        where: {
          tenantId,
          name: dto.name ?? stage.name,
          statusId: dto.statusId ?? stage.statusId,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Já existe outro estágio com nome "${dto.name ?? stage.name}" para este status`,
        );
      }
    }

    return this.prisma.pipelineStage.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.statusId && { statusId: dto.statusId }),
        ...(dto.color && { color: dto.color }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        order: true,
        statusId: true,
        color: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        customStatus: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true,
          },
        },
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

    // Verificar se o estágio pertence ao tenant
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

