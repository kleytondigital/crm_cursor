import { IsNotEmpty, IsString, IsArray, IsEnum, ArrayMinSize } from 'class-validator';

export enum MetaService {
  WHATSAPP_API = 'WHATSAPP_API',
  INSTAGRAM_DIRECT = 'INSTAGRAM_DIRECT',
  FACEBOOK_MESSENGER = 'FACEBOOK_MESSENGER',
  META_ADS = 'META_ADS',
}

export class CreateMetaApiConnectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione pelo menos um serviço' })
  @IsEnum(MetaService, { each: true })
  services: MetaService[];
}

