import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateAIAgentDto } from './dto/create-ai-agent.dto';
import { UpdateAIAgentDto } from './dto/update-ai-agent.dto';
import { UserRole } from '@prisma/client';

interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

@Injectable()
export class AIAgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAIAgentDto, context: AuthContext) {
    // Verificar se o departamento existe e pertence ao tenant
    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.departmentId,
          tenantId: context.tenantId,
        },
      });

      if (!department) {
        throw new NotFoundException('Departamento não encontrado');
      }
    }

    return this.prisma.aIAgent.create({
      data: {
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        userPrompt: dto.userPrompt,
        model: dto.model || 'gpt-4',
        temperature: dto.temperature ?? 0.7,
        maxTokens: dto.maxTokens || 1000,
        tenantId: context.tenantId,
        departmentId: dto.departmentId,
      },
    });
  }

  async findAll(context: AuthContext, departmentId?: string) {
    const where: any = {
      tenantId: context.tenantId,
      isActive: true,
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    return this.prisma.aIAgent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findOne(id: string, context: AuthContext) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: {
        id,
        tenantId: context.tenantId,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException('Agente de IA não encontrado');
    }

    return agent;
  }

  async update(id: string, dto: UpdateAIAgentDto, context: AuthContext) {
    await this.findOne(id, context);

    // Verificar departamento se fornecido
    if (dto.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: {
          id: dto.departmentId,
          tenantId: context.tenantId,
        },
      });

      if (!department) {
        throw new NotFoundException('Departamento não encontrado');
      }
    }

    return this.prisma.aIAgent.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        userPrompt: dto.userPrompt,
        model: dto.model,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        departmentId: dto.departmentId,
      },
    });
  }

  async remove(id: string, context: AuthContext) {
    await this.findOne(id, context);

    // Desativar ao invés de remover
    return this.prisma.aIAgent.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Método para processar mensagens com o agente (placeholder para integração futura com OpenAI)
  async processMessage(
    agentId: string,
    message: string,
    context: AuthContext,
    additionalContext?: Record<string, any>,
  ): Promise<string> {
    const agent = await this.findOne(agentId, context);

    // TODO: Integrar com OpenAI ou outro provedor de IA
    // Por enquanto, retornar uma resposta simulada
    return `Resposta simulada do agente ${agent.name} para: ${message}`;
  }
}

