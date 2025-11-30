import { Module } from '@nestjs/common';
import { AdAccountsService } from './ad-accounts.service';
import { AdAccountsController } from './ad-accounts.controller';
import { MetaAdsApiService } from './services/meta-ads-api.service';
import { PrismaModule } from '@/shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdAccountsController],
  providers: [AdAccountsService, MetaAdsApiService],
  exports: [AdAccountsService, MetaAdsApiService],
})
export class AdAccountsModule {}

