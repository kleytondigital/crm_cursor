import { IsOptional, IsUUID, Length } from 'class-validator';

export class AttendanceClaimDto {
  @IsOptional()
  @Length(0, 500, { message: 'Notas devem ter até 500 caracteres' })
  notes?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

