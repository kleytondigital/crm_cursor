import { IsString } from 'class-validator';

export class UpdateLeadNameDto {
  @IsString()
  name: string;
}

