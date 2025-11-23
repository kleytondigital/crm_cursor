import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsFilterDto } from './dto/reports-filter.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getOverview(
    @CurrentUser() user: any,
    @Query() filters: ReportsFilterDto,
  ) {
    return this.reportsService.getOverview(user.companyId, filters);
  }

  @Get('leads')
  @HttpCode(HttpStatus.OK)
  async getLeads(
    @CurrentUser() user: any,
    @Query() filters: ReportsFilterDto,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
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
    @Query() filters: ReportsFilterDto,
  ) {
    return this.reportsService.getConversion(user.companyId, filters);
  }

  @Get('attendance')
  @HttpCode(HttpStatus.OK)
  async getAttendance(
    @CurrentUser() user: any,
    @Query() filters: ReportsFilterDto,
  ) {
    return this.reportsService.getAttendance(user.companyId, filters);
  }

  @Get('campaigns')
  @HttpCode(HttpStatus.OK)
  async getCampaigns(
    @CurrentUser() user: any,
    @Query() filters: ReportsFilterDto,
  ) {
    return this.reportsService.getCampaigns(user.companyId, filters);
  }

  @Get('journey')
  @HttpCode(HttpStatus.OK)
  async getJourney(
    @CurrentUser() user: any,
    @Query() filters: ReportsFilterDto,
  ) {
    return this.reportsService.getJourney(user.companyId, filters);
  }

  @Get('messages')
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @CurrentUser() user: any,
    @Query() filters: ReportsFilterDto,
  ) {
    return this.reportsService.getMessages(user.companyId, filters);
  }

  @Get('scheduled')
  @HttpCode(HttpStatus.OK)
  async getScheduled(
    @CurrentUser() user: any,
    @Query() filters: ReportsFilterDto,
  ) {
    return this.reportsService.getScheduled(user.companyId, filters);
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  async export(
    @CurrentUser() user: any,
    @Query() filters: ReportsFilterDto,
    @Query('format') format: 'csv' | 'excel' = 'csv',
  ) {
    // TODO: Implementar exportação
    return { message: 'Exportação em desenvolvimento' };
  }
}

