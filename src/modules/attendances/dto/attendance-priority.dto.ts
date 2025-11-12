import { AttendancePriority } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class AttendancePriorityDto {
  @IsEnum(AttendancePriority, { message: 'priority inválida' })
  priority: AttendancePriority;
}




