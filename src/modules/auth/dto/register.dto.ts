import { IsEmail, IsString, MinLength, IsNotEmpty, IsUUID } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  companyId: string;
}

