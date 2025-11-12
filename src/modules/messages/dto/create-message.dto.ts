import { IsEnum, IsString, IsUUID, IsOptional, ValidateIf } from 'class-validator';
import { ContentType, SenderType } from '@prisma/client';

export class CreateMessageDto {
  @IsUUID()
  conversationId: string;

  @IsEnum(SenderType)
  senderType: SenderType;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.contentType === 'TEXT' || o.contentType === 'DOCUMENT')
  contentText?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => 
    o.contentType === 'IMAGE' || 
    o.contentType === 'AUDIO' || 
    o.contentType === 'VIDEO' || 
    o.contentType === 'DOCUMENT'
  )
  contentUrl?: string;
}

