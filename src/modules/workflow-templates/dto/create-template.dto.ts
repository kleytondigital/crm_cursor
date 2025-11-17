import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class CreateWorkflowTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsObject()
  n8nWorkflowData: any; // JSON do workflow do n8n

  @IsObject()
  variables: any; // Definição das variáveis editáveis

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean; // true para Super Admin, false para tenant específico
}

