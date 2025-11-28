import {
  AttendanceLogAction,
  AttendancePriority,
  AttendanceStatus,
  DepartmentUserRole,
  MessageDirection,
  Prisma,
  UserRole,
} from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AttendancesGateway } from './attendances.gateway';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { AttendanceTransferDto } from './dto/attendance-transfer.dto';
import { AttendanceCloseDto } from './dto/attendance-close.dto';
import { AttendancePriorityDto } from './dto/attendance-priority.dto';
import { AttendanceClaimDto } from './dto/attendance-claim.dto';
import { ConfigService } from '@nestjs/config';

interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

@Injectable()
export class AttendancesService {
  private readonly logger = new Logger(AttendancesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AttendancesGateway,
    private readonly configService: ConfigService,
  ) {}

  private isAdmin(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.MANAGER;
  }

  async listAttendances(
    filters: AttendanceFilterDto,
    context: AuthContext,
  ) {
    try {
      this.logger.log(`[listAttendances] Iniciando busca de atendimentos - tenantId: ${context.tenantId}, userId: ${context.userId}, role: ${context.role}`);
      
      const userDepartmentIds = await this.findUserDepartmentIds(context.userId);
      this.logger.log(`[listAttendances] Departamentos do usuário: ${userDepartmentIds.length}`);
      
      const where: Prisma.AttendanceWhereInput = {
        tenantId: context.tenantId,
      };

    // Filtros por role:
    // - Admin/MANAGER: Vê TODOS os atendimentos (sem restrição adicional)
    // - Agent/USER: Vê apenas:
    //   1. Seus próprios atendimentos (qualquer status onde assignedUserId = userId)
    //   2. Atendimentos OPEN dos seus departamentos (sem assignedUserId ou com assignedUserId null)
    //   3. Atendimentos TRANSFERRED dos seus departamentos
    const isAdmin = this.isAdmin(context.role);

    if (!isAdmin) {
      // Para agents, definir as restrições de visualização primeiro
      // IMPORTANTE: Agents veem atendimentos:
      // 1. Seus próprios atendimentos (qualquer status onde assignedUserId = userId)
      // 2. Atendimentos transferidos para departamentos que o usuário faz parte
      // 3. Atendimentos transferidos diretamente para o usuário (assignedUserId = userId e status = TRANSFERRED)
      const agentWhere: Prisma.AttendanceWhereInput[] = [
        // 1. Seus próprios atendimentos (qualquer status - OPEN, IN_PROGRESS, CLOSED, TRANSFERRED)
        //    Isso permite que o agent veja seus atendimentos mesmo que mudem de departamento
        {
          assignedUserId: context.userId,
        },
      ];

      // 2. Atendimentos dos departamentos do usuário (OPEN ou TRANSFERRED)
      //    CRÍTICO: Só mostrar atendimentos se o usuário estiver no departamento
      if (userDepartmentIds.length > 0) {
        // Atendimentos OPEN nos departamentos do usuário (disponíveis sem atendente)
        agentWhere.push({
          AND: [
            { departmentId: { in: userDepartmentIds } },
            { status: AttendanceStatus.OPEN },
            { assignedUserId: null }, // Apenas atendimentos sem atendente atribuído
          ],
        });
        // Atendimentos TRANSFERRED nos departamentos do usuário (aguardando atribuição)
        agentWhere.push({
          AND: [
            { departmentId: { in: userDepartmentIds } },
            { status: AttendanceStatus.TRANSFERRED },
          ],
        });
      }

      // Nota: Atendimentos TRANSFERRED diretamente para o usuário já estão cobertos pelo caso 1
      // (assignedUserId: context.userId) que inclui todos os status, mas deixamos explícito para clareza

      // Aplicar restrição de visualização do agent
      // Se o agent não está em nenhum departamento, só vê seus próprios atendimentos
      where.AND = [
        {
          OR: agentWhere,
        },
      ];

      // VALIDAÇÃO CRÍTICA: Se o usuário filtrar por departmentId, verificar se ele tem acesso
      // Prevenir que agents vejam atendimentos de departamentos aos quais não pertencem
      if (filters.departmentId) {
        // Se o agent tentar filtrar por um departamento, verificar se ele tem acesso
        if (!userDepartmentIds.includes(filters.departmentId)) {
          // Agent não tem acesso a este departamento, retornar vazio
          return [];
        }
        // Agent tem acesso, aplicar o filtro normalmente (já está coberto pela lógica acima)
      }

      // VALIDAÇÃO: Se o usuário filtrar por assignedUserId, verificar se é ele mesmo
      // Prevenir que agents vejam atendimentos de outros agents
      if (filters.assignedUserId && filters.assignedUserId !== context.userId) {
        // Agent tentando ver atendimentos de outro usuário, retornar vazio
        return [];
      }
    }
    // Admin: não aplica filtros adicionais de role, vê todos os atendimentos

    // Aplicar filtros do usuário (status, priority, etc.)
    // Para agents, esses filtros serão aplicados dentro das restrições acima
    if (filters.status) {
      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ status: filters.status });
      } else {
        where.status = filters.status;
      }
    }

    if (filters.priority) {
      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ priority: filters.priority });
      } else {
        where.priority = filters.priority;
      }
    }

    // Aplicar filtro de departamento apenas para admins ou se já validado acima para agents
    if (filters.departmentId && isAdmin) {
      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ departmentId: filters.departmentId });
      } else {
        where.departmentId = filters.departmentId;
      }
    }

    // Aplicar filtro de assignedUserId apenas para admins ou se já validado acima para agents
    if (filters.assignedUserId && isAdmin) {
      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ assignedUserId: filters.assignedUserId });
      } else {
        where.assignedUserId = filters.assignedUserId;
      }
    }

    if (filters.urgent !== undefined) {
      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ isUrgent: filters.urgent === 'true' });
      } else {
        where.isUrgent = filters.urgent === 'true';
      }
    }

    if (filters.search) {
      const searchCondition: Prisma.AttendanceWhereInput = {
        OR: [
          { lead: { name: { contains: filters.search, mode: 'insensitive' } } },
          { lead: { phone: { contains: filters.search } } },
        ],
      };
      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push(searchCondition);
      } else {
        where.OR = searchCondition.OR;
      }
    }

    // Filtro por leadId
    if (filters.leadId) {
      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ leadId: filters.leadId });
      } else {
        where.leadId = filters.leadId;
      }
    }

      this.logger.log(`[listAttendances] Executando query Prisma com where: ${JSON.stringify(where)}`);

      const attendances = await this.prisma.attendance.findMany({
        where,
        orderBy: [
          { isUrgent: 'desc' },
          { priority: 'desc' },
          { lastMessageAt: 'desc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          tenantId: true,
          leadId: true,
          connectionId: true,
          departmentId: true,
          assignedUserId: true,
          status: true,
          priority: true,
          isUrgent: true,
          lastMessage: true,
          lastMessageAt: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          updatedAt: true,
          transferredById: true,
          closedById: true,
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              profilePictureURL: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`[listAttendances] Sucesso - encontrados ${attendances.length} atendimentos`);

      return attendances.map((attendance) =>
        this.serializeAttendance(attendance),
      );
    } catch (error: any) {
      this.logger.error(`[listAttendances] ERRO ao buscar atendimentos:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        tenantId: context.tenantId,
        userId: context.userId,
        role: context.role,
        filters,
      });
      throw error;
    }
  }

  async getSmartQueue(context: AuthContext) {
    try {
      this.logger.log(`[getSmartQueue] Iniciando busca de fila inteligente - tenantId: ${context.tenantId}, userId: ${context.userId}, role: ${context.role}`);
      
      // Smart Queue: Fila inteligente de atendimentos disponíveis
      // - Admin: vê todos os atendimentos disponíveis (OPEN e TRANSFERRED)
      // - Agent: vê apenas atendimentos disponíveis dos seus departamentos
      const isAdmin = this.isAdmin(context.role);
      this.logger.log(`[getSmartQueue] isAdmin: ${isAdmin}`);
      
      const where: Prisma.AttendanceWhereInput = {
        tenantId: context.tenantId,
      };

    if (!isAdmin) {
      // Para agents, mostrar atendimentos:
      // 1. Dos seus departamentos (OPEN sem atendente ou TRANSFERRED)
      // 2. Transferidos diretamente para o usuário (TRANSFERRED e assignedUserId = userId)
      const departmentIds = await this.findUserDepartmentIds(context.userId);
      
      const agentWhere: Prisma.AttendanceWhereInput[] = [];

      if (departmentIds.length > 0) {
        // Atendimentos OPEN sem atendente nos departamentos do agent
        agentWhere.push({
          AND: [
            { departmentId: { in: departmentIds } },
            { status: AttendanceStatus.OPEN },
            { assignedUserId: null },
          ],
        });
        // Atendimentos TRANSFERRED nos departamentos do agent
        agentWhere.push({
          AND: [
            { departmentId: { in: departmentIds } },
            { status: AttendanceStatus.TRANSFERRED },
          ],
        });
      }

      // Atendimentos transferidos diretamente para o usuário
      agentWhere.push({
        AND: [
          { assignedUserId: context.userId },
          { status: AttendanceStatus.TRANSFERRED },
        ],
      });

      if (agentWhere.length > 0) {
        where.AND = [
          {
            OR: agentWhere,
          },
        ];
      } else {
        // Agent não está em nenhum departamento e não tem atendimentos transferidos, retornar vazio
        return [];
      }
    } else {
      // Admin: vê todos os atendimentos OPEN e TRANSFERRED
      where.status = { in: [AttendanceStatus.OPEN, AttendanceStatus.TRANSFERRED] };
    }

      this.logger.log(`[getSmartQueue] Executando query Prisma com where: ${JSON.stringify(where)}`);

      const attendances = await this.prisma.attendance.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { isUrgent: 'desc' },
          { createdAt: 'asc' },
        ],
        take: 10,
        select: {
          id: true,
          tenantId: true,
          leadId: true,
          connectionId: true,
          departmentId: true,
          assignedUserId: true,
          status: true,
          priority: true,
          isUrgent: true,
          lastMessage: true,
          lastMessageAt: true,
          startedAt: true,
          endedAt: true,
          createdAt: true,
          updatedAt: true,
          transferredById: true,
          closedById: true,
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              profilePictureURL: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(`[getSmartQueue] Sucesso - encontrados ${attendances.length} atendimentos na fila`);

      return attendances.map((attendance) =>
        this.serializeAttendance(attendance),
      );
    } catch (error: any) {
      this.logger.error(`[getSmartQueue] ERRO ao buscar fila inteligente:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        tenantId: context.tenantId,
        userId: context.userId,
        role: context.role,
      });
      throw error;
    }
  }

  async getStats(context: AuthContext) {
    const isAdmin = this.isAdmin(context.role);
    const tenantWhere = { tenantId: context.tenantId };
    
    // Para agents, filtrar apenas atendimentos do agente ou dos seus departamentos
    let whereClause: any = { ...tenantWhere };
    
    if (!isAdmin) {
      // Agents: métricas apenas dos seus próprios atendimentos e dos seus departamentos
      // Seguindo a mesma lógica de listAttendances:
      // 1. Seus próprios atendimentos (qualquer status)
      // 2. Atendimentos OPEN dos seus departamentos (sem atendente)
      // 3. Atendimentos TRANSFERRED dos seus departamentos
      // 4. Atendimentos TRANSFERRED diretamente para o usuário
      const userDepartmentIds = await this.findUserDepartmentIds(context.userId);
      
      const agentWhere: any[] = [
        // Atendimentos atribuídos ao agente (qualquer status)
        { assignedUserId: context.userId },
      ];
      
      // Atendimentos dos departamentos do agente
      if (userDepartmentIds.length > 0) {
        // Atendimentos OPEN sem atendente nos departamentos do agente
        agentWhere.push({
          AND: [
            { departmentId: { in: userDepartmentIds } },
            { status: AttendanceStatus.OPEN },
            { assignedUserId: null },
          ],
        });
        // Atendimentos TRANSFERRED nos departamentos do agente
        agentWhere.push({
          AND: [
            { departmentId: { in: userDepartmentIds } },
            { status: AttendanceStatus.TRANSFERRED },
          ],
        });
      }

      // Atendimentos TRANSFERRED diretamente para o usuário
      agentWhere.push({
        AND: [
          { assignedUserId: context.userId },
          { status: AttendanceStatus.TRANSFERRED },
        ],
      });
      
      whereClause.AND = [
        {
          OR: agentWhere,
        },
      ];
    }
    // Admin: métricas globais (sem filtro adicional)

    const [open, inProgress, transferred, closed, durations] =
      await Promise.all([
        this.prisma.attendance.count({
          where: { ...whereClause, status: AttendanceStatus.OPEN },
        }),
        this.prisma.attendance.count({
          where: { ...whereClause, status: AttendanceStatus.IN_PROGRESS },
        }),
        this.prisma.attendance.count({
          where: { ...whereClause, status: AttendanceStatus.TRANSFERRED },
        }),
        this.prisma.attendance.count({
          where: { ...whereClause, status: AttendanceStatus.CLOSED },
        }),
        this.prisma.attendance.findMany({
          where: {
            ...whereClause,
            status: AttendanceStatus.CLOSED,
            startedAt: { not: null },
            endedAt: { not: null },
            // Para agents, apenas atendimentos finalizados por eles
            ...(isAdmin ? {} : { assignedUserId: context.userId }),
          },
          select: { startedAt: true, endedAt: true },
        }),
      ]);

    const tempoMedio =
      durations.length > 0
        ? Math.round(
            durations.reduce((acc, cur) => {
              const diff = (cur.endedAt!.getTime() - cur.startedAt!.getTime()) / 1000 / 60;
              return acc + diff;
            }, 0) / durations.length,
          )
        : 0;

    return {
      total_abertos: open + transferred,
      total_em_andamento: inProgress,
      total_encerrados: closed,
      tempo_medio_atendimento: tempoMedio,
    };
  }

  async getAttendance(
    id: string,
    context: AuthContext,
  ) {
    try {
      const attendance = await this.prisma.attendance.findFirst({
        where: {
          id,
          tenantId: context.tenantId,
        },
        include: {
          ...this.defaultAttendanceInclude(),
          logs: {
            orderBy: { createdAt: 'asc' },
            include: {
              performedBy: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      if (!attendance) {
        throw new NotFoundException('Atendimento não encontrado');
      }

      await this.ensureCanView(attendance, context);

      // Buscar conversa para incluir lead com profilePictureURL
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          tenantId: context.tenantId,
          leadId: attendance.leadId,
        },
        include: {
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              tags: true,
              profilePictureURL: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const messages = await this.prisma.message.findMany({
        where: {
          tenantId: context.tenantId,
          leadId: attendance.leadId,
        },
        orderBy: { createdAt: 'asc' },
      });

      const serializedAttendance = this.serializeAttendance(attendance);

      return {
        ...serializedAttendance,
        logs: (attendance.logs || []).map((log) => ({
          id: log.id,
          action: log.action,
          notes: log.notes || null,
          createdAt: log.createdAt instanceof Date
            ? log.createdAt.toISOString()
            : typeof log.createdAt === 'string'
            ? log.createdAt
            : new Date().toISOString(),
          performedBy: log.performedBy
            ? {
                id: log.performedBy.id,
                name: log.performedBy.name,
                email: log.performedBy.email,
              }
            : null,
        })),
        messages: messages.map((message) => {
          try {
            const createdAtDate =
              message.createdAt instanceof Date
                ? message.createdAt
                : message.createdAt
                ? new Date(message.createdAt)
                : new Date();

            const timestampDate = message.timestamp
              ? message.timestamp instanceof Date
                ? message.timestamp
                : new Date(message.timestamp)
              : null;

            return {
              id: message.id,
              conversationId: message.conversationId,
              senderType: message.senderType,
              contentType: message.contentType,
              contentUrl: this.buildAbsoluteMediaUrl(message.contentUrl),
              contentText: message.contentText || null,
              latitude: message.latitude,
              longitude: message.longitude,
              tenantId: message.tenantId,
              createdAt: createdAtDate.toISOString(),
              direction: message.direction || 'INCOMING',
              timestamp: timestampDate ? timestampDate.toISOString() : null,
              sender: message.sender || null,
              // Incluir conversa com lead se disponível
              conversation: conversation ? {
                id: conversation.id,
                leadId: conversation.leadId,
                lead: conversation.lead,
                assignedUserId: conversation.assignedUserId,
                assignedUser: conversation.assignedUser,
                status: conversation.status,
                tenantId: conversation.tenantId,
                createdAt: conversation.createdAt.toISOString(),
                updatedAt: conversation.updatedAt.toISOString(),
              } : null,
            };
          } catch (error) {
            console.error('Erro ao serializar mensagem:', error, message);
            // Retornar versão simplificada em caso de erro
            return {
              id: message.id,
              conversationId: message.conversationId || null,
              senderType: message.senderType || 'LEAD',
              contentType: message.contentType || 'TEXT',
              contentUrl: message.contentUrl || null,
              contentText: message.contentText || null,
              tenantId: message.tenantId,
              createdAt: new Date().toISOString(),
              direction: message.direction || 'INCOMING',
              timestamp: null,
              sender: message.sender || null,
              conversation: conversation ? {
                id: conversation.id,
                leadId: conversation.leadId,
                lead: conversation.lead,
                assignedUserId: conversation.assignedUserId,
                assignedUser: conversation.assignedUser,
                status: conversation.status,
                tenantId: conversation.tenantId,
                createdAt: conversation.createdAt.toISOString(),
                updatedAt: conversation.updatedAt.toISOString(),
              } : null,
            };
          }
        }),
      };
    } catch (error) {
      console.error('Erro em getAttendance:', error);
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new Error(`Erro ao buscar atendimento: ${error?.message || error}`);
    }
  }

  async getAttendancesByLead(
    leadId: string,
    context: AuthContext,
  ) {
    try {
      const attendances = await this.prisma.attendance.findMany({
        where: {
          leadId,
          tenantId: context.tenantId,
        },
        include: this.defaultAttendanceInclude(),
        orderBy: { createdAt: 'desc' },
      });

      return attendances.map(attendance => this.serializeAttendance(attendance));
    } catch (error) {
      console.error('Erro em getAttendancesByLead:', error);
      throw new Error(`Erro ao buscar atendimentos do lead: ${error?.message || error}`);
    }
  }

  async claimAttendance(
    leadId: string,
    dto: AttendanceClaimDto,
    context: AuthContext,
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        tenantId: context.tenantId,
        leadId,
        status: { in: [AttendanceStatus.OPEN, AttendanceStatus.TRANSFERRED] },
      },
      include: this.defaultAttendanceInclude(),
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento disponível não encontrado');
    }

    await this.ensureCanClaim(attendance, context);

    // Determinar o departmentId a ser usado
    let departmentId: string | null = attendance.departmentId;

    // Para agents (não-admin), determinar o departmentId baseado nos departamentos do usuário
    if (!this.isAdmin(context.role)) {
      const userDepartmentIds = await this.findUserDepartmentIds(context.userId);

      if (userDepartmentIds.length === 0) {
        // Usuário não está em nenhum departamento, não pode assumir atendimento
        throw new ForbiddenException('Você precisa estar em pelo menos um departamento para assumir atendimentos');
      }

      if (userDepartmentIds.length === 1) {
        // Usuário está em apenas 1 departamento: atrela automaticamente
        departmentId = userDepartmentIds[0];
      } else {
        // Usuário está em 2 ou mais departamentos: requer departmentId no DTO
        if (!dto.departmentId) {
          // Retornar erro com lista de departamentos disponíveis
          const departments = await this.prisma.department.findMany({
            where: {
              id: { in: userDepartmentIds },
              tenantId: context.tenantId,
            },
            select: {
              id: true,
              name: true,
            },
          });

          throw new BadRequestException({
            message: 'Você está em múltiplos departamentos. Por favor, especifique qual departamento deve ser atrelado ao atendimento.',
            requiresDepartmentSelection: true,
            availableDepartments: departments,
          });
        }

        // Validar se o departmentId fornecido é um dos departamentos do usuário
        if (!userDepartmentIds.includes(dto.departmentId)) {
          throw new ForbiddenException('Você não tem acesso a este departamento');
        }

        departmentId = dto.departmentId;
      }
    } else {
      // Para admin: se departmentId foi fornecido no DTO, usar; caso contrário, manter o existente
      if (dto.departmentId) {
        departmentId = dto.departmentId;
      }
    }

    // PRIMEIRO: Atualizar o atendimento para garantir que assignedUserId seja definido
    await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        status: AttendanceStatus.IN_PROGRESS,
        assignedUserId: context.userId, // Garantir que o assignedUserId seja definido
        departmentId: departmentId, // Usar o departmentId determinado acima
        startedAt: attendance.startedAt ?? new Date(),
        isUrgent: false,
        lastMessageAt: attendance.lastMessageAt ?? new Date(),
        logs: {
          create: {
            action: AttendanceLogAction.CLAIMED,
            performedById: context.userId,
            notes: dto?.notes,
          },
        },
      },
    });

    // SEGUNDO: Recarregar o atendimento completo com includes para garantir que assignedUser esteja presente
    const updated = await this.prisma.attendance.findUnique({
      where: { id: attendance.id },
      include: this.defaultAttendanceInclude(),
    });

    if (!updated) {
      throw new NotFoundException('Atendimento não encontrado após atualização');
    }

    // TERCEIRO: Atualizar ou criar conversa DEPOIS de atualizar o atendimento
    // Isso garante que a conversa apareça na lista de conversas do agent
    // Passar o departmentId do atendimento para sincronizar com a conversa
    await this.getOrCreateConversationForAttendance(
      context.tenantId,
      leadId,
      context.userId,
      updated.departmentId, // Usar o departmentId do atendimento atualizado
    );

    this.emitAttendanceEvent('attendance:update', updated);
    return this.serializeAttendance(updated);
  }

  async transferAttendance(
    id: string,
    dto: AttendanceTransferDto,
    context: AuthContext,
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId: context.tenantId },
      include: this.defaultAttendanceInclude(),
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    await this.ensureCanTransfer(attendance, context);

    if (!dto.targetUserId && !dto.targetDepartmentId) {
      throw new BadRequestException(
        'Informe um usuário ou departamento de destino',
      );
    }

    // Verificar departamento se fornecido
    if (dto.targetDepartmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.targetDepartmentId,
          tenantId: context.tenantId,
        },
      });
      if (!department) {
        throw new NotFoundException('Departamento não encontrado');
      }
    }

    // Verificar usuário se fornecido
    if (dto.targetUserId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.targetUserId, companyId: context.tenantId },
      });
      if (!user) {
        throw new NotFoundException('Usuário de destino não encontrado');
      }
    }

    // Construir objeto de atualização usando campos diretos (como em claimAttendance)
    const updateData: any = {
      transferredById: context.userId,
      logs: {
        create: {
          action: AttendanceLogAction.TRANSFERRED,
          performedById: context.userId,
          notes: dto.notes,
        },
      },
    };

    if (dto.priority) {
      updateData.priority = dto.priority;
    }

    if (dto.targetDepartmentId) {
      updateData.departmentId = dto.targetDepartmentId;
    }

    if (dto.targetUserId) {
      // Transferir para usuário específico: manter status TRANSFERRED para que o usuário possa vê-lo e assumir
      // O usuário destino verá o atendimento na lista porque está TRANSFERRED e assignedUserId = targetUserId
      updateData.assignedUserId = dto.targetUserId;
      updateData.status = AttendanceStatus.TRANSFERRED;
      // Não alterar startedAt - manter o original ou null se não havia sido iniciado
      updateData.isUrgent = false;

      // Atualizar ou criar conversa quando transferir para um usuário específico
      // Isso garante que a conversa apareça na lista de conversas do usuário destino
      // Usar o departmentId de destino (se fornecido) ou manter o atual do atendimento
      const targetDepartmentId = dto.targetDepartmentId || attendance.departmentId;
      await this.getOrCreateConversationForAttendance(
        context.tenantId,
        attendance.leadId,
        dto.targetUserId,
        targetDepartmentId, // Sincronizar departmentId
      );
    } else {
      // Transferir apenas para departamento (sem usuário específico)
      updateData.assignedUserId = null;
      updateData.status = AttendanceStatus.TRANSFERRED;

      // Quando transfere para departamento (sem usuário específico), atualizar departmentId da conversa
      // A conversa continuará ativa, mas sem atendente atribuído
      const targetDepartmentId = dto.targetDepartmentId || attendance.departmentId;
      await this.updateConversationForTransfer(
        context.tenantId,
        attendance.leadId,
        targetDepartmentId, // Atualizar departmentId na conversa
      );
    }

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: updateData,
      include: this.defaultAttendanceInclude(),
    });

    this.emitAttendanceEvent(
      dto.targetUserId ? 'attendance:update' : 'attendance:transferred',
      updated,
    );
    return this.serializeAttendance(updated);
  }

  async closeAttendance(
    id: string,
    dto: AttendanceCloseDto,
    context: AuthContext,
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId: context.tenantId },
      include: this.defaultAttendanceInclude(),
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    await this.ensureCanClose(attendance, context);

    // Fechar a conversa quando fechar o atendimento
    // A conversa será fechada e não aparecerá mais na lista de conversas
    await this.closeConversationForAttendance(
      context.tenantId,
      attendance.leadId,
    );

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        status: AttendanceStatus.CLOSED,
        endedAt: new Date(),
        closedById: context.userId,
        isUrgent: false,
        logs: {
          create: {
            action: AttendanceLogAction.CLOSED,
            performedById: context.userId,
            notes: dto?.notes,
          },
        },
      },
      include: this.defaultAttendanceInclude(),
    });

    this.emitAttendanceEvent('attendance:update', updated);
    return this.serializeAttendance(updated);
  }

  async updatePriority(
    id: string,
    dto: AttendancePriorityDto,
    context: AuthContext,
  ) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id, tenantId: context.tenantId },
      include: this.defaultAttendanceInclude(),
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    if (!this.isAdmin(context.role) && attendance.assignedUserId !== context.userId) {
      throw new ForbiddenException('Sem permissão para alterar prioridade');
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: { priority: dto.priority },
      include: this.defaultAttendanceInclude(),
    });

    this.emitAttendanceEvent('attendance:update', updated);
    return this.serializeAttendance(updated);
  }

  async handleIncomingMessage(params: {
    tenantId: string;
    leadId: string;
    connectionId?: string | null;
    content?: string | null;
    timestamp?: Date;
  }) {
    const messageTime = params.timestamp ?? new Date();
    const active = await this.findActiveAttendance(
      params.tenantId,
      params.leadId,
    );

    if (!active) {
      // Garantir que o departamento "Recepcionista" existe
      const receptionistDepartment = await this.ensureReceptionistDepartment(
        params.tenantId,
      );

      const created = await this.prisma.attendance.create({
        data: {
          tenantId: params.tenantId,
          leadId: params.leadId,
          connectionId: params.connectionId ?? undefined,
          departmentId: receptionistDepartment.id, // Atrelar ao departamento Recepcionista
          status: AttendanceStatus.OPEN,
          priority: AttendancePriority.NORMAL,
          lastMessage: params.content ?? null,
          lastMessageAt: messageTime,
          logs: {
            create: {
              action: AttendanceLogAction.CREATED,
              performedById: null,
              notes: 'Atendimento criado automaticamente a partir de mensagem recebida',
            },
          },
        },
        include: this.defaultAttendanceInclude(),
      });

      // Sincronizar conversa com o departmentId do atendimento criado
      // A conversa já deve existir (criada no webhook), então apenas atualizar
      const existingConversation = await this.prisma.conversation.findFirst({
        where: {
          tenantId: params.tenantId,
          leadId: params.leadId,
        },
      });

      if (existingConversation) {
        await this.prisma.conversation.update({
          where: { id: existingConversation.id },
          data: {
            departmentId: receptionistDepartment.id, // Sincronizar departmentId
            status: 'ACTIVE', // Garantir que está ativa
          },
        });
      }

      this.emitAttendanceEvent('attendance:new', created);
      return created;
    }

    const lastAgentReply = await this.prisma.message.findFirst({
      where: {
        tenantId: params.tenantId,
        leadId: params.leadId,
        direction: MessageDirection.OUTGOING,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const diffMinutes = lastAgentReply
      ? (messageTime.getTime() - lastAgentReply.createdAt.getTime()) / 1000 / 60
      : Number.MAX_SAFE_INTEGER;

    const isUrgent = diffMinutes >= 5;

    const updated = await this.prisma.attendance.update({
      where: { id: active.id },
      data: {
        lastMessage: params.content ?? active.lastMessage,
        lastMessageAt: messageTime,
        connectionId: params.connectionId ?? active.connectionId ?? undefined,
        isUrgent,
        status:
          active.status === AttendanceStatus.CLOSED
            ? AttendanceStatus.OPEN
            : active.status,
      },
      include: this.defaultAttendanceInclude(),
    });

    // Sincronizar conversa com departmentId e assignedUserId do atendimento atualizado
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId: params.tenantId,
        leadId: params.leadId,
      },
    });

    if (existingConversation) {
      const conversationUpdateData: any = {
        status: 'ACTIVE',
      };

      // Sincronizar departmentId se o atendimento tiver
      if (updated.departmentId) {
        conversationUpdateData.departmentId = updated.departmentId;
      }

      // Sincronizar assignedUserId se o atendimento tiver
      if (updated.assignedUserId) {
        conversationUpdateData.assignedUserId = updated.assignedUserId;
      } else if (updated.status === AttendanceStatus.OPEN || updated.status === AttendanceStatus.TRANSFERRED) {
        // Se o atendimento voltou para OPEN ou TRANSFERRED, remover atribuição da conversa
        conversationUpdateData.assignedUserId = null;
      }

      await this.prisma.conversation.update({
        where: { id: existingConversation.id },
        data: conversationUpdateData,
      });
    }

    this.emitAttendanceEvent('attendance:update', updated);
    return updated;
  }

  async handleOutgoingMessage(params: {
    tenantId: string;
    leadId: string;
    userId?: string | null;
    content?: string | null;
    timestamp?: Date;
  }) {
    const attendance = await this.findActiveAttendance(
      params.tenantId,
      params.leadId,
    );
    if (!attendance) {
      return null;
    }

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        lastMessage: params.content ?? attendance.lastMessage,
        lastMessageAt: params.timestamp ?? new Date(),
        isUrgent: false,
        assignedUserId: attendance.assignedUserId ?? params.userId ?? undefined,
        startedAt: attendance.startedAt ?? new Date(),
        status:
          attendance.status === AttendanceStatus.OPEN ||
          attendance.status === AttendanceStatus.TRANSFERRED
            ? AttendanceStatus.IN_PROGRESS
            : attendance.status,
      },
      include: this.defaultAttendanceInclude(),
    });

    this.emitAttendanceEvent('attendance:update', updated);
    return updated;
  }

  private defaultAttendanceInclude(): Prisma.AttendanceInclude {
    return {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          profilePictureURL: true,
        },
      },
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  private defaultAttendanceSelect() {
    return {
      id: true,
      tenantId: true,
      leadId: true,
      connectionId: true,
      departmentId: true,
      assignedUserId: true,
      status: true,
      priority: true,
      isUrgent: true,
      lastMessage: true,
      lastMessageAt: true,
      startedAt: true,
      endedAt: true,
      createdAt: true,
      updatedAt: true,
      transferredById: true,
      closedById: true,
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          profilePictureURL: true,
        },
      },
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    };
  }

  private async ensureCanView(
    attendance: Prisma.AttendanceGetPayload<{
      include: ReturnType<AttendancesService['defaultAttendanceInclude']>;
    }>,
    context: AuthContext,
  ) {
    if (this.isAdmin(context.role)) {
      return;
    }

    try {
      // Verificar se o usuário pode visualizar o atendimento
      // 1. Seus próprios atendimentos (qualquer status onde assignedUserId = userId)
      // 2. Atendimentos OPEN dos seus departamentos (sem assignedUserId)
      // 3. Atendimentos TRANSFERRED dos seus departamentos
      // 4. Atendimentos TRANSFERRED diretamente para o usuário (assignedUserId = userId e status = TRANSFERRED)
      const isAssignedUser = attendance.assignedUserId === context.userId;
      const isOpen = attendance.status === AttendanceStatus.OPEN && !attendance.assignedUserId;
      
      // Se está transferido, verificar se o usuário está no departamento ou se foi transferido diretamente para ele
      let isInDepartment = false;
      let isTransferredToUser = false;
      
      if (attendance.status === AttendanceStatus.TRANSFERRED) {
        // Verificar se foi transferido diretamente para o usuário
        if (attendance.assignedUserId === context.userId) {
          isTransferredToUser = true;
        }
        
        // Verificar se foi transferido para um departamento do usuário
        if (attendance.departmentId) {
          try {
            isInDepartment = await this.isUserInDepartment(
              context.userId,
              attendance.departmentId,
            );
          } catch (error) {
            console.error('Erro ao verificar departamento:', error);
            isInDepartment = false;
          }
        }
      }

      // Verificar se o atendimento OPEN está em um departamento do usuário
      if (isOpen && attendance.departmentId) {
        try {
          isInDepartment = await this.isUserInDepartment(
            context.userId,
            attendance.departmentId,
          );
        } catch (error) {
          console.error('Erro ao verificar departamento:', error);
          isInDepartment = false;
        }
      }

      const allowed = isAssignedUser || isTransferredToUser || (isOpen && isInDepartment) || (attendance.status === AttendanceStatus.TRANSFERRED && isInDepartment);

      if (!allowed) {
        throw new ForbiddenException('Você não tem acesso a este atendimento');
      }
    } catch (error) {
      // Se for uma exceção de permissão, relançar
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Para outros erros, logar e lançar exceção
      console.error('Erro ao verificar permissões de visualização:', error);
      throw new ForbiddenException('Erro ao verificar permissões de acesso');
    }
  }

  private async ensureCanClaim(
    attendance: Prisma.AttendanceGetPayload<{
      include: ReturnType<AttendancesService['defaultAttendanceInclude']>;
    }>,
    context: AuthContext,
  ) {
    if (this.isAdmin(context.role)) {
      return;
    }

    // Verificar se o usuário pode assumir o atendimento:
    // 1. Atendimento OPEN (disponível sem atendente) - deve estar em um departamento do usuário
    // 2. Atendimento TRANSFERRED para um departamento que o usuário faz parte
    // 3. Atendimento TRANSFERRED diretamente para o usuário (assignedUserId = userId)

    if (attendance.status === AttendanceStatus.OPEN) {
      // Verificar se o atendimento está em um departamento que o usuário faz parte
      if (attendance.departmentId) {
        const isInDepartment = await this.isUserInDepartment(
          context.userId,
          attendance.departmentId,
        );
        if (!isInDepartment) {
          throw new ForbiddenException('Você não pode assumir este atendimento. Ele não está em um dos seus departamentos.');
        }
      }
      return;
    }

    if (attendance.status === AttendanceStatus.TRANSFERRED) {
      // Atendimento transferido: verificar se foi transferido para o usuário ou para um departamento dele
      if (attendance.assignedUserId === context.userId) {
        // Transferido diretamente para o usuário
        return;
      }

      if (attendance.departmentId) {
        // Transferido para um departamento: verificar se o usuário faz parte
        const isInDepartment = await this.isUserInDepartment(
          context.userId,
          attendance.departmentId,
        );
        if (isInDepartment) {
          return;
        }
      }

      throw new ForbiddenException('Você não pode assumir este atendimento. Ele não foi transferido para você ou para um dos seus departamentos.');
    }

    throw new ForbiddenException('Você não pode assumir este atendimento');
  }

  private async ensureCanTransfer(
    attendance: Prisma.AttendanceGetPayload<{
      include: ReturnType<AttendancesService['defaultAttendanceInclude']>;
    }>,
    context: AuthContext,
  ) {
    if (this.isAdmin(context.role)) {
      return;
    }

    if (attendance.assignedUserId !== context.userId) {
      throw new ForbiddenException('Apenas o atendente atual pode transferir');
    }
  }

  private async ensureCanClose(
    attendance: Prisma.AttendanceGetPayload<{
      include: ReturnType<AttendancesService['defaultAttendanceInclude']>;
    }>,
    context: AuthContext,
  ) {
    if (this.isAdmin(context.role)) {
      return;
    }

    if (attendance.assignedUserId !== context.userId) {
      throw new ForbiddenException(
        'Apenas o atendente responsável pode encerrar o atendimento',
      );
    }
  }

  private serializeAttendance(attendance: any) {
    try {
      const createdAtDate =
        attendance.createdAt instanceof Date
          ? attendance.createdAt
          : attendance.createdAt
          ? new Date(attendance.createdAt)
          : new Date();

      const updatedAtDate =
        attendance.updatedAt instanceof Date
          ? attendance.updatedAt
          : attendance.updatedAt
          ? new Date(attendance.updatedAt)
          : new Date();

      const lastMessageAtDate = attendance.lastMessageAt
        ? attendance.lastMessageAt instanceof Date
          ? attendance.lastMessageAt
          : new Date(attendance.lastMessageAt)
        : null;

      const startedAtDate = attendance.startedAt
        ? attendance.startedAt instanceof Date
          ? attendance.startedAt
          : new Date(attendance.startedAt)
        : null;

      const endedAtDate = attendance.endedAt
        ? attendance.endedAt instanceof Date
          ? attendance.endedAt
          : new Date(attendance.endedAt)
        : null;

      // Garantir que assignedUserId e departmentId sejam sempre retornados
      // mesmo que assignedUser ou department sejam null
      return {
        id: attendance.id,
        tenantId: attendance.tenantId,
        lead: attendance.lead || null,
        connectionId: attendance.connectionId || null,
        assignedUserId: attendance.assignedUserId || null, // Sempre incluir o ID
        assignedUser: attendance.assignedUser || null, // Incluir o objeto user completo
        departmentId: attendance.departmentId || null, // Sempre incluir o ID
        department: attendance.department || null, // Incluir o objeto department completo
        status: attendance.status,
        priority: attendance.priority,
        isUrgent: attendance.isUrgent || false,
        lastMessage: attendance.lastMessage || null,
        lastMessageAt: lastMessageAtDate ? lastMessageAtDate.toISOString() : null,
        startedAt: startedAtDate ? startedAtDate.toISOString() : null,
        endedAt: endedAtDate ? endedAtDate.toISOString() : null,
        createdAt: createdAtDate.toISOString(),
        updatedAt: updatedAtDate.toISOString(),
      };
    } catch (error) {
      console.error('Erro ao serializar atendimento:', error, attendance);
      throw error;
    }
  }

  private async findActiveAttendance(tenantId: string, leadId: string) {
    return this.prisma.attendance.findFirst({
      where: {
        tenantId,
        leadId,
        status: { in: [AttendanceStatus.OPEN, AttendanceStatus.IN_PROGRESS, AttendanceStatus.TRANSFERRED] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        leadId: true,
        connectionId: true,
        departmentId: true,
        assignedUserId: true,
        status: true,
        priority: true,
        isUrgent: true,
        lastMessage: true,
        lastMessageAt: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        updatedAt: true,
        transferredById: true,
        closedById: true,
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            profilePictureURL: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  private async findUserDepartmentIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.departmentUser.findMany({
      where: { userId },
      select: { departmentId: true },
    });
    return memberships.map((membership) => membership.departmentId);
  }

  private async isUserInDepartment(
    userId: string,
    departmentId: string,
  ): Promise<boolean> {
    const membership = await this.prisma.departmentUser.findFirst({
      where: { userId, departmentId },
    });
    return Boolean(membership);
  }

  async getUserDepartments(context: AuthContext) {
    // Retorna os departamentos do usuário (útil para seleção quando tem múltiplos departamentos)
    const userDepartmentIds = await this.findUserDepartmentIds(context.userId);

    if (userDepartmentIds.length === 0) {
      return [];
    }

    const departments = await this.prisma.department.findMany({
      where: {
        id: { in: userDepartmentIds },
        tenantId: context.tenantId,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return departments;
  }

  async syncLeadsWithAttendances(context: AuthContext) {
    try {
      this.logger.log(`[syncLeadsWithAttendances] Iniciando sincronização - tenantId: ${context.tenantId}, userId: ${context.userId}`);
      
      // Garantir que o departamento "Recepcionista" existe
      this.logger.log(`[syncLeadsWithAttendances] Garantindo existência do departamento Recepcionista`);
      const receptionistDepartment = await this.ensureReceptionistDepartment(
        context.tenantId,
      );
      this.logger.log(`[syncLeadsWithAttendances] Departamento Recepcionista ID: ${receptionistDepartment.id}`);

      // Buscar todos os leads do tenant
      this.logger.log(`[syncLeadsWithAttendances] Buscando todos os leads do tenant`);
      const leads = await this.prisma.lead.findMany({
        where: { tenantId: context.tenantId },
        select: { id: true },
      });
      this.logger.log(`[syncLeadsWithAttendances] Encontrados ${leads.length} leads`);

      // Buscar todos os atendimentos existentes
      this.logger.log(`[syncLeadsWithAttendances] Buscando atendimentos existentes`);
      const existingAttendances = await this.prisma.attendance.findMany({
        where: { tenantId: context.tenantId },
        select: { leadId: true },
      });
      this.logger.log(`[syncLeadsWithAttendances] Encontrados ${existingAttendances.length} atendimentos existentes`);

      const existingLeadIds = new Set(existingAttendances.map((att) => att.leadId));

      // Identificar leads sem atendimentos
      const leadsWithoutAttendances = leads.filter(
        (lead) => !existingLeadIds.has(lead.id),
      );
      this.logger.log(`[syncLeadsWithAttendances] Leads sem atendimentos: ${leadsWithoutAttendances.length}`);

      // Criar atendimentos para leads sem atendimentos, atrelados ao departamento Recepcionista
      this.logger.log(`[syncLeadsWithAttendances] Criando ${leadsWithoutAttendances.length} novos atendimentos`);
      const createdAttendances = await Promise.all(
        leadsWithoutAttendances.map((lead) =>
          this.prisma.attendance.create({
            data: {
              tenantId: context.tenantId,
              leadId: lead.id,
              departmentId: receptionistDepartment.id, // Atrelar ao departamento Recepcionista
              status: AttendanceStatus.OPEN,
              priority: AttendancePriority.NORMAL,
              logs: {
                create: {
                  action: AttendanceLogAction.CREATED,
                  performedById: null,
                  notes: 'Atendimento criado automaticamente durante sincronização',
                },
              },
            },
            select: {
              id: true,
              tenantId: true,
              leadId: true,
              connectionId: true,
              departmentId: true,
              assignedUserId: true,
              status: true,
              priority: true,
              isUrgent: true,
              lastMessage: true,
              lastMessageAt: true,
              startedAt: true,
              endedAt: true,
              createdAt: true,
              updatedAt: true,
              transferredById: true,
              closedById: true,
              lead: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  profilePictureURL: true,
                },
              },
              assignedUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
        ),
      );
      this.logger.log(`[syncLeadsWithAttendances] Criados ${createdAttendances.length} atendimentos com sucesso`);

      // Emitir eventos para os novos atendimentos
      createdAttendances.forEach((attendance) => {
        this.emitAttendanceEvent('attendance:new', attendance as any);
      });

      const result = {
        totalLeads: leads.length,
        existingAttendances: existingAttendances.length,
        createdAttendances: createdAttendances.length,
      };
      
      this.logger.log(`[syncLeadsWithAttendances] Sucesso - ${JSON.stringify(result)}`);
      return result;
    } catch (error: any) {
      this.logger.error(`[syncLeadsWithAttendances] ERRO ao sincronizar:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        tenantId: context.tenantId,
        userId: context.userId,
        role: context.role,
      });
      throw error;
    }
  }

  private async ensureReceptionistDepartment(tenantId: string) {
    // Buscar ou criar o departamento "Recepcionista"
    // Este departamento serve como fila inicial para novos atendimentos
    let department = await this.prisma.department.findFirst({
      where: {
        tenantId,
        name: 'Recepcionista',
      },
      include: {
        memberships: true,
      },
    });

    if (!department) {
      // Criar o departamento Recepcionista
      department = await this.prisma.department.create({
        data: {
          tenantId,
          name: 'Recepcionista',
          description: 'Departamento responsável pela recepção inicial de atendimentos',
        },
        include: {
          memberships: true,
        },
      });

      // Adicionar todos os administradores do tenant ao departamento Recepcionista
      const admins = await this.prisma.user.findMany({
        where: {
          companyId: tenantId,
          role: { in: ['ADMIN', 'MANAGER'] },
        },
      });

      if (admins.length > 0) {
        await this.prisma.departmentUser.createMany({
          data: admins.map((admin) => ({
            departmentId: department.id,
            userId: admin.id,
            role: DepartmentUserRole.ADMIN,
          })),
          skipDuplicates: true,
        });
      }
    }

    return department;
  }

  private async getOrCreateConversationForAttendance(
    tenantId: string,
    leadId: string,
    userId: string,
    departmentId?: string | null,
  ) {
    // Buscar ou criar conversa para o lead quando assumir atendimento
    // Isso garante que a conversa apareça na lista de conversas do agent
    // Sincronizar tanto assignedUserId quanto departmentId com o atendimento
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        leadId,
      },
    });

    const conversationData: any = {
      status: 'ACTIVE',
      assignedUserId: userId,
    };

    // Sincronizar departmentId se fornecido
    if (departmentId) {
      conversationData.departmentId = departmentId;
    }

    if (conversation) {
      // Se a conversa existe, atualizar para atribuir ao usuário, departamento e ativar
      conversation = await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: conversationData,
      });
    } else {
      // Se não existe, criar nova conversa atribuída ao usuário e departamento
      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          leadId,
          ...conversationData,
        },
      });
    }

    return conversation;
  }

  private async updateConversationForTransfer(
    tenantId: string,
    leadId: string,
    departmentId?: string | null,
  ) {
    // Quando transfere para departamento (sem usuário específico),
    // manter a conversa ativa mas sem atendente atribuído
    // Atualizar o departmentId para sincronizar com o atendimento
    // Admin poderá ver, mas agentes não verão até ser atribuída
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        leadId,
      },
    });

    if (conversation) {
      const updateData: any = {
        status: 'ACTIVE',
        assignedUserId: null, // Remover atribuição quando transferir para departamento
      };

      // Atualizar departmentId se fornecido
      if (departmentId) {
        updateData.departmentId = departmentId;
      }

      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: updateData,
      });
    }
    // Se não existe conversa, não precisa criar (será criada quando alguém assumir)
  }

  private async closeConversationForAttendance(
    tenantId: string,
    leadId: string,
  ) {
    // Fechar a conversa quando fechar o atendimento
    // A conversa não aparecerá mais na lista de conversas
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        tenantId,
        leadId,
      },
    });

    if (conversation) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'CLOSED',
          // Manter o assignedUserId para histórico
        },
      });
    }
  }

  private buildAbsoluteMediaUrl(url?: string | null): string | null {
    try {
      if (!url) {
        return null;
      }
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      
      let mediaBase: string | undefined;
      let appBase: string | undefined;
      let publicBase: string | undefined;
      
      try {
        mediaBase = this.configService.get<string>('MEDIA_BASE_URL');
      } catch (error) {
        // Ignorar erro ao buscar variável
      }
      
      try {
        appBase = this.configService.get<string>('APP_URL');
      } catch (error) {
        // Ignorar erro ao buscar variável
      }
      
      try {
        publicBase = this.configService.get<string>('PUBLIC_BACKEND_URL');
      } catch (error) {
        // Ignorar erro ao buscar variável
      }

      const baseUrl =
        (mediaBase && mediaBase.trim().length > 0 ? mediaBase : null) ??
        (appBase && appBase.trim().length > 0 ? appBase : null) ??
        (publicBase && publicBase.trim().length > 0 ? publicBase : null) ??
        'http://localhost:3000';

      return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
    } catch (error) {
      console.error('Erro ao construir URL absoluta de mídia:', error, url);
      // Retornar a URL original em caso de erro
      return url || null;
    }
  }

  private emitAttendanceEvent(
    event: 'attendance:new' | 'attendance:update' | 'attendance:transferred',
    attendance: Prisma.AttendanceGetPayload<{
      include: ReturnType<AttendancesService['defaultAttendanceInclude']>;
    }>,
  ) {
    if (!this.gateway.server) {
      return;
    }

    const payload = this.serializeAttendance(attendance);
    this.gateway.server
      .to(`tenant:${attendance.tenantId}`)
      .emit(event, payload);
  }
}

