import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AdReportWebhookPayload } from './dto/ad-report-webhook.dto';
import { AdReportFilterDto } from './dto/ad-report-filter.dto';
import { AdReportDashboardData } from './dto/ad-report-response.dto';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class AdReportsService {
  private readonly logger = new Logger(AdReportsService.name);
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutos

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Salva relatório completo recebido via webhook do n8n
   */
  async saveReportFromWebhook(payload: AdReportWebhookPayload) {
    this.logger.log(`Salvando relatório para tenant ${payload.tenantId}, conta ${payload.adAccountId}`);

    // Verificar se a conta existe
    const adAccount = await this.prisma.adAccount.findFirst({
      where: {
        tenantId: payload.tenantId,
        adAccountId: payload.adAccountId,
        isActive: true,
      },
    });

    if (!adAccount) {
      throw new NotFoundException(`Conta de anúncio ${payload.adAccountId} não encontrada ou inativa`);
    }

    const dateStart = parseISO(payload.dateStart);
    const dateEnd = parseISO(payload.dateEnd);

    // Verificar se relatório já existe
    const existing = await this.prisma.adReport.findFirst({
      where: {
        tenantId: payload.tenantId,
        accountId: adAccount.id,
        dateStart,
        dateEnd,
      },
    });

    // Criar ou atualizar relatório principal
    const report = existing
      ? await this.prisma.adReport.update({
          where: { id: existing.id },
          data: {
            metrics: payload.metrics as any,
            campaignId: null, // Resetar filtros se necessário
            adsetId: null,
            adId: null,
          },
        })
      : await this.prisma.adReport.create({
          data: {
            tenantId: payload.tenantId,
            accountId: adAccount.id,
            dateStart,
            dateEnd,
            metrics: payload.metrics as any,
          },
        });

    // Deletar timeline e breakdown antigos
    await Promise.all([
      this.prisma.adReportTimeline.deleteMany({
        where: { reportId: report.id },
      }),
      this.prisma.adReportBreakdown.deleteMany({
        where: { reportId: report.id },
      }),
    ]);

    // Criar timeline (dados diários)
    const timelineData = payload.timeline.map((item) => ({
      reportId: report.id,
      date: parseISO(item.date),
      spend: item.spend || 0,
      impressions: item.impressions || 0,
      reach: 0, // Preencher se disponível no payload
      clicks: item.clicks || 0,
      messages: item.messages || 0,
      conversions: 0, // Preencher se disponível no payload
    }));

    await this.prisma.adReportTimeline.createMany({
      data: timelineData,
    });

    // Criar breakdown (dados por anúncio)
    const breakdownData = payload.adsBreakdown.map((item) => ({
      reportId: report.id,
      adId: item.adId,
      adName: item.name,
      creativeName: null,
      spend: item.spend || 0,
      impressions: item.impressions || 0,
      clicks: item.clicks || 0,
      messages: item.messages || 0,
      cpc: item.cpc || null,
      cpm: item.cpm || null,
      ctr: item.ctr || null,
      cpa: item.cpa || null,
    }));

    await this.prisma.adReportBreakdown.createMany({
      data: breakdownData,
    });

    // Invalidar cache
    this.invalidateCache(payload.tenantId, payload.adAccountId);

    this.logger.log(`Relatório salvo com sucesso: ${report.id}`);
    return report;
  }

  /**
   * Retorna dados completos do dashboard
   */
  async getDashboardData(
    tenantId: string,
    filters: AdReportFilterDto,
  ): Promise<AdReportDashboardData> {
    const cacheKey = `dashboard:${tenantId}:${JSON.stringify(filters)}`;
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Validar filtros
    if (!filters.adAccountId) {
      throw new BadRequestException('adAccountId é obrigatório');
    }

    const adAccount = await this.prisma.adAccount.findFirst({
      where: {
        tenantId,
        adAccountId: filters.adAccountId,
        isActive: true,
      },
    });

    if (!adAccount) {
      throw new NotFoundException('Conta de anúncio não encontrada');
    }

    // Construir filtros de data
    const dateStart = filters.dateStart ? parseISO(filters.dateStart) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dateEnd = filters.dateEnd ? parseISO(filters.dateEnd) : new Date();

    // Buscar relatório mais recente no período
    const where: any = {
      tenantId,
      accountId: adAccount.id, // Usar o ID interno do AdAccount (FK)
      dateStart: { lte: endOfDay(dateEnd) },
      dateEnd: { gte: startOfDay(dateStart) },
    };

    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.adsetId) where.adsetId = filters.adsetId;
    if (filters.adId) where.adId = filters.adId;

    const report = await this.prisma.adReport.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        timeline: {
          orderBy: { date: 'asc' },
        },
        breakdown: true,
      },
    });

    if (!report) {
      // Retornar dados vazios se não houver relatório
      return {
        metrics: {
          spend: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          cpc: 0,
          cpm: 0,
          ctr: 0,
          cpa: 0,
          messages: 0,
          costPerMessage: 0,
          conversions: 0,
          conversionRate: 0,
        },
        timeline: [],
        funnel: {
          impressions: 0,
          clicks: 0,
          messages: 0,
          conversions: 0,
        },
        breakdown: [],
      };
    }

    // Construir resposta
    const metrics = report.metrics as any;
    const timeline = report.timeline.map((item) => ({
      date: format(item.date, 'yyyy-MM-dd'),
      spend: item.spend,
      impressions: item.impressions,
      reach: item.reach,
      clicks: item.clicks,
      messages: item.messages,
      conversions: item.conversions,
    }));

    // Calcular funil
    const funnel = {
      impressions: metrics.impressions || 0,
      clicks: metrics.clicks || 0,
      messages: metrics.messages || 0,
      conversions: metrics.conversions || 0,
    };

    // Breakdown
    const breakdown = report.breakdown.map((item) => ({
      adId: item.adId,
      adName: item.adName,
      creativeName: item.creativeName || undefined,
      spend: item.spend,
      impressions: item.impressions,
      clicks: item.clicks,
      messages: item.messages,
      cpc: item.cpc || 0,
      cpm: item.cpm || 0,
      ctr: item.ctr || 0,
      cpa: item.cpa || 0,
    }));

    const data: AdReportDashboardData = {
      metrics: {
        spend: metrics.spend || 0,
        impressions: metrics.impressions || 0,
        reach: metrics.reach || 0,
        clicks: metrics.clicks || 0,
        cpc: metrics.cpc || 0,
        cpm: metrics.cpm || 0,
        ctr: metrics.ctr || 0,
        cpa: metrics.cpa || 0,
        messages: metrics.messages || 0,
        costPerMessage: metrics.costPerMessage || 0,
        conversions: metrics.conversions || 0,
        conversionRate: metrics.conversionRate || 0,
      },
      timeline,
      funnel,
      breakdown,
    };

    // Cachear resultado
    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return data;
  }

  /**
   * Correlaciona mensagens com anúncios no período
   */
  async correlateMessagesWithAds(
    tenantId: string,
    dateStart: Date,
    dateEnd: Date,
    adAccountId?: string,
  ) {
    const where: any = {
      tenantId,
      createdAt: {
        gte: startOfDay(dateStart),
        lte: endOfDay(dateEnd),
      },
      OR: [
        { adId: { not: null } },
        { campaignId: { not: null } },
      ],
    };

    const messages = await this.prisma.message.findMany({
      where,
      select: {
        adId: true,
        campaignId: true,
        adsetId: true,
        createdAt: true,
      },
    });

    // Agrupar por anúncio/campanha
    const grouped: Record<string, number> = {};
    
    messages.forEach((msg) => {
      const key = msg.adId || msg.campaignId || 'unknown';
      grouped[key] = (grouped[key] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Invalidar cache
   */
  private invalidateCache(tenantId: string, adAccountId: string) {
    const keysToDelete: string[] = [];
    this.cache.forEach((value, key) => {
      if (key.includes(tenantId) && key.includes(adAccountId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

