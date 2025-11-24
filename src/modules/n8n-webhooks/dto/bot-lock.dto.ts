import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';

export class BotLockDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsBoolean()
  isBotAttending: boolean;
}

