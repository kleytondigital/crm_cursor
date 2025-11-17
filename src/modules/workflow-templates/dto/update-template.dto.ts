import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowTemplateDto } from './create-template.dto';

export class UpdateWorkflowTemplateDto extends PartialType(CreateWorkflowTemplateDto) {}

