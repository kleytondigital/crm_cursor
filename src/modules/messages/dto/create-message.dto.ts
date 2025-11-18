import { IsEnum, IsString, IsUUID, IsOptional, ValidateIf, IsIn } from 'class-validator';
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

  @IsOptional()
  @IsString()
  replyTo?: string; // messageId da mensagem que está sendo respondida

  @IsOptional()
  @IsString()
  @IsIn(['reply', 'edit', 'delete'])
  action?: string; // action para o webhook (reply, edit, delete)

  @IsOptional()
  @IsString()
  tempId?: string; // ID temporário para correlacionar mensagem otimista com mensagem do servidor
}

export class EditMessageDto {
  @IsString()
  idMessage: string; // messageId da mensagem a ser editada

  @IsString()
  phone: string; // telefone do destinatário

  @IsString()
  session: string; // sessionName da conexão

  @IsString()
  Texto: string; // novo texto da mensagem
}

export class DeleteMessageDto {
  @IsString()
  idMessage: string; // messageId da mensagem a ser excluída

  @IsString()
  phone: string; // telefone do destinatário

  @IsString()
  session: string; // sessionName da conexão
}

