import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { LeadStatus } from '@prisma/client';

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;
}

