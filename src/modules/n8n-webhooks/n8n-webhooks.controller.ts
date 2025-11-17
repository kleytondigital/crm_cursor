import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { N8nWebhooksService } from './n8n-webhooks.service';
import { ApiKeyGuard } from '@/shared/guards/api-key.guard';
import { ApiKeyTenant } from '@/shared/decorators/api-key.decorator';
import { UpdateLeadNameDto } from './dto/update-lead-name.dto';
import { UpdateLeadTagsDto } from './dto/update-lead-tags.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import {
  TransferAttendanceDepartmentDto,
  TransferAttendanceUserDto,
} from './dto/transfer-attendance.dto';
import { CloseAttendanceDto } from './dto/close-attendance.dto';
import { UpdateAttendancePriorityDto } from './dto/update-attendance-priority.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('webhooks/n8n')
@UseGuards(ApiKeyGuard)
export class N8nWebhooksController {
  constructor(private readonly n8nWebhooksService: N8nWebhooksService) {}

  // ============= LEADS =============

  @Patch('leads/:phone/name')
  updateLeadName(
    @Param('phone') phone: string,
    @Body() dto: UpdateLeadNameDto,
    @ApiKeyTenant() tenantId: string,
  ) {
    return this.n8nWebhooksService.updateLeadName(phone, dto, tenantId);
  }

  @Patch('leads/:phone/tags')
  updateLeadTags(
    @Param('phone') phone: string,
    @Body() dto: UpdateLeadTagsDto,
    @ApiKeyTenant() tenantId: string,
  ) {
    return this.n8nWebhooksService.updateLeadTags(phone, dto, tenantId);
  }

  @Patch('leads/:phone/status')
  updateLeadStatus(
    @Param('phone') phone: string,
    @Body() dto: UpdateLeadStatusDto,
    @ApiKeyTenant() tenantId: string,
  ) {
    return this.n8nWebhooksService.updateLeadStatus(phone, dto, tenantId);
  }

  @Get('leads/:phone')
  getLeadByPhone(
    @Param('phone') phone: string,
    @ApiKeyTenant() tenantId: string,
  ) {
    return this.n8nWebhooksService.getLeadByPhone(phone, tenantId);
  }

  // ============= ATTENDANCES =============

  @Post('attendances/:leadId/transfer-department')
  transferAttendanceToDepartment(
    @Param('leadId') leadId: string,
    @Body() dto: TransferAttendanceDepartmentDto,
    @ApiKeyTenant() tenantId: string,
  ) {
    return this.n8nWebhooksService.transferAttendanceToDepartment(
      leadId,
      dto,
      tenantId,
    );
  }

  @Post('attendances/:leadId/transfer-user')
  transferAttendanceToUser(
    @Param('leadId') leadId: string,
    @Body() dto: TransferAttendanceUserDto,
    @ApiKeyTenant() tenantId: string,
  ) {
    return this.n8nWebhooksService.transferAttendanceToUser(
      leadId,
      dto,
      tenantId,
    );
  }

  @Post('attendances/:leadId/close')
  closeAttendance(
    @Param('leadId') leadId: string,
    @Body() dto: CloseAttendanceDto,
    @ApiKeyTenant() tenantId: string,
  ) {
    return this.n8nWebhooksService.closeAttendance(leadId, dto, tenantId);
  }

  @Patch('attendances/:leadId/priority')
  updateAttendancePriority(
    @Param('leadId') leadId: string,
    @Body() dto: UpdateAttendancePriorityDto,
    @ApiKeyTenant() tenantId: string,
  ) {
    return this.n8nWebhooksService.updateAttendancePriority(
      leadId,
      dto,
      tenantId,
    );
  }

  // ============= MESSAGES =============

  @Post('messages/send')
  sendMessage(@Body() dto: SendMessageDto, @ApiKeyTenant() tenantId: string) {
    return this.n8nWebhooksService.sendMessage(dto, tenantId);
  }

  @Get('messages/:leadId')
  getMessagesByLeadId(
    @Param('leadId') leadId: string,
    @ApiKeyTenant() tenantId: string,
  ) {
    return this.n8nWebhooksService.getMessagesByLeadId(leadId, tenantId);
  }
}

