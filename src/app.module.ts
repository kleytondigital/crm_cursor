import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { LeadsModule } from './modules/leads/leads.module';
import { WahaModule } from './shared/waha/waha.module';
import { N8nModule } from './shared/n8n/n8n.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ConnectionsModule } from './modules/connections/connections.module';
import { AttendancesModule } from './modules/attendances/attendances.module';
import { FilesModule } from './modules/files/files.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { MinioModule } from './shared/minio/minio.module';
import { TenantMiddleware } from './shared/middleware/tenant.middleware';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { N8nWebhooksModule } from './modules/n8n-webhooks/n8n-webhooks.module';
import { AIAgentsModule } from './modules/ai-agents/ai-agents.module';
import { N8nApiModule } from './shared/n8n-api/n8n-api.module';
import { WorkflowTemplatesModule } from './modules/workflow-templates/workflow-templates.module';
import { PipelineStagesModule } from './modules/pipeline-stages/pipeline-stages.module';
import { ReportsModule } from './modules/reports/reports.module';
import { LeadStatusModule } from './modules/lead-status/lead-status.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
      global: true,
    }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    MessagesModule,
    ConversationsModule,
    LeadsModule,
    WahaModule,
    N8nModule,
    WebhooksModule,
    ConnectionsModule,
    AttendancesModule,
    FilesModule,
    SchedulerModule,
    MinioModule,
    ApiKeysModule,
    N8nWebhooksModule,
    AIAgentsModule,
    N8nApiModule,
    WorkflowTemplatesModule,
    PipelineStagesModule,
    ReportsModule,
    LeadStatusModule,
    SystemSettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService, TenantMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicar TenantMiddleware para todas as rotas
    // O middleware verifica internamente se é rota de uploads e pula
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}

