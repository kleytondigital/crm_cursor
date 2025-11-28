import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  state?: string; // Pode conter tenantId e provider
}

