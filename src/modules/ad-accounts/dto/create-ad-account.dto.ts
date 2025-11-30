import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAdAccountDto {
  @IsString()
  @IsNotEmpty()
  connectionId: string;

  @IsString()
  @IsNotEmpty()
  adAccountId: string; // act_123456789
}

