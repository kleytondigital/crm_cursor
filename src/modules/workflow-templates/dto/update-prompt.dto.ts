import { IsString, IsOptional } from 'class-validator';

export class UpdatePromptDto {
  @IsString()
  @IsOptional()
  generatedPrompt?: string; // Prompt gerado a ser salvo
}

