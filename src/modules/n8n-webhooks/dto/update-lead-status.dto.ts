import { IsString, IsOptional } from 'class-validator';

export class UpdateLeadStatusDto {
  @IsString()
  @IsOptional()
  statusId?: string;
  
  // Campo obsoleto - manter apenas para compatibilidade de logs
  @IsString()
  @IsOptional()
  status?: string;
}

