import { IsString, IsOptional } from 'class-validator';

export class UpdateMessageTranscriptionDto {
  @IsString()
  transcriptionText: string;
}

