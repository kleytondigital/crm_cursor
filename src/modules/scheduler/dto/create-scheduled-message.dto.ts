import { IsEnum, IsOptional, IsString, IsUUID, IsISO8601 } from 'class-validator';
import { ScheduledContentType } from '@prisma/client';

export class CreateScheduledMessageDto {
  @IsUUID()
  leadId: string;

  @IsOptional()
  @IsUUID()
  connectionId?: string;

  @IsEnum(ScheduledContentType)
  contentType: ScheduledContentType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsISO8601()
  scheduledFor: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

