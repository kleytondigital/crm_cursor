import { Module } from '@nestjs/common';
import { BulkMessagingService } from './bulk-messaging.service';
import { BulkMessagingController } from './bulk-messaging.controller';
import { ExcelProcessorService } from './services/excel-processor.service';
import { BulkDispatcherService } from './services/bulk-dispatcher.service';
import { N8nModule } from '@/shared/n8n/n8n.module';

@Module({
  imports: [N8nModule],
  controllers: [BulkMessagingController],
  providers: [
    BulkMessagingService,
    ExcelProcessorService,
    BulkDispatcherService,
  ],
  exports: [BulkMessagingService],
})
export class BulkMessagingModule {}

