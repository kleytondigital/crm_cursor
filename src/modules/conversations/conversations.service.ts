import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findAll(tenantId: string, userId?: string, userRole?: UserRole) {
    try {
      this.logger.log(`[findAll] Iniciando busca de conversas - tenantId: ${tenantId}, userId: ${userId}, userRole: ${userRole}`);
      
      // Filtrar conversas:
      // - Admin/MANAGER: Todas as conversas em andamento (ACTIVE)
      //   - Com ou sem atendente atribuído (permite que admin veja e interaja com qualquer conversa)
      // - Agent/USER: Apenas conversas de leads que têm atendimentos atribuídos a eles
      //   - Baseado nos atendimentos (assignedUserId = userId) do agente
      // - Conversas com status CLOSED não aparecem aqui (aparecem apenas em atendimentos)
      const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;

      this.logger.log(`[findAll] isAdmin: ${isAdmin}`);

      const where: any = {
        tenantId: tenantId,
        status: 'ACTIVE', // Apenas conversas ativas
      };

      // Para agents (USER), filtrar apenas conversas de leads que têm atendimentos atribuídos a eles
      // Para admins e managers, retornar todas as conversas ativas
      if (!isAdmin && userId) {
        this.logger.log(`[findAll] Filtrando conversas para agente - userId: ${userId}`);
        
        // Buscar TODOS os atendimentos do agente (qualquer status: OPEN, IN_PROGRESS, TRANSFERRED, CLOSED)
        // Isso garante que o agente veja todas as conversas de leads que já foram atribuídos a ele
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

        // Filtrar conversas pelos IDs dos leads que têm atendimentos atribuídos ao agente
        where.leadId = { in: leadIds };
      } else {
        this.logger.log(`[findAll] Admin/Manager - retornando todas as conversas ativas do tenant ${tenantId}`);
      }
      // Admin: vê todas as conversas ativas (com ou sem atendente) - não aplica filtro adicional

      this.logger.log(`[findAll] Executando query Prisma com where: ${JSON.stringify(where)}`);

      const conversations = await this.prisma.conversation.findMany({
        where,
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
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              id: true,
              contentText: true,
              contentType: true,
              createdAt: true,
              senderType: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      this.logger.log(`[findAll] Retornando ${conversations.length} conversas`);

      // Mapear para incluir última mensagem
      const result = conversations.map((conv) => {
        const { messages, ...rest } = conv;
        return {
          ...rest,
          lastMessage: messages[0] || null,
        };
      });

      this.logger.log(`[findAll] Sucesso - retornando ${result.length} conversas`);
      return result;
    } catch (error: any) {
      this.logger.error(`[findAll] ERRO ao buscar conversas:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        meta: error.meta,
        tenantId,
        userId,
        userRole,
      });
      throw error;
    }
  }

  async findOne(id: string, tenantId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
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

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    return conversation;
  }

  async reopenConversation(id: string, tenantId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: id,
        tenantId: tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    if (conversation.status !== 'CLOSED') {
      throw new Error('A conversa não está fechada');
    }

    return this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: 'ACTIVE',
        assignedUserId: null, // Volta para disponível sem atendente
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
  }

  async updateBotLock(
    id: string,
    isBotAttending: boolean,
    tenantId: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    // Atualizar no CRM
    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { isBotAttending },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    // Chamar webhook n8n para bloquear/desbloquear no Redis
    try {
      const webhookUrl = this.configService.get<string>('N8N_WEBHOOK_BOT_LOCK');
      if (webhookUrl) {
        await axios.post(webhookUrl, {
          conversationId: id,
          isBotAttending,
          tenantId,
          leadId: conversation.leadId,
        });
        this.logger.log(
          `Bot lock atualizado via webhook n8n - conversationId: ${id}, isBotAttending: ${isBotAttending}`,
        );
      } else {
        this.logger.warn('N8N_WEBHOOK_BOT_LOCK não configurado');
      }
    } catch (error) {
      this.logger.error(
        `Erro ao chamar webhook n8n para bot lock: ${error.message}`,
      );
      // Não falhar a operação se o webhook falhar
    }

    return updated;
  }
}

