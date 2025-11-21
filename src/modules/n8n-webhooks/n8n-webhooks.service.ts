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
import { UpdateMessageTranscriptionDto } from './dto/update-message-transcription.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class N8nWebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendancesService: AttendancesService,
    private readonly messagesService: MessagesService,
  ) {}

  // ============= LEADS =============

  async updateLeadName(phone: string, dto: UpdateLeadNameDto, tenantId: string | null) {
    const cleanPhone = this.cleanPhoneNumber(phone);
    const lead = await this.findLeadByPhone(cleanPhone, tenantId);

    return this.prisma.lead.update({
      where: { id: lead.id },
      data: { name: dto.name },
    });
  }

  async updateLeadTags(phone: string, dto: UpdateLeadTagsDto, tenantId: string | null) {
    const cleanPhone = this.cleanPhoneNumber(phone);
    const lead = await this.findLeadByPhone(cleanPhone, tenantId);

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
    tenantId: string | null,
  ) {
    try {
      // Limpar e validar telefone
      const cleanPhone = this.cleanPhoneNumber(phone);
      
      if (!cleanPhone || cleanPhone.length < 10) {
        throw new BadRequestException(
          `Telefone inválido: ${phone}. O telefone deve ter pelo menos 10 dígitos.`,
        );
      }

      // Buscar lead (com ou sem tenantId, dependendo se a API Key é global)
      const lead = await this.findLeadByPhone(cleanPhone, tenantId);

      // Atualizar status do lead
      const updatedLead = await this.prisma.lead.update({
        where: { id: lead.id },
        data: { status: dto.status },
      });

      return updatedLead;
    } catch (error: any) {
      // Log detalhado do erro para debug
      console.error('[updateLeadStatus] Erro ao atualizar status do lead:', {
        phone,
        cleanPhone: this.cleanPhoneNumber(phone),
        tenantId: tenantId || 'global',
        status: dto.status,
        error: error.message,
        stack: error.stack,
      });

      // Re-throw o erro para que seja tratado pelo filtro de exceções
      throw error;
    }
  }

  async getLeadByPhone(phone: string, tenantId: string | null) {
    const cleanPhone = this.cleanPhoneNumber(phone);
    return this.findLeadByPhone(cleanPhone, tenantId);
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
    return this.messagesService.create(
      {
        conversationId: conversation.id,
        senderType: 'USER',
        contentType: dto.contentType || 'TEXT',
        contentText: dto.message,
        contentUrl: dto.mediaUrl,
      },
      tenantId,
      'n8n-system', // userId
      'ADMIN', // userRole
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

  async updateMessageTranscription(
    messageId: string,
    dto: UpdateMessageTranscriptionDto,
    tenantId: string | null,
  ) {
    // Se tenantId é null (chave global), buscar mensagem sem filtro de tenant
    const where: any = { id: messageId };
    if (tenantId !== null) {
      where.tenantId = tenantId;
    }

    const message = await this.prisma.message.findFirst({
      where,
    });

    if (!message) {
      throw new NotFoundException(
        `Mensagem não encontrada. messageId=${messageId} tenantId=${tenantId || 'global'}`,
      );
    }

    return this.prisma.message.update({
      where: { id: message.id },
      data: { transcriptionText: dto.transcriptionText },
    });
  }

  // ============= HELPERS =============

  /**
   * Limpa o número de telefone removendo caracteres especiais e sufixos do WhatsApp
   */
  private cleanPhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    // Remover sufixo @c.us se presente (formato do WhatsApp)
    // Exemplo: "5562995473360@c.us" -> "5562995473360"
    let cleanPhone = phone.replace(/@c\.us$/i, '').trim();

    // Remover espaços e caracteres especiais (mantém apenas números)
    cleanPhone = cleanPhone.replace(/\D/g, '');

    return cleanPhone;
  }

  private async findLeadByPhone(phone: string, tenantId: string | null) {
    // Limpar telefone
    const cleanPhone = this.cleanPhoneNumber(phone);

    if (!cleanPhone || cleanPhone.length < 10) {
      throw new BadRequestException(
        `Telefone inválido: ${phone}. O telefone deve ter pelo menos 10 dígitos após a limpeza.`,
      );
    }

    // Construir where clause (com ou sem tenantId, dependendo se a API Key é global)
    const where: any = {
      phone: cleanPhone,
    };

    // Se tenantId for fornecido (API Key não global), filtrar por tenant
    // Se tenantId for null (API Key global), buscar em todas as empresas
    if (tenantId) {
      where.tenantId = tenantId;
    }

    try {
      // Buscar lead no banco
      const lead = await this.prisma.lead.findFirst({
        where,
      });

      if (!lead) {
        const tenantMessage = tenantId
          ? ` para a empresa (tenantId: ${tenantId})`
          : ' em nenhuma empresa (API Key global)';
        throw new NotFoundException(
          `Lead não encontrado para o telefone: ${cleanPhone} (original: ${phone})${tenantMessage}. Verifique se o telefone está correto e se o lead existe.`,
        );
      }

      return lead;
    } catch (error: any) {
      // Se não for NotFoundException, pode ser erro de banco de dados
      if (error instanceof NotFoundException) {
        throw error;
      }

      // Log detalhado do erro para debug
      console.error('[findLeadByPhone] Erro ao buscar lead:', {
        phone,
        cleanPhone,
        tenantId: tenantId || 'global',
        where,
        error: error.message,
        stack: error.stack,
      });

      // Re-throw como BadRequestException para dar mais contexto
      throw new BadRequestException(
        `Erro ao buscar lead: ${error.message || 'Erro desconhecido'}`,
      );
    }
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

