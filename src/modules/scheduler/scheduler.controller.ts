import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { CreateScheduledMessageDto } from './dto/create-scheduled-message.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@Controller('scheduler')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('schedule')
  async schedule(
    @Body() dto: CreateScheduledMessageDto,
    @CurrentUser() user: any,
  ) {
    const context = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };
    return this.schedulerService.scheduleMessage(dto, context);
  }

  @Delete('cancel/:id')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    const context = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };
    return this.schedulerService.cancelMessage(id, context);
  }

  @Get('messages/:leadId')
  async getScheduledMessages(
    @Param('leadId') leadId: string,
    @CurrentUser() user: any,
  ) {
    const context = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };
    return this.schedulerService.getScheduledMessages(leadId, context);
  }

  @Post('campaign')
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: any,
  ) {
    const context = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };
    return this.schedulerService.createCampaign(dto, context);
  }

  @Post('campaign/:id/run')
  async runCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    const context = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };
    return this.schedulerService.runCampaignNow(id, context);
  }

  @Get('campaigns')
  async getCampaigns(@CurrentUser() user: any) {
    const context = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };
    return this.schedulerService.getCampaigns(context);
  }

  @Get('campaign/:id')
  async getCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    const context = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };
    return this.schedulerService.getCampaign(id, context);
  }

  @Delete('campaign/:id')
  async cancelCampaign(@Param('id') id: string, @CurrentUser() user: any) {
    const context = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };
    return this.schedulerService.cancelCampaign(id, context);
  }
}




