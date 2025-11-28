import { PartialType } from '@nestjs/mapped-types';
import { CreateBulkCampaignDto } from './create-bulk-campaign.dto';

export class UpdateBulkCampaignDto extends PartialType(CreateBulkCampaignDto) {}

