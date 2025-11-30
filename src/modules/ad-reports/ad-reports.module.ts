import { Module } from '@nestjs/common';
import { AdReportsService } from './ad-reports.service';
import { AdReportsController } from './ad-reports.controller';
import { AdReportsWebhookController } from './webhooks/ad-reports-webhook.controller';
import { MetaAdsGestorService } from './services/meta-ads-gestor.service';
import { PrismaModule } from '@/shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdReportsController, AdReportsWebhookController],
  providers: [AdReportsService, MetaAdsGestorService],
  exports: [AdReportsService, MetaAdsGestorService],
})
export class AdReportsModule {}

