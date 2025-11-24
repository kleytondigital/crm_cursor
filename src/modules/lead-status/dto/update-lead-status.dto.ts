import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadStatusDto } from './create-lead-status.dto';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateLeadStatusDto extends PartialType(CreateLeadStatusDto) {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  description?: string;
}

export class UpdateLeadStatusOrderDto {
  order: number;
}

