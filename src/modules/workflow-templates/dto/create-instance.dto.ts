import { IsString, IsObject, IsOptional } from 'class-validator';

export class CreateWorkflowInstanceDto {
  @IsString()
  name: string;

  @IsObject()
  config: any; // Valores das variáveis configuradas pelo tenant

  @IsOptional()
  @IsString()
  aiAgentId?: string;
}

