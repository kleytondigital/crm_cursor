import { AttendancePriority } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class AttendanceTransferDto {
  @IsOptional()
  @IsUUID('4', { message: 'targetUserId inválido' })
  targetUserId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'targetDepartmentId inválido' })
  targetDepartmentId?: string;

  @IsOptional()
  @Length(0, 500, { message: 'Notas devem ter até 500 caracteres' })
  notes?: string;

  @IsOptional()
  @IsEnum(AttendancePriority, { message: 'priority inválida' })
  priority?: AttendancePriority;
}

