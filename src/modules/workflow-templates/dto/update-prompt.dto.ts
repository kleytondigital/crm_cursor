import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class UpdatePromptDto {
  @IsString()
  prompt: string; // Prompt a ser atualizado

  @IsOptional()
  @IsBoolean()
  kanbanEnabled?: boolean; // Se a função Kanban está ativada

  @IsOptional()
  @IsString()
  kanbanPrompt?: string; // Prompt específico da função Kanban

  @IsOptional()
  @IsArray()
  kanbanStageIds?: string[]; // IDs dos estágios configurados para Kanban
}
