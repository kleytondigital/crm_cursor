import { IsOptional, IsString, Length } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}




