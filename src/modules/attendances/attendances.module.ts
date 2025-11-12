import { forwardRef, Module } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { AttendancesGateway } from './attendances.gateway';
import { MessagesModule } from '@/modules/messages/messages.module';
import { RolesGuard } from '@/shared/guards/roles.guard';

@Module({
  imports: [forwardRef(() => MessagesModule)],
  controllers: [AttendancesController, DepartmentsController],
  providers: [AttendancesService, DepartmentsService, AttendancesGateway, RolesGuard],
  exports: [AttendancesService, DepartmentsService, AttendancesGateway],
})
export class AttendancesModule {}

