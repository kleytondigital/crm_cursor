import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsHexColor } from 'class-validator';

export class CreateLeadStatusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

