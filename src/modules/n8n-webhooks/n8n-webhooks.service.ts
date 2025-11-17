import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AttendancesService } from '../attendances/attendances.service';
import { MessagesService } from '../messages/messages.service';
import { UpdateLeadNameDto } from './dto/update-lead-name.dto';
import { UpdateLeadTagsDto } from './dto/update-lead-tags.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import {
  TransferAttendanceDepartmentDto,
  TransferAttendanceUserDto,
} from './dto/transfer-attendance.dto';
import { CloseAttendanceDto } from './dto/close-attendance.dto';
import { UpdateAttendancePriorityDto } from './dto/update-attendance-priority.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class N8nWebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendancesService: AttendancesService,
    private readonly messagesService: MessagesService,
  ) {}

  // ============= LEADS =============

  async updateLeadName(phone: string, dto: UpdateLeadNameDto, tenantId: string) {
    const lead = await this.findLeadByPhone(phone, tenantId);

    return this.prisma.lead.update({
      where: { id: lead.id },
      data: { name: dto.name },
    });
  }

  async updateLeadTags(phone: string, dto: UpdateLeadTagsDto, tenantId: string) {
    const lead = await this.findLeadByPhone(phone, tenantId);

    let newTags: string[];

    switch (dto.action) {
      case 'add':
        // Adicionar tags sem duplicatas
        newTags = Array.from(new Set([...lead.tags, ...dto.tags]));
        break;
      case 'remove':
        // Remover tags especificadas
        newTags = lead.tags.filter((tag) => !dto.tags.includes(tag));
        break;
      case 'replace':
        // Substituir todas as tags
        newTags = dto.tags;
        break;
      default:
        throw new BadRequestException('Ação inválida para tags');
    }

    return this.prisma.lead.update({
      where: { id: lead.id },
      data: { tags: newTags },
    });
  }

  async updateLeadStatus(
    phone: string,
    dto: UpdateLeadStatusDto,
    tenantId: string,
  ) {
    const lead = await this.findLeadByPhone(phone, tenantId);

    return this.prisma.lead.update({
      where: { id: lead.id },
      data: { status: dto.status },
    });
  }

  async getLeadByPhone(phone: string, tenantId: string) {
    return this.findLeadByPhone(phone, tenantId);
  }

  // ============= ATTENDANCES =============

  async transferAttendanceToDepartment(
    leadId: string,
    dto: TransferAttendanceDepartmentDto,
    tenantId: string,
  ) {
    const attendance = await this.findActiveAttendance(leadId, tenantId);

    const context = {
      userId: 'n8n-system', // Sistema automático
      tenantId,
      role: UserRole.ADMIN, // Permissões de admin para automação
    };

    return this.attendancesService.transferAttendance(
      attendance.id,
      {
        targetDepartmentId: dto.departmentId,
        notes: dto.notes,
        priority: dto.priority,
      },
      context,
    );
  }

  async transferAttendanceToUser(
    leadId: string,
    dto: TransferAttendanceUserDto,
    tenantId: string,
  ) {
    const attendance = await this.findActiveAttendance(leadId, tenantId);

    const context = {
      userId: 'n8n-system',
      tenantId,
      role: UserRole.ADMIN,
    };

    return this.attendancesService.transferAttendance(
      attendance.id,
      {
        targetUserId: dto.userId,
        targetDepartmentId: dto.departmentId,
        notes: dto.notes,
        priority: dto.priority,
      },
      context,
    );
  }

  async closeAttendance(
    leadId: string,
    dto: CloseAttendanceDto,
    tenantId: string,
  ) {
    const attendance = await this.findActiveAttendance(leadId, tenantId);

    const context = {
      userId: 'n8n-system',
      tenantId,
      role: UserRole.ADMIN,
    };

    return this.attendancesService.closeAttendance(
      attendance.id,
      { notes: dto.notes },
      context,
    );
  }

  async updateAttendancePriority(
    leadId: string,
    dto: UpdateAttendancePriorityDto,
    tenantId: string,
  ) {
    const attendance = await this.findActiveAttendance(leadId, tenantId);

    const context = {
      userId: 'n8n-system',
      tenantId,
      role: UserRole.ADMIN,
    };

    return this.attendancesService.updatePriority(
      attendance.id,
      { priority: dto.priority },
      context,
    );
  }

  // ============= MESSAGES =============

  async sendMessage(dto: SendMessageDto, tenantId: string) {
    // Buscar ou criar lead
    let lead = await this.prisma.lead.findFirst({
      where: {
        phone: dto.phone,
        tenantId,
      },
    });

    if (!lead) {
      // Criar lead se não existir
      lead = await this.prisma.lead.create({
        data: {
          name: dto.phone, // Nome temporário = telefone
          phone: dto.phone,
          tenantId,
          tags: [],
        },
      });
    }

    // Buscar ou criar conversa
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        leadId: lead.id,
        tenantId,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          leadId: lead.id,
          tenantId,
        },
      });
    }

    // Buscar connection (usar a fornecida ou primeira ativa)
    let connectionId = dto.connectionId;
    if (!connectionId) {
      const activeConnection = await this.prisma.connection.findFirst({
        where: {
          tenantId,
          status: 'ACTIVE',
        },
      });

      if (!activeConnection) {
        throw new BadRequestException('Nenhuma conexão ativa encontrada');
      }

      connectionId = activeConnection.id;
    }

    // Enviar mensagem
    const context = {
      userId: 'n8n-system',
      tenantId,
      role: UserRole.ADMIN,
    };

    return this.messagesService.create(
      {
        conversationId: conversation.id,
        senderType: 'USER',
        contentType: dto.contentType || 'TEXT',
        contentText: dto.message,
        contentUrl: dto.mediaUrl,
      },
      context,
    );
  }

  async getMessagesByLeadId(leadId: string, tenantId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    return this.prisma.message.findMany({
      where: {
        leadId: lead.id,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limitar a 50 mensagens mais recentes
    });
  }

  // ============= HELPERS =============

  private async findLeadByPhone(phone: string, tenantId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        phone,
        tenantId,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead não encontrado');
    }

    return lead;
  }

  private async findActiveAttendance(leadId: string, tenantId: string) {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        leadId,
        tenantId,
        status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!attendance) {
      throw new NotFoundException('Atendimento ativo não encontrado');
    }

    return attendance;
  }
}

