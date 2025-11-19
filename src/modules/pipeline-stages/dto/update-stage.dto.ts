import { PartialType } from '@nestjs/mapped-types';
import { CreatePipelineStageDto } from './create-stage.dto';

export class UpdatePipelineStageDto extends PartialType(CreatePipelineStageDto) {}

