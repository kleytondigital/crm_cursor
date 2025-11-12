import { IsEmail, IsString, MinLength, IsNotEmpty, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
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

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

