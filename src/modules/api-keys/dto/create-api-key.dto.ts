import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean; // Apenas para SUPER_ADMIN: criar chave global (sem tenant)
}

