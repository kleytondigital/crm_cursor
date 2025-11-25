import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsHexColor } from 'class-validator';

export class CreatePipelineStageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  statusId: string; // Referência ao CustomLeadStatus

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

