import { IsEnum } from 'class-validator';
import { AttendancePriority } from '@prisma/client';

export class UpdateAttendancePriorityDto {
  @IsEnum(AttendancePriority)
  priority: AttendancePriority;
}

