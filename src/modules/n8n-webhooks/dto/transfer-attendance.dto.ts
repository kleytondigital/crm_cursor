import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AttendancePriority } from '@prisma/client';

export class TransferAttendanceDepartmentDto {
  @IsString()
  departmentId: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(AttendancePriority)
  priority?: AttendancePriority;
}

export class TransferAttendanceUserDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(AttendancePriority)
  priority?: AttendancePriority;
}

