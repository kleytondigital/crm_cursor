import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduledContentType } from '@prisma/client';

/**
 * Item de mensagem para sequência
 */
export class MessageSequenceItemDto {
  @IsEnum(ScheduledContentType)
  @IsNotEmpty()
  type: ScheduledContentType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsInt()
  @Min(0)
  @Max(60000)
  @IsOptional()
  delay?: number; // Delay antes de enviar esta mensagem (ms)
}

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

  // Sequência de mensagens (múltiplas mensagens para o mesmo destinatário)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageSequenceItemDto)
  @IsOptional()
  messageSequence?: MessageSequenceItemDto[];

  // Usar saudação randômica antes das mensagens
  @IsBoolean()
  @IsOptional()
  useRandomGreeting?: boolean;

  // Lista customizada de saudações randômicas (se não fornecido, usa padrão)
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  randomGreetings?: string[];

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
