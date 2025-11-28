import { IsOptional, IsEnum, IsString } from 'class-validator';
import { BulkMessagingCampaignStatus } from '@prisma/client';

export class BulkCampaignFilterDto {
  @IsOptional()
  @IsEnum(BulkMessagingCampaignStatus)
  status?: BulkMessagingCampaignStatus;

  @IsOptional()
  @IsString()
  search?: string;
}

