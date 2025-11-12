import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { SchedulerProcessor } from './scheduler.processor';
import { PrismaModule } from '@/shared/prisma/prisma.module';
import { N8nModule } from '@/shared/n8n/n8n.module';
import { SchedulerGateway } from './scheduler.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    N8nModule,
    JwtModule,
    BullModule.registerQueueAsync({
      name: 'message-scheduler',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        return {
          redis: {
            host: redisHost,
            port: redisPort,
            ...(redisPassword ? { password: redisPassword } : {}),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService, SchedulerProcessor, SchedulerGateway],
  exports: [SchedulerService, SchedulerGateway],
})
export class SchedulerModule {}

