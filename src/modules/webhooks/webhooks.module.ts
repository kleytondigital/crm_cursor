import { Module, forwardRef } from '@nestjs/common';
import { MessagesModule } from '@/modules/messages/messages.module';
import { WahaWebhookController } from './waha-webhook.controller';
import { AttendancesModule } from '@/modules/attendances/attendances.module';
import { N8nModule } from '@/shared/n8n/n8n.module';

@Module({
  imports: [forwardRef(() => MessagesModule), AttendancesModule, N8nModule],
  controllers: [WahaWebhookController],
})
export class WebhooksModule {}

