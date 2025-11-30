import { Module } from '@nestjs/common';
import { AdAccountsService } from './ad-accounts.service';
import { AdAccountsController } from './ad-accounts.controller';
import { MetaAdsApiService } from './services/meta-ads-api.service';
import { AdReportsModule } from '@/modules/ad-reports/ad-reports.module';
import { PrismaModule } from '@/shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule, AdReportsModule],
  controllers: [AdAccountsController],
  providers: [AdAccountsService, MetaAdsApiService],
  exports: [AdAccountsService, MetaAdsApiService],
})
export class AdAccountsModule {}

