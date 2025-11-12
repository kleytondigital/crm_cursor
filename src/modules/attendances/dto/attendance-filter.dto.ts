import { AttendancePriority, AttendanceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, IsBooleanString } from 'class-validator';

export class AttendanceFilterDto {
  @IsOptional()
  @IsEnum(AttendanceStatus, {
    message: 'status inválido',
  })
  status?: AttendanceStatus;

  @IsOptional()
  @IsEnum(AttendancePriority, {
    message: 'priority inválida',
  })
  priority?: AttendancePriority;

  @IsOptional()
  @IsUUID('4', { message: 'departmentId inválido' })
  departmentId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'assignedUserId inválido' })
  assignedUserId?: string;

  @IsOptional()
  @IsBooleanString()
  urgent?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'leadId inválido' })
  leadId?: string;
}

