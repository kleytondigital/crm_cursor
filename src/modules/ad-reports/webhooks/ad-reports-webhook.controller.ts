import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { Public } from '@/shared/decorators/public.decorator';
import { ApiKeyGuard } from '@/shared/guards/api-key.guard';
import { AdReportsService } from '../ad-reports.service';
import { AdReportWebhookPayload } from '../dto/ad-report-webhook.dto';

@Controller('webhooks/ad-reports')
@Public()
@UseGuards(ApiKeyGuard)
export class AdReportsWebhookController {
  private readonly logger = new Logger(AdReportsWebhookController.name);

  constructor(private readonly adReportsService: AdReportsService) {}

  @Post()
  async handleWebhook(@Body() payload: AdReportWebhookPayload) {
    this.logger.log(
      `Webhook de relatórios recebido para tenant ${payload.tenantId}, conta ${payload.adAccountId}`,
    );

    try {
      const report = await this.adReportsService.saveReportFromWebhook(payload);
      return {
        status: 'ok',
        reportId: report.id,
        message: 'Relatório salvo com sucesso',
      };
    } catch (error: any) {
      this.logger.error(`Erro ao processar webhook de relatórios: ${error.message}`, error.stack);
      throw error;
    }
  }
}

