import { Controller, Get, Param, Post, Patch, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Roles } from '@/shared/decorators/roles.decorator';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { UserRole } from '@prisma/client';

@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    // Usar user.id (retornado pelo JwtStrategy) em vez de user.sub
    return this.conversationsService.findAll(user.companyId, user.id, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.conversationsService.findOne(id, user.companyId);
  }

  @Post(':id/reopen')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  reopen(@Param('id') id: string, @CurrentUser() user: any) {
    // Usar user.id (retornado pelo JwtStrategy) em vez de user.sub
    return this.conversationsService.reopenConversation(id, user.companyId, user.id);
  }

  @Patch(':id/bot-lock')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  updateBotLock(
    @Param('id') id: string,
    @Body() body: { isBotAttending: boolean },
    @CurrentUser() user: any,
  ) {
    return this.conversationsService.updateBotLock(
      id,
      body.isBotAttending,
      user.companyId,
    );
  }
}

