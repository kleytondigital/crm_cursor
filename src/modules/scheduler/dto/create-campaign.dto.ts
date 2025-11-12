import {
  IsString,
  IsOptional,
  IsArray,
  IsISO8601,
  IsEnum,
  IsBoolean,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ScheduledContentType } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterTags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filterStages?: string[];

  @IsISO8601()
  scheduledFor: string;

  @IsEnum(ScheduledContentType)
  contentType: ScheduledContentType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsUUID()
  connectionId?: string;

  @IsOptional()
  @IsBoolean()
  useRandomConnection?: boolean;
}




