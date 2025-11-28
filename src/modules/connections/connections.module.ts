import { Module } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { MetaOAuthService } from './services/meta-oauth.service';
import { N8nSocialConfigService } from './services/n8n-social-config.service';
import { TokenRefreshService } from './services/token-refresh.service';
import { AutomationsAccessGuard } from '@/shared/guards/automations-access.guard';

@Module({
  controllers: [ConnectionsController],
  providers: [
    ConnectionsService,
    MetaOAuthService,
    N8nSocialConfigService,
    TokenRefreshService,
    AutomationsAccessGuard,
  ],
  exports: [ConnectionsService, MetaOAuthService],
})
export class ConnectionsModule {}

