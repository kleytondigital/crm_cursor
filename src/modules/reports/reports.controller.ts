import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseArrayPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportsExportService } from './reports-export.service';
import { ReportsFilterDto } from './dto/reports-filter.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { UserRole, LeadStatus } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsExportService: ReportsExportService,
  ) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getOverview(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getOverview(user.companyId, filters);
  }

  @Get('leads')
  @HttpCode(HttpStatus.OK)
  async getLeads(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getLeads(
      user.companyId,
      filters,
      period || 'day',
    );
  }

  @Get('conversion')
  @HttpCode(HttpStatus.OK)
  async getConversion(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getConversion(user.companyId, filters);
  }

  @Get('attendance')
  @HttpCode(HttpStatus.OK)
  async getAttendance(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getAttendance(user.companyId, filters);
  }

  @Get('campaigns')
  @HttpCode(HttpStatus.OK)
  async getCampaigns(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getCampaigns(user.companyId, filters);
  }

  @Get('journey')
  @HttpCode(HttpStatus.OK)
  async getJourney(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getJourney(user.companyId, filters);
  }

  @Get('messages')
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getMessages(user.companyId, filters);
  }

  @Get('scheduled')
  @HttpCode(HttpStatus.OK)
  async getScheduled(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getScheduled(user.companyId, filters);
  }

  @Get('leads/detail')
  @HttpCode(HttpStatus.OK)
  async getLeadsDetail(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getLeadsDetail(
      user.companyId,
      filters,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('attendances/detail')
  @HttpCode(HttpStatus.OK)
  async getAttendancesDetail(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getAttendancesDetail(
      user.companyId,
      filters,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('messages/detail')
  @HttpCode(HttpStatus.OK)
  async getMessagesDetail(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };
    return this.reportsService.getMessagesDetail(
      user.companyId,
      filters,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get('export')
  async export(
    @CurrentUser() user: any,
    @Res({ passthrough: false }) res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('origin') origin?: string,
    @Query('status', new ParseArrayPipe({ items: String, optional: true })) status?: string[],
    @Query('converted') converted?: string,
    @Query('format') format?: 'csv' | 'excel',
  ) {
    const filters: ReportsFilterDto = {
      startDate,
      endDate,
      userId,
      campaignId,
      origin,
      status: status as LeadStatus[],
      converted: converted === 'true' ? true : converted === 'false' ? false : undefined,
    };

    const exportFormat = format || 'csv';
    if (exportFormat === 'excel') {
      await this.reportsExportService.exportToExcel(user.companyId, filters, res);
    } else {
      await this.reportsExportService.exportToCSV(user.companyId, filters, res);
    }
  }
}

