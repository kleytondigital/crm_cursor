import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BulkMessagingService } from './bulk-messaging.service';
import { CreateBulkCampaignDto } from './dto/create-bulk-campaign.dto';
import { UpdateBulkCampaignDto } from './dto/update-bulk-campaign.dto';
import { BulkCampaignFilterDto } from './dto/bulk-campaign-filter.dto';
import { BulkLogFilterDto } from './dto/bulk-log-filter.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@Controller('bulk-messaging')
@UseGuards(JwtAuthGuard)
export class BulkMessagingController {
  constructor(private readonly bulkMessagingService: BulkMessagingService) {}

  @Post()
  async create(
    @Body() createBulkCampaignDto: CreateBulkCampaignDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.bulkMessagingService.create(
      createBulkCampaignDto,
      user.companyId,
      user.id,
    );
    return { success: true, data };
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadRecipients(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /(application\/vnd\.(ms-excel|openxmlformats-officedocument\.spreadsheetml\.sheet)|application\/vnd\.ms-excel\.sheet\.macroEnabled\.12)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const data = await this.bulkMessagingService.uploadRecipients(
      id,
      file,
      user.companyId,
    );
    return data;
  }

  @Get()
  async list(
    @Query() filters: BulkCampaignFilterDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.bulkMessagingService.list(filters, user.companyId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.bulkMessagingService.findOne(id, user.companyId);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBulkCampaignDto: UpdateBulkCampaignDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.bulkMessagingService.update(
      id,
      updateBulkCampaignDto,
      user.companyId,
    );
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.bulkMessagingService.remove(id, user.companyId);
    return data;
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.bulkMessagingService.start(id, user.companyId);
    return data;
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.bulkMessagingService.pause(id, user.companyId);
    return data;
  }

  @Post(':id/resume')
  async resume(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.bulkMessagingService.resume(id, user.companyId);
    return data;
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.bulkMessagingService.cancel(id, user.companyId);
    return data;
  }

  @Get(':id/recipients')
  async listRecipients(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.bulkMessagingService.listRecipients(
      id,
      user.companyId,
    );
    return { success: true, data };
  }

  @Get(':id/logs')
  async listLogs(
    @Param('id') id: string,
    @Query() filters: BulkLogFilterDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.bulkMessagingService.listLogs(
      id,
      filters,
      user.companyId,
    );
    return { success: true, data };
  }
}

