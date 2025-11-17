import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowInstanceDto } from './create-instance.dto';

export class UpdateWorkflowInstanceDto extends PartialType(CreateWorkflowInstanceDto) {}

