import { DepartmentUserRole } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class AssignDepartmentUserDto {
  @IsUUID('4', { message: 'userId inválido' })
  userId: string;

  @IsEnum(DepartmentUserRole, { message: 'role inválida' })
  role: DepartmentUserRole;
}




