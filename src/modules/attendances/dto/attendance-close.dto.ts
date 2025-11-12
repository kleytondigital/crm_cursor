import { IsOptional, Length } from 'class-validator';

export class AttendanceCloseDto {
  @IsOptional()
  @Length(0, 500, { message: 'Notas devem ter até 500 caracteres' })
  notes?: string;
}




