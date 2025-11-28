import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createLeadDto: CreateLeadDto, tenantId: string) {
    return this.prisma.lead.create({
      data: {
        ...createLeadDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string, status?: string, statusId?: string, userId?: string, userRole?: UserRole) {
    try {
      this.logger.log(`[findAll] Iniciando busca de leads - tenantId: ${tenantId}, status: ${status || 'todos'}, statusId: ${statusId || 'todos'}, userId: ${userId}, userRole: ${userRole}`);
      
      const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;
      const where: any = { tenantId };
      
      this.logger.log(`[findAll] isAdmin: ${isAdmin}`);
      
      // Priorizar statusId se fornecido, senão usar status (enum) para compatibilidade
      if (statusId) {
        where.statusId = statusId;
        this.logger.log(`[findAll] Filtrando por statusId: ${statusId}`);
      } else if (status) {
        where.status = status;
        this.logger.log(`[findAll] Filtrando por status: ${status}`);
      }

      // Para agents (USER), filtrar apenas leads que têm atendimentos atribuídos a eles
      // Para admins e managers, retornar todos os leads
      if (!isAdmin && userId) {
        this.logger.log(`[findAll] Filtrando leads para agente - userId: ${userId}`);
        
        // Buscar TODOS os atendimentos do agente (qualquer status: OPEN, IN_PROGRESS, TRANSFERRED, CLOSED)
        // Isso garante que o agente veja todos os leads que já foram atribuídos a ele
        const attendances = await this.prisma.attendance.findMany({
          where: {
            tenantId,
            assignedUserId: userId,
            // Não filtrar por status - incluir todos os atendimentos do agente
          },
          select: {
            leadId: true,
          },
        });

        this.logger.log(`[findAll] Encontrados ${attendances.length} atendimentos para o agente ${userId}`);

        // Remover duplicatas usando Set (pode haver múltiplos atendimentos para o mesmo lead)
        const leadIds = Array.from(new Set(attendances.map((att) => att.leadId)));
        
        this.logger.log(`[findAll] Leads únicos encontrados: ${leadIds.length}`);
        
        // Se não há atendimentos atribuídos ao agente, retornar array vazio
        if (leadIds.length === 0) {
          this.logger.log(`[findAll] Nenhum atendimento encontrado para o agente ${userId}, retornando array vazio`);
          return [];
        }

        // Filtrar leads pelos IDs dos atendimentos do agente
        where.id = { in: leadIds };
      } else {
        this.logger.log(`[findAll] Admin/Manager - retornando todos os leads do tenant ${tenantId}`);
      }

      this.logger.log(`[findAll] Executando query Prisma com where: ${JSON.stringify(where)}`);

      const leads = await this.prisma.lead.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          phone: true,
          statusId: true,
          tags: true,
          profilePictureURL: true,
          origin: true,
          createdAt: true,
          updatedAt: true,
          customStatus: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
            },
          },
          conversations: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              status: true,
              isBotAttending: true,
            },
          },
        },
      });

      this.logger.log(`[findAll] Sucesso - retornando ${leads.length} leads`);
      return leads;
    } catch (error: any) {
      this.logger.error(`[findAll] ERRO ao buscar leads:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        tenantId,
        status,
        statusId,
        userId,
        userRole,
      });
      throw error;
    }
  }

  async findOne(id: string, tenantId: string) {
    try {
      this.logger.log(`[findOne] Buscando lead - id: ${id}, tenantId: ${tenantId}`);
      
      const lead = await this.prisma.lead.findFirst({
        where: {
          id,
          tenantId,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          phone: true,
          statusId: true,
          tags: true,
          profilePictureURL: true,
          origin: true,
          createdAt: true,
          updatedAt: true,
          customStatus: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
            },
          },
          conversations: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              status: true,
              messages: {
                take: 1,
                orderBy: {
                  createdAt: 'desc',
                },
                select: {
                  id: true,
                  contentText: true,
                  contentType: true,
                  senderType: true,
                  direction: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!lead) {
        this.logger.warn(`[findOne] Lead não encontrado - id: ${id}, tenantId: ${tenantId}`);
        throw new NotFoundException('Lead não encontrado');
      }

      this.logger.log(`[findOne] Lead encontrado com sucesso - id: ${id}`);
      return lead;
    } catch (error: any) {
      this.logger.error(`[findOne] ERRO ao buscar lead:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        id,
        tenantId,
      });
      throw error;
    }
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, tenantId: string) {
    const lead = await this.findOne(id, tenantId);

    return this.prisma.lead.update({
      where: { id },
      data: updateLeadDto,
    });
  }

  async updateStatus(id: string, status: any, tenantId: string) {
    const lead = await this.findOne(id, tenantId);

    // Método obsoleto - usar updateStatusId ao invés
    throw new Error('Método updateStatus está obsoleto. Use updateStatusId.');
  }

  async updateStatusId(id: string, statusId: string | null, tenantId: string) {
    const lead = await this.findOne(id, tenantId);

    // Validar que statusId pertence ao tenant se fornecido
    if (statusId) {
      const status = await this.prisma.customLeadStatus.findFirst({
        where: {
          id: statusId,
          tenantId,
        },
      });

      if (!status) {
        throw new NotFoundException('Status não encontrado ou não pertence ao tenant');
      }
    }

    return this.prisma.lead.update({
      where: { id },
      data: { statusId },
      include: {
        customStatus: {
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
          },
        },
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const lead = await this.findOne(id, tenantId);

    return this.prisma.lead.delete({
      where: { id },
    });
  }
}

