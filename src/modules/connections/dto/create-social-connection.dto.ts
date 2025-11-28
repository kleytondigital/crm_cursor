import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum SocialProvider {
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
}

export class CreateSocialConnectionDto {
  @IsEnum(SocialProvider)
  @IsNotEmpty()
  provider: SocialProvider;

  @IsString()
  @IsNotEmpty()
  name: string;
}

