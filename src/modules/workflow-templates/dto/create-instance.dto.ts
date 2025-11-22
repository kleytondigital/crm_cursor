import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class CreateWorkflowInstanceDto {
  @IsString()
  name: string;

  @IsObject()
  config: any; // Valores das variáveis configuradas pelo tenant

  @IsOptional()
  @IsString()
  aiAgentId?: string;

  @IsOptional()
  @IsBoolean()
  testMode?: boolean; // Modo teste (true/false)

  @IsOptional()
  @IsString()
  testPhone?: string; // Telefone para modo teste (formato: 5562999999999@c.us)
}

