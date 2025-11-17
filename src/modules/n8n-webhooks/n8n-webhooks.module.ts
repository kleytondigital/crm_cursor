import { Module } from '@nestjs/common';
import { N8nWebhooksController } from './n8n-webhooks.controller';
import { N8nWebhooksService } from './n8n-webhooks.service';
import { PrismaModule } from '@/shared/prisma/prisma.module';
import { AttendancesModule } from '../attendances/attendances.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [PrismaModule, AttendancesModule, MessagesModule],
  controllers: [N8nWebhooksController],
  providers: [N8nWebhooksService],
  exports: [N8nWebhooksService],
})
export class N8nWebhooksModule {}

