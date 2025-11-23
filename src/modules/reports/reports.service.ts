import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ReportsFilterDto } from './dto/reports-filter.dto';
import {
  ReportsOverviewResponseDto,
  ReportsLeadsResponseDto,
  ReportsConversionResponseDto,
  ReportsAttendanceResponseDto,
  ReportsCampaignsResponseDto,
  ReportsJourneyResponseDto,
  ReportsMessagesResponseDto,
  ReportsScheduledResponseDto,
} from './dto/reports-response.dto';
import { LeadStatus } from '@prisma/client';
import { format, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obter métricas gerais
   */
  async getOverview(
    tenantId: string,
    filters: ReportsFilterDto,
  ): Promise<ReportsOverviewResponseDto> {
    const cacheKey = `overview:${tenantId}:${JSON.stringify(filters)}`;
    const cached = this.getCached<ReportsOverviewResponseDto>(cacheKey);
    if (cached) return cached;

    const where = this.buildWhereClause(tenantId, filters);

    // Total de leads
    const totalLeads = await this.prisma.lead.count({ where });

    // Leads convertidos (status CONCLUIDO)
    const totalConverted = await this.prisma.lead.count({
      where: { ...where, status: LeadStatus.CONCLUIDO },
    });

    // Taxa de conversão
    const conversionRate = totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0;

    // Total de atendimentos
    const totalAttendances = await this.prisma.attendance.count({
      where: {
        tenantId,
        ...(filters.userId && { assignedUserId: filters.userId }),
        ...(filters.startDate || filters.endDate
          ? {
              createdAt: {
                ...(filters.startDate && { gte: new Date(filters.startDate) }),
                ...(filters.endDate && { lte: new Date(filters.endDate) }),
              },
            }
          : {}),
      },
    });

    // Total de mensagens
    const totalMessages = await this.prisma.message.count({
      where: {
        tenantId,
        direction: 'OUTGOING',
        ...(filters.startDate || filters.endDate
          ? {
              createdAt: {
                ...(filters.startDate && { gte: new Date(filters.startDate) }),
                ...(filters.endDate && { lte: new Date(filters.endDate) }),
              },
            }
          : {}),
      },
    });

    // Tempo médio de primeira resposta
    const averageResponseTime = await this.calculateAverageResponseTime(tenantId, filters);

    // Tempo médio de atendimento
    const averageAttendanceTime = await this.calculateAverageAttendanceTime(tenantId, filters);

    const result: ReportsOverviewResponseDto = {
      totalLeads,
      totalConverted,
      conversionRate: Number(conversionRate.toFixed(2)),
      totalAttendances,
      totalMessages,
      averageResponseTime,
      averageAttendanceTime,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Obter dados de leads
   */
  async getLeads(
    tenantId: string,
    filters: ReportsFilterDto,
    period: 'day' | 'week' | 'month' = 'day',
  ): Promise<ReportsLeadsResponseDto> {
    const cacheKey = `leads:${tenantId}:${period}:${JSON.stringify(filters)}`;
    const cached = this.getCached<ReportsLeadsResponseDto>(cacheKey);
    if (cached) return cached;

    const where = this.buildWhereClause(tenantId, filters);

    const total = await this.prisma.lead.count({ where });

    // Leads por período
    const byPeriod = await this.groupLeadsByPeriod(tenantId, filters, period);

    // Distribuição por status
    const byStatus = await this.groupLeadsByStatus(tenantId, filters);

    // Distribuição por origem
    const byOrigin = await this.groupLeadsByOrigin(tenantId, filters);

    const result: ReportsLeadsResponseDto = {
      total,
      byPeriod,
      byStatus,
      byOrigin,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Obter dados de conversão
   */
  async getConversion(
    tenantId: string,
    filters: ReportsFilterDto,
  ): Promise<ReportsConversionResponseDto> {
    const cacheKey = `conversion:${tenantId}:${JSON.stringify(filters)}`;
    const cached = this.getCached<ReportsConversionResponseDto>(cacheKey);
    if (cached) return cached;

    const where = this.buildWhereClause(tenantId, filters);

    const totalLeads = await this.prisma.lead.count({ where });
    const convertedLeads = await this.prisma.lead.count({
      where: { ...where, status: LeadStatus.CONCLUIDO },
    });

    const overallRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Conversão por atendente
    const byAttendant = await this.calculateConversionByAttendant(tenantId, filters);

    const result: ReportsConversionResponseDto = {
      overallRate: Number(overallRate.toFixed(2)),
      byAttendant,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Obter métricas de atendimento
   */
  async getAttendance(
    tenantId: string,
    filters: ReportsFilterDto,
  ): Promise<ReportsAttendanceResponseDto> {
    const cacheKey = `attendance:${tenantId}:${JSON.stringify(filters)}`;
    const cached = this.getCached<ReportsAttendanceResponseDto>(cacheKey);
    if (cached) return cached;

    const averageAttendanceTime = await this.calculateAverageAttendanceTime(tenantId, filters);
    const averageResponseTime = await this.calculateAverageResponseTime(tenantId, filters);

    // Métricas por atendente
    const byAttendant = await this.calculateAttendanceMetricsByAttendant(tenantId, filters);

    const result: ReportsAttendanceResponseDto = {
      averageAttendanceTime,
      averageResponseTime,
      byAttendant,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Obter métricas de campanhas
   */
  async getCampaigns(
    tenantId: string,
    filters: ReportsFilterDto,
  ): Promise<ReportsCampaignsResponseDto> {
    const cacheKey = `campaigns:${tenantId}:${JSON.stringify(filters)}`;
    const cached = this.getCached<ReportsCampaignsResponseDto>(cacheKey);
    if (cached) return cached;

    const dateFilter = this.buildDateFilter(filters);

    // Buscar campanhas com mensagens agendadas
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        tenantId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      include: {
        scheduledMessages: {
          where: {
            ...(dateFilter && { scheduledFor: dateFilter }),
          },
          include: {
            lead: true,
          },
        },
      },
    });

    const campaignMetrics = campaigns.map((campaign) => {
      const leads = campaign.scheduledMessages
        .map((sm) => sm.lead)
        .filter((lead): lead is NonNullable<typeof lead> => lead !== null);
      
      const totalLeads = leads.length;
      const convertedLeads = leads.filter((l) => l.status === LeadStatus.CONCLUIDO).length;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      // Leads diários por campanha
      const dailyLeads = this.groupByDate(
        leads.map((l) => l.createdAt),
        'day',
      ).map(({ date, count }) => ({ date, count }));

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        totalLeads,
        convertedLeads,
        conversionRate: Number(conversionRate.toFixed(2)),
        dailyLeads,
      };
    });

    // Comparativo entre campanhas
    const comparison = campaignMetrics.map((cm) => ({
      campaign: cm.campaignName,
      leads: cm.totalLeads,
      converted: cm.convertedLeads,
      rate: cm.conversionRate,
    }));

    const result: ReportsCampaignsResponseDto = {
      campaigns: campaignMetrics,
      comparison,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Obter jornada do lead
   */
  async getJourney(
    tenantId: string,
    filters: ReportsFilterDto,
  ): Promise<ReportsJourneyResponseDto> {
    const cacheKey = `journey:${tenantId}:${JSON.stringify(filters)}`;
    const cached = this.getCached<ReportsJourneyResponseDto>(cacheKey);
    if (cached) return cached;

    const where = this.buildWhereClause(tenantId, filters);

    const leads = await this.prisma.lead.findMany({
      where,
      select: {
        id: true,
        origin: true,
        status: true,
        attendances: {
          select: {
            id: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Mapear jornada: Origem → Atendimento → Conversão
    const steps: Array<{ step: string; count: number; percentage: number }> = [];
    const flow: Array<{ from: string; to: string; count: number }> = [];

    let originCount = 0;
    let attendanceCount = 0;
    let convertedCount = 0;

    leads.forEach((lead) => {
      const origin = lead.origin || 'Orgânico';
      const hasAttendance = lead.attendances.length > 0;
      const isConverted = lead.status === LeadStatus.CONCLUIDO;

      if (origin) originCount++;
      if (hasAttendance) attendanceCount++;
      if (isConverted) convertedCount++;

      // Fluxo: Origem → Atendimento
      if (origin && hasAttendance) {
        const flowItem = flow.find((f) => f.from === origin && f.to === 'Atendimento');
        if (flowItem) {
          flowItem.count++;
        } else {
          flow.push({ from: origin, to: 'Atendimento', count: 1 });
        }
      }

      // Fluxo: Atendimento → Conversão
      if (hasAttendance && isConverted) {
        const flowItem = flow.find((f) => f.from === 'Atendimento' && f.to === 'Conversão');
        if (flowItem) {
          flowItem.count++;
        } else {
          flow.push({ from: 'Atendimento', to: 'Conversão', count: 1 });
        }
      }
    });

    const total = leads.length;
    steps.push(
      { step: 'Origem', count: originCount, percentage: total > 0 ? (originCount / total) * 100 : 0 },
      { step: 'Atendimento', count: attendanceCount, percentage: total > 0 ? (attendanceCount / total) * 100 : 0 },
      { step: 'Conversão', count: convertedCount, percentage: total > 0 ? (convertedCount / total) * 100 : 0 },
    );

    const result: ReportsJourneyResponseDto = {
      steps: steps.map((s) => ({ ...s, percentage: Number(s.percentage.toFixed(2)) })),
      flow,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Obter dados de mensagens
   */
  async getMessages(
    tenantId: string,
    filters: ReportsFilterDto,
  ): Promise<ReportsMessagesResponseDto> {
    const cacheKey = `messages:${tenantId}:${JSON.stringify(filters)}`;
    const cached = this.getCached<ReportsMessagesResponseDto>(cacheKey);
    if (cached) return cached;

    const dateFilter = this.buildDateFilter(filters);

    // Total de mensagens enviadas
    const total = await this.prisma.message.count({
      where: {
        tenantId,
        direction: 'OUTGOING',
        ...(dateFilter && { createdAt: dateFilter }),
      },
    });

    // Mensagens manuais (não relacionadas a ScheduledMessage)
    const manual = await this.prisma.message.count({
      where: {
        tenantId,
        direction: 'OUTGOING',
        ...(dateFilter && { createdAt: dateFilter }),
        // Mensagens que não têm scheduledMessage relacionado
        // (precisamos verificar via join ou subquery)
      },
    });

    // Mensagens automáticas (via ScheduledMessage)
    const scheduledMessages = await this.prisma.scheduledMessage.findMany({
      where: {
        tenantId,
        status: 'SENT',
        ...(dateFilter && { sentAt: dateFilter }),
      },
    });

    const automatic = scheduledMessages.length;

    // Mensagens por período
    const byPeriod = await this.groupMessagesByPeriod(tenantId, filters);

    const result: ReportsMessagesResponseDto = {
      total,
      manual: total - automatic, // Aproximação
      automatic,
      byPeriod,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Obter métricas de agendamentos
   */
  async getScheduled(
    tenantId: string,
    filters: ReportsFilterDto,
  ): Promise<ReportsScheduledResponseDto> {
    const cacheKey = `scheduled:${tenantId}:${JSON.stringify(filters)}`;
    const cached = this.getCached<ReportsScheduledResponseDto>(cacheKey);
    if (cached) return cached;

    const dateFilter = this.buildDateFilter(filters);

    const scheduledMessages = await this.prisma.scheduledMessage.findMany({
      where: {
        tenantId,
        ...(dateFilter && { scheduledFor: dateFilter }),
      },
    });

    const total = scheduledMessages.length;
    const executed = scheduledMessages.filter((sm) => sm.status === 'SENT').length;
    const failed = scheduledMessages.filter((sm) => sm.status === 'FAILED').length;
    const pending = scheduledMessages.filter((sm) => sm.status === 'PENDING').length;

    // Agendamentos por período
    const byPeriod = this.groupByDate(
      scheduledMessages
        .filter((sm) => sm.sentAt || sm.scheduledFor)
        .map((sm) => sm.sentAt || sm.scheduledFor),
      'day',
    ).map(({ date, count }) => ({
      date,
      executed: scheduledMessages.filter(
        (sm) =>
          sm.status === 'SENT' &&
          format(new Date(sm.sentAt || sm.scheduledFor), 'yyyy-MM-dd') === date,
      ).length,
      failed: scheduledMessages.filter(
        (sm) =>
          sm.status === 'FAILED' &&
          format(new Date(sm.sentAt || sm.scheduledFor), 'yyyy-MM-dd') === date,
      ).length,
    }));

    // Erros de envio
    const errors = scheduledMessages
      .filter((sm) => sm.status === 'FAILED' && sm.errorMessage)
      .map((sm) => ({
        date: format(new Date(sm.sentAt || sm.scheduledFor), 'yyyy-MM-dd'),
        count: 1,
        messages: [sm.errorMessage || 'Erro desconhecido'],
      }))
      .reduce((acc, error) => {
        const existing = acc.find((e) => e.date === error.date);
        if (existing) {
          existing.count++;
          existing.messages.push(...error.messages);
        } else {
          acc.push(error);
        }
        return acc;
      }, [] as Array<{ date: string; count: number; messages: string[] }>);

    const result: ReportsScheduledResponseDto = {
      scheduled: {
        total,
        executed,
        failed,
        pending,
        byPeriod,
      },
      errors,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  // Métodos privados auxiliares

  private buildWhereClause(tenantId: string, filters: ReportsFilterDto) {
    const where: any = { tenantId };

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = startOfDay(new Date(filters.startDate));
      }
      if (filters.endDate) {
        where.createdAt.lte = endOfDay(new Date(filters.endDate));
      }
    }

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.origin) {
      where.origin = filters.origin;
    }

    if (filters.converted !== undefined) {
      where.status = filters.converted ? LeadStatus.CONCLUIDO : { not: LeadStatus.CONCLUIDO };
    }

    return where;
  }

  private buildDateFilter(filters: ReportsFilterDto) {
    if (!filters.startDate && !filters.endDate) return undefined;

    return {
      ...(filters.startDate && { gte: startOfDay(new Date(filters.startDate)) }),
      ...(filters.endDate && { lte: endOfDay(new Date(filters.endDate)) }),
    };
  }

  private async groupLeadsByPeriod(
    tenantId: string,
    filters: ReportsFilterDto,
    period: 'day' | 'week' | 'month',
  ) {
    const where = this.buildWhereClause(tenantId, filters);
    const leads = await this.prisma.lead.findMany({
      where,
      select: { createdAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = this.groupByDate(
      leads.map((l) => l.createdAt),
      period,
    );

    return grouped.map(({ date, items }) => ({
      date,
      count: items.length,
      converted: items.filter((_, idx) => {
        const lead = leads.find((l) => {
          const leadDate = format(l.createdAt, period === 'day' ? 'yyyy-MM-dd' : period === 'week' ? 'yyyy-ww' : 'yyyy-MM');
          return leadDate === date;
        });
        return lead?.status === LeadStatus.CONCLUIDO;
      }).length,
    }));
  }

  private async groupLeadsByStatus(tenantId: string, filters: ReportsFilterDto) {
    const where = this.buildWhereClause(tenantId, filters);
    const total = await this.prisma.lead.count({ where });

    const statusCounts = await this.prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    return statusCounts.map(({ status, _count }) => ({
      status,
      count: _count.status,
      percentage: total > 0 ? Number((( _count.status / total) * 100).toFixed(2)) : 0,
    }));
  }

  private async groupLeadsByOrigin(tenantId: string, filters: ReportsFilterDto) {
    const where = this.buildWhereClause(tenantId, filters);
    const total = await this.prisma.lead.count({ where });

    // Buscar todos os leads e agrupar manualmente para evitar problemas com Prisma groupBy
    const leads = await this.prisma.lead.findMany({
      where,
      select: {
        origin: true,
      },
    });

    const originMap = new Map<string, number>();
    leads.forEach((lead) => {
      const origin = lead.origin || 'Orgânico';
      originMap.set(origin, (originMap.get(origin) || 0) + 1);
    });

    return Array.from(originMap.entries()).map(([origin, count]) => ({
      origin,
      count,
      percentage: total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0,
    }));
  }

  private async calculateAverageResponseTime(tenantId: string, filters: ReportsFilterDto): Promise<number> {
    const dateFilter = this.buildDateFilter(filters);

    // Buscar primeiras mensagens de cada conversa
    const conversations = await this.prisma.conversation.findMany({
      where: {
        tenantId,
        ...(dateFilter && { createdAt: dateFilter }),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 2, // Primeira mensagem (incoming) e primeira resposta (outgoing)
        },
      },
    });

    let totalTime = 0;
    let count = 0;

    conversations.forEach((conv) => {
      const messages = conv.messages;
      if (messages.length >= 2) {
        const firstIncoming = messages.find((m) => m.direction === 'INCOMING');
        const firstOutgoing = messages.find((m) => m.direction === 'OUTGOING');
        
        if (firstIncoming && firstOutgoing && firstOutgoing.createdAt > firstIncoming.createdAt) {
          const diff = firstOutgoing.createdAt.getTime() - firstIncoming.createdAt.getTime();
          totalTime += diff;
          count++;
        }
      }
    });

    return count > 0 ? Number((totalTime / count / 1000 / 60).toFixed(2)) : 0; // em minutos
  }

  private async calculateAverageAttendanceTime(tenantId: string, filters: ReportsFilterDto): Promise<number> {
    const dateFilter = this.buildDateFilter(filters);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        ...(filters.userId && { assignedUserId: filters.userId }),
        startedAt: { not: null },
        endedAt: { not: null },
        ...(dateFilter && { createdAt: dateFilter }),
      },
      select: {
        startedAt: true,
        endedAt: true,
      },
    });

    if (attendances.length === 0) return 0;

    const totalTime = attendances.reduce((sum, att) => {
      if (att.startedAt && att.endedAt) {
        return sum + (att.endedAt.getTime() - att.startedAt.getTime());
      }
      return sum;
    }, 0);

    return Number((totalTime / attendances.length / 1000 / 60).toFixed(2)); // em minutos
  }

  private async calculateConversionByAttendant(tenantId: string, filters: ReportsFilterDto) {
    const dateFilter = this.buildDateFilter(filters);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        assignedUserId: { not: null },
        ...(filters.userId && { assignedUserId: filters.userId }),
        ...(dateFilter && { createdAt: dateFilter }),
      },
      include: {
        assignedUser: true,
        lead: true,
      },
    });

    const byUser = new Map<string, { user: any; leads: any[] }>();

    attendances.forEach((att) => {
      if (att.assignedUserId && att.assignedUser) {
        if (!byUser.has(att.assignedUserId)) {
          byUser.set(att.assignedUserId, {
            user: att.assignedUser,
            leads: [],
          });
        }
        const userData = byUser.get(att.assignedUserId)!;
        if (att.lead && !userData.leads.find((l) => l.id === att.lead!.id)) {
          userData.leads.push(att.lead);
        }
      }
    });

    return Array.from(byUser.values()).map(({ user, leads }) => {
      const totalLeads = leads.length;
      const convertedLeads = leads.filter((l) => l.status === LeadStatus.CONCLUIDO).length;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      return {
        userId: user.id,
        userName: user.name,
        totalLeads,
        convertedLeads,
        conversionRate: Number(conversionRate.toFixed(2)),
      };
    });
  }

  private async calculateAttendanceMetricsByAttendant(tenantId: string, filters: ReportsFilterDto) {
    const dateFilter = this.buildDateFilter(filters);

    const attendances = await this.prisma.attendance.findMany({
      where: {
        tenantId,
        assignedUserId: { not: null },
        ...(filters.userId && { assignedUserId: filters.userId }),
        ...(dateFilter && { createdAt: dateFilter }),
      },
      include: {
        assignedUser: true,
        lead: true,
      },
    });

    const byUser = new Map<string, { user: any; attendances: any[] }>();

    attendances.forEach((att) => {
      if (att.assignedUserId && att.assignedUser) {
        if (!byUser.has(att.assignedUserId)) {
          byUser.set(att.assignedUserId, {
            user: att.assignedUser,
            attendances: [],
          });
        }
        byUser.get(att.assignedUserId)!.attendances.push(att);
      }
    });

    return Promise.all(
      Array.from(byUser.values()).map(async ({ user, attendances }) => {
        const totalAttendances = attendances.length;
        
        // Tempo médio de atendimento
        const completedAttendances = attendances.filter(
          (att) => att.startedAt && att.endedAt,
        );
        const averageTime =
          completedAttendances.length > 0
            ? completedAttendances.reduce((sum, att) => {
                if (att.startedAt && att.endedAt) {
                  return sum + (att.endedAt.getTime() - att.startedAt.getTime());
                }
                return sum;
              }, 0) / completedAttendances.length / 1000 / 60
            : 0;

        // Tempo médio de primeira resposta (para este atendente)
        const averageResponseTime = await this.calculateAverageResponseTime(tenantId, {
          ...filters,
          userId: user.id,
        });

        // Taxa de conversão
        const leads = attendances.map((att) => att.lead).filter(Boolean);
        const totalLeads = leads.length;
        const convertedLeads = leads.filter((l) => l.status === LeadStatus.CONCLUIDO).length;
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        return {
          userId: user.id,
          userName: user.name,
          totalAttendances,
          averageTime: Number(averageTime.toFixed(2)),
          averageResponseTime,
          conversionRate: Number(conversionRate.toFixed(2)),
        };
      }),
    );
  }

  private async groupMessagesByPeriod(tenantId: string, filters: ReportsFilterDto) {
    const dateFilter = this.buildDateFilter(filters);

    const messages = await this.prisma.message.findMany({
      where: {
        tenantId,
        direction: 'OUTGOING',
        ...(dateFilter && { createdAt: dateFilter }),
      },
      select: { createdAt: true },
    });

    const grouped = this.groupByDate(messages.map((m) => m.createdAt), 'day');

    // Buscar mensagens automáticas por período
    const scheduledMessages = await this.prisma.scheduledMessage.findMany({
      where: {
        tenantId,
        status: 'SENT',
        ...(dateFilter && { sentAt: dateFilter }),
      },
      select: { sentAt: true },
    });

    const scheduledByDate = this.groupByDate(
      scheduledMessages.map((sm) => sm.sentAt || new Date()),
      'day',
    );

    return grouped.map(({ date, count }) => {
      const scheduledCount = scheduledByDate.find((s) => s.date === date)?.count || 0;
      return {
        date,
        manual: count - scheduledCount,
        automatic: scheduledCount,
      };
    });
  }

  private groupByDate(dates: Date[], period: 'day' | 'week' | 'month') {
    const grouped = new Map<string, Date[]>();

    dates.forEach((date) => {
      let key: string;
      if (period === 'day') {
        key = format(date, 'yyyy-MM-dd');
      } else if (period === 'week') {
        // Calcular semana do ano manualmente
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`;
      } else {
        key = format(date, 'yyyy-MM');
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(date);
    });

    return Array.from(grouped.entries())
      .map(([date, items]) => ({ date, count: items.length, items }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Cache helpers
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

