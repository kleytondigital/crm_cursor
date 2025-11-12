import { forwardRef, Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { MessagesController } from './messages.controller';
import { WsJwtGuard } from '@/shared/guards/ws-jwt.guard';
import { AttendancesModule } from '@/modules/attendances/attendances.module';

@Module({
  imports: [forwardRef(() => AttendancesModule)],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, WsJwtGuard],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}

