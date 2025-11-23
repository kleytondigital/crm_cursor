import { IsOptional, IsString, IsDateString, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class ReportsFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(LeadStatus, { each: true })
  status?: LeadStatus[];

  @IsOptional()
  @IsBoolean()
  converted?: boolean;
}

