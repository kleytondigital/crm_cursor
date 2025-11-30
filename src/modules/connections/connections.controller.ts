import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { CreateSocialConnectionDto } from './dto/create-social-connection.dto';
import { OAuthCallbackDto } from './dto/oauth-callback.dto';
import { CreateMetaApiConnectionDto } from './dto/create-meta-api-connection.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { AutomationsAccessGuard } from '@/shared/guards/automations-access.guard';

type ConnectionAction =
  | 'start'
  | 'stop'
  | 'restart'
  | 'delete'
  | 'reload'
  | 'connect'
  | 'disconnect'
  | 'auth-code';

@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post()
  create(@Body() dto: CreateConnectionDto, @CurrentUser() user: any) {
    return this.connectionsService.create(dto, user.companyId);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.connectionsService.findAll(user.companyId);
  }

  @Get(':id/qr')
  getQr(@Param('id') id: string, @CurrentUser() user: any) {
    return this.connectionsService.getQr(id, user.companyId);
  }

  @Patch(':id/actions/:action')
  performAction(
    @Param('id') id: string,
    @Param('action') action: ConnectionAction,
    @CurrentUser() user: any,
    @Body() body: Record<string, any>,
  ) {
    this.ensureValidAction(action);
    const { action: _ignored, ...payload } = body ?? {};
    return this.connectionsService.performAction(id, action, user.companyId, payload);
  }

  @Get(':id/webhooks')
  getWebhooks(@Param('id') id: string, @CurrentUser() user: any) {
    return this.connectionsService.getWebhooks(id, user.companyId);
  }

  @Patch(':id/webhooks')
  updateWebhooks(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      config: {
        webhooks: {
          url: string;
          events: string[];
          hmac: null | string;
          retries: null | {
            delaySeconds: number;
            attempts: number;
            policy: string;
          };
          customHeaders?: Record<string, string> | null;
        }[];
      };
    },
  ) {
    return this.connectionsService.updateWebhooks(
      id,
      user.companyId,
      body.config,
    );
  }

  @Get(':id/automations')
  @UseGuards(JwtAuthGuard, AutomationsAccessGuard)
  getInstancesForConnection(@Param('id') id: string, @CurrentUser() user: any) {
    return this.connectionsService.getInstancesForConnection(
      id,
      user.companyId,
    );
  }

  // ========== Social Connections OAuth Endpoints ==========

  @Get('social/oauth/start')
  startSocialOAuth(
    @Query('provider') provider: 'INSTAGRAM' | 'FACEBOOK',
    @CurrentUser() user: any,
  ) {
    return this.connectionsService.startSocialOAuth(provider, user.companyId);
  }

  @Post('meta-api/oauth/start')
  startMetaApiOAuth(
    @Body() dto: CreateMetaApiConnectionDto,
    @CurrentUser() user: any,
  ) {
    return this.connectionsService.startMetaApiOAuth(dto, user.companyId);
  }

  @Public()
  @Get('social/oauth/callback')
  handleOAuthCallback(@Query() query: OAuthCallbackDto) {
    return this.connectionsService.handleOAuthCallback(query.code, query.state);
  }

  @Post('social/oauth/refresh/:id')
  refreshSocialToken(@Param('id') id: string, @CurrentUser() user: any) {
    return this.connectionsService.refreshSocialToken(id, user.companyId);
  }

  @Get('social')
  getSocialConnections(@CurrentUser() user: any) {
    return this.connectionsService.getSocialConnections(user.companyId);
  }

  @Get('meta-ads')
  getMetaAdsConnections(@CurrentUser() user: any) {
    return this.connectionsService.getMetaAdsConnections(user.companyId);
  }

  @Post('social')
  createSocialConnection(
    @Body() dto: CreateSocialConnectionDto,
    @CurrentUser() user: any,
  ) {
    return this.connectionsService.createSocialConnection(dto, user.companyId);
  }

  @Patch('social/:id')
  updateSocialConnection(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.connectionsService.updateSocialConnection(id, dto, user.companyId);
  }

  @Post('social/:id/disconnect')
  disconnectSocial(@Param('id') id: string, @CurrentUser() user: any) {
    return this.connectionsService.disconnectSocial(id, user.companyId);
  }

  private ensureValidAction(action: string): asserts action is ConnectionAction {
    const allowed: ConnectionAction[] = [
      'start',
      'stop',
      'restart',
      'delete',
      'reload',
      'connect',
      'disconnect',
      'auth-code',
    ];
    if (!allowed.includes(action as ConnectionAction)) {
      throw new BadRequestException(
        `Ação inválida. Use uma das opções: ${allowed.join(', ')}`,
      );
    }
  }
}

