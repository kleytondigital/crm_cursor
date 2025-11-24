import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateLeadStatusDto } from './dto/create-lead-status.dto';
import { UpdateLeadStatusDto, UpdateLeadStatusOrderDto } from './dto/update-lead-status.dto';

@Injectable()
export class LeadStatusService {
  private readonly logger = new Logger(LeadStatusService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.customLeadStatus.findMany({
      where: {
        tenantId,
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async findOne(id: string, tenantId: string) {
    const status = await this.prisma.customLeadStatus.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!status) {
      throw new NotFoundException('Status não encontrado');
    }

    return status;
  }

  async create(dto: CreateLeadStatusDto, tenantId: string) {
    // Verificar se já existe status com o mesmo nome no tenant
    const existing = await this.prisma.customLeadStatus.findFirst({
      where: {
        tenantId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe um status com este nome');
    }

    // Se não especificou ordem, pegar a maior ordem + 1
    let order = dto.order;
    if (order === undefined) {
      const maxOrder = await this.prisma.customLeadStatus.findFirst({
        where: { tenantId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = maxOrder ? maxOrder.order + 1 : 0;
    }

    return this.prisma.customLeadStatus.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color || '#6B7280',
        order: order,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        tenantId,
      },
    });
  }

  async update(id: string, dto: UpdateLeadStatusDto, tenantId: string) {
    const status = await this.findOne(id, tenantId);

    // Se está mudando o nome, verificar se não conflita com outro status
    if (dto.name && dto.name !== status.name) {
      const existing = await this.prisma.customLeadStatus.findFirst({
        where: {
          tenantId,
          name: dto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('Já existe um status com este nome');
      }
    }

    return this.prisma.customLeadStatus.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description && { description: dto.description }),
        ...(dto.color && { color: dto.color }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async updateOrder(id: string, dto: UpdateLeadStatusOrderDto, tenantId: string) {
    const status = await this.findOne(id, tenantId);

    return this.prisma.customLeadStatus.update({
      where: { id },
      data: {
        order: dto.order,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const status = await this.findOne(id, tenantId);

    // Verificar se há leads usando este status
    const leadsCount = await this.prisma.lead.count({
      where: {
        statusId: id,
        tenantId,
      },
    });

    if (leadsCount > 0) {
      throw new BadRequestException(
        `Não é possível deletar este status pois existem ${leadsCount} lead(s) associado(s). Mova os leads para outro status antes de deletar.`,
      );
    }

    return this.prisma.customLeadStatus.delete({
      where: { id },
    });
  }
}

