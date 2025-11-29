import { IsBoolean } from 'class-validator';

export class UpdateCompanyTranscriptionDto {
  @IsBoolean()
  autoTranscribeAudio: boolean;
}

