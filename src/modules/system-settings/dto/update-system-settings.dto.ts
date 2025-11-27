import { IsString, IsOptional, MaxLength, ValidateIf } from 'class-validator';

export class UpdateSystemSettingsDto {
  @IsOptional()
  @ValidateIf((o) => o.crmName !== undefined && o.crmName !== null && o.crmName !== '')
  @IsString()
  @MaxLength(100)
  crmName?: string;

  @IsOptional()
  @ValidateIf((o) => o.slogan !== undefined && o.slogan !== null && o.slogan !== '')
  @IsString()
  @MaxLength(200)
  slogan?: string;

  @IsOptional()
  @ValidateIf((o) => o.version !== undefined && o.version !== null && o.version !== '')
  @IsString()
  @MaxLength(50)
  version?: string;
}

