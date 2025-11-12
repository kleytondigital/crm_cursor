import { Module, forwardRef } from '@nestjs/common';
import { MessagesModule } from '@/modules/messages/messages.module';
import { WahaWebhookController } from './waha-webhook.controller';
import { AttendancesModule } from '@/modules/attendances/attendances.module';

@Module({
  imports: [forwardRef(() => MessagesModule), AttendancesModule],
  controllers: [WahaWebhookController],
})
export class WebhooksModule {}

