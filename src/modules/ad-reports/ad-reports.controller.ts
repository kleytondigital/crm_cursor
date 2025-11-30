import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { AdReportsService } from './ad-reports.service';
import { AdReportFilterDto } from './dto/ad-report-filter.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@Controller('ad-reports')
@UseGuards(JwtAuthGuard)
export class AdReportsController {
  private readonly logger = new Logger(AdReportsController.name);

  constructor(private readonly adReportsService: AdReportsService) {}

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
}

