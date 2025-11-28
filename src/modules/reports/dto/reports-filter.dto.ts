import { IsOptional, IsString, IsDateString, IsBoolean, IsArray } from 'class-validator';

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
  @IsString({ each: true })
  statusId?: string[];

  @IsOptional()
  @IsBoolean()
  converted?: boolean;
}

