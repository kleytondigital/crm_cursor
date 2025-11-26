import { IsBoolean } from 'class-validator';

export class UpdateCompanyAutomationsDto {
  @IsBoolean()
  automationsEnabled: boolean;
}

