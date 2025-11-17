import { Module } from '@nestjs/common';
import { AIAgentsService } from './ai-agents.service';
import { AIAgentsController } from './ai-agents.controller';
import { PrismaModule } from '@/shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AIAgentsController],
  providers: [AIAgentsService],
  exports: [AIAgentsService],
})
export class AIAgentsModule {}

