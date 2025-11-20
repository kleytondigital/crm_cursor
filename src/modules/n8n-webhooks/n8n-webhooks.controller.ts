import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { N8nWebhooksService } from './n8n-webhooks.service';
import { ApiKeyGuard } from '@/shared/guards/api-key.guard';
import { ApiKeyTenant } from '@/shared/decorators/api-key.decorator';
import { Public } from '@/shared/decorators/public.decorator';
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
import { UpdateMessageTranscriptionDto } from './dto/update-message-transcription.dto';

@Controller('webhooks/n8n')
@Public() // Marcar como público para JwtAuthGuard global não interferir
@UseGuards(ApiKeyGuard) // ApiKeyGuard fará a validação de API Key
export class N8nWebhooksController {
  constructor(private readonly n8nWebhooksService: N8nWebhooksService) {}

  @Get('test')
  @Public()
  test() {
    return { message: 'N8N Webhooks Controller está funcionando' };
  }

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

  @Post('messages/:messageId/transcription')
  updateMessageTranscription(
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageTranscriptionDto,
    @ApiKeyTenant() tenantId: string | null,
  ) {
    console.log('[N8N Webhook] Recebendo atualização de transcrição:', {
      messageId,
      tenantId: tenantId || 'global',
      transcriptionText: dto.transcriptionText?.substring(0, 50),
    });
    return this.n8nWebhooksService.updateMessageTranscription(
      messageId,
      dto,
      tenantId,
    );
  }
}

