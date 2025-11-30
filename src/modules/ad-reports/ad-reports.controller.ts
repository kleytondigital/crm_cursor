import { Controller, Get, Query, UseGuards, Logger, Param } from '@nestjs/common';
import { AdReportsService } from './ad-reports.service';
import { AdReportFilterDto } from './dto/ad-report-filter.dto';
import { MetaAdsGestorService } from './services/meta-ads-gestor.service';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@Controller('ad-reports')
@UseGuards(JwtAuthGuard)
export class AdReportsController {
  private readonly logger = new Logger(AdReportsController.name);

  constructor(
    private readonly adReportsService: AdReportsService,
    private readonly metaAdsGestor: MetaAdsGestorService,
  ) {}

  /**
   * Retorna dados completos do dashboard
   */
  @Get('dashboard')
  async getDashboard(
    @Query() filters: AdReportFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.adReportsService.getDashboardData(user.companyId, filters);
  }

  /**
   * Lista campanhas de uma conta de anúncio
   */
  @Get('campanhas/:connectionId/:adAccountId')
  async listCampanhas(
    @Param('connectionId') connectionId: string,
    @Param('adAccountId') adAccountId: string,
    @CurrentUser() user: any,
  ) {
    return this.metaAdsGestor.listCampanhas(user.companyId, connectionId, adAccountId);
  }

  /**
   * Lista métricas de uma conta/campanha/conjunto/anúncio
   */
  @Get('metricas/:connectionId/:adAccountId')
  async listMetricas(
    @Param('connectionId') connectionId: string,
    @Param('adAccountId') adAccountId: string,
    @Query('dateStart') dateStart: string,
    @Query('dateEnd') dateEnd: string,
    @CurrentUser() user: any,
    @Query('campaignId') campaignId?: string,
    @Query('adsetId') adsetId?: string,
    @Query('adId') adId?: string,
  ) {
    return this.metaAdsGestor.listMetricas(
      user.companyId,
      connectionId,
      adAccountId,
      dateStart,
      dateEnd,
      campaignId,
      adsetId,
      adId,
    );
  }
}

