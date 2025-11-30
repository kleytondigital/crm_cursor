import { IsString, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class AdReportFilterDto {
  @IsString()
  @IsOptional()
  adAccountId?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  adsetId?: string;

  @IsString()
  @IsOptional()
  adId?: string;

  @IsDateString()
  @IsOptional()
  dateStart?: string;

  @IsDateString()
  @IsOptional()
  dateEnd?: string;
}

