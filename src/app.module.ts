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
import { TenantMiddleware } from './shared/middleware/tenant.middleware';

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

