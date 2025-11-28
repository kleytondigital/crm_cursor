import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum SocialMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
}

export class SendSocialMessageDto {
  @IsString()
  @IsNotEmpty()
  connectionId: string;

  @IsString()
  @IsNotEmpty()
  recipientId: string; // ID do Instagram/Facebook

  @IsEnum(SocialMessageType)
  @IsNotEmpty()
  messageType: SocialMessageType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  tempId?: string;

  @IsString()
  @IsOptional()
  replyTo?: string; // ID da mensagem original para reply
}

