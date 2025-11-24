import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeadStatusService } from './lead-status.service';
import { CreateLeadStatusDto } from './dto/create-lead-status.dto';
import { UpdateLeadStatusDto, UpdateLeadStatusOrderDto } from './dto/update-lead-status.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('lead-status')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class LeadStatusController {
  constructor(private readonly leadStatusService: LeadStatusService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: any, @Body() createLeadStatusDto: CreateLeadStatusDto) {
    return this.leadStatusService.create(createLeadStatusDto, user.companyId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(@CurrentUser() user: any) {
    return this.leadStatusService.findAll(user.companyId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.leadStatusService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateLeadStatusDto: UpdateLeadStatusDto,
  ) {
    return this.leadStatusService.update(id, updateLeadStatusDto, user.companyId);
  }

  @Patch(':id/order')
  @HttpCode(HttpStatus.OK)
  updateOrder(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateLeadStatusOrderDto,
  ) {
    return this.leadStatusService.updateOrder(id, updateOrderDto, user.companyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.leadStatusService.remove(id, user.companyId);
  }
}

