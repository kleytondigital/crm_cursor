import { Module, forwardRef } from '@nestjs/common';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { WorkflowTemplatesController } from './workflow-templates.controller';
import { PrismaModule } from '@/shared/prisma/prisma.module';
import { N8nApiModule } from '@/shared/n8n-api/n8n-api.module';
import { N8nModule } from '@/shared/n8n/n8n.module';
import { ConnectionsModule } from '@/modules/connections/connections.module';

@Module({
  imports: [
    PrismaModule,
    N8nApiModule,
    N8nModule,
    forwardRef(() => ConnectionsModule),
  ],
  controllers: [WorkflowTemplatesController],
  providers: [WorkflowTemplatesService],
  exports: [WorkflowTemplatesService],
})
export class WorkflowTemplatesModule {}

