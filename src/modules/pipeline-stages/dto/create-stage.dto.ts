import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, IsHexColor } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class CreatePipelineStageDto {
  @IsString()
  name: string;

  @IsEnum(LeadStatus)
  status: LeadStatus;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

