import { IsString, IsOptional } from 'class-validator';

export class CloseAttendanceDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

