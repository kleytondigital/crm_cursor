import { IsOptional, IsEnum, IsString } from 'class-validator';
import { BulkMessagingLogStatus } from '@prisma/client';

export class BulkLogFilterDto {
  @IsOptional()
  @IsEnum(BulkMessagingLogStatus)
  status?: BulkMessagingLogStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

