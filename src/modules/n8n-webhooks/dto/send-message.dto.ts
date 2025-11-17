import { IsString, IsEnum, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  phone: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsEnum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT'])
  contentType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';

  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

