import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSocialConnectionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

