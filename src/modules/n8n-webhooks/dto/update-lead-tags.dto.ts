import { IsArray, IsString, IsEnum } from 'class-validator';

export class UpdateLeadTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsEnum(['add', 'remove', 'replace'])
  action: 'add' | 'remove' | 'replace';
}

