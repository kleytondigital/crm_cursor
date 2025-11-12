import { IsOptional, IsUUID, Length } from 'class-validator';

export class AttendanceClaimDto {
  @IsOptional()
  @Length(0, 500, { message: 'Notas devem ter até 500 caracteres' })
  notes?: string;

  @IsOptional()
  @IsUUID({ message: 'ID do departamento deve ser um UUID válido' })
  departmentId?: string;
}

