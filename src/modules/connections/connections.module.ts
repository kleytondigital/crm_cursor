import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { AutomationsAccessGuard } from '@/shared/guards/automations-access.guard';

@Module({
  controllers: [ConnectionsController],
  providers: [ConnectionsService, AutomationsAccessGuard],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}

