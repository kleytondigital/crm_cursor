import { Module } from '@nestjs/common';
import { LeadStatusService } from './lead-status.service';
import { LeadStatusController } from './lead-status.controller';
import { PrismaModule } from '@/shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LeadStatusController],
  providers: [LeadStatusService],
  exports: [LeadStatusService],
})
export class LeadStatusModule {}

