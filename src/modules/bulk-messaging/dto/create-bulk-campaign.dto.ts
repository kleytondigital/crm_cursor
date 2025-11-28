import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ScheduledContentType } from '@prisma/client';

export class CreateBulkCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ScheduledContentType)
  @IsNotEmpty()
  contentType: ScheduledContentType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsNotEmpty()
  connectionId: string;

  @IsInt()
  @Min(1000) // Mínimo 1 segundo
  @Max(60000) // Máximo 60 segundos
  @IsOptional()
  delayBetweenMessages?: number; // Delay em ms entre mensagens para o mesmo número

  @IsInt()
  @Min(2000) // Mínimo 2 segundos
  @Max(120000) // Máximo 2 minutos
  @IsOptional()
  delayBetweenNumbers?: number; // Delay em ms entre números diferentes
}

