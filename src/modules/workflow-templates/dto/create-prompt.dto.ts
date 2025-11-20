import { IsString, IsEnum, IsObject, IsOptional, IsArray, ValidateIf } from 'class-validator';

export enum PromptType {
  SYSTEM = 'system',
  USER = 'user',
}

export class CreatePromptDto {
  @IsEnum(PromptType)
  type: 'system' | 'user'; // system = criar prompt do zero, user = ajustar prompt existente

  @IsArray()
  @IsObject({ each: true })
  @ValidateIf((o) => o.type === 'system')
  variables?: Array<Record<string, any>>; // Array de variáveis para type=system

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.type === 'user')
  prompt_ajuste?: string; // Prompt existente para ajustar (type=user)

  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.type === 'user')
  text_ajuste?: string; // Solicitação de ajuste (type=user)
}

