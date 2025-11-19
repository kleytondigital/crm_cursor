import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { LeadStatus } from '@prisma/client';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() createLeadDto: CreateLeadDto, @CurrentUser() user: any) {
    return this.leadsService.create(createLeadDto, user.companyId);
  }

  @Get()
  findAll(@Query('status') status: LeadStatus, @CurrentUser() user: any) {
    // Usar user.id (retornado pelo JwtStrategy) em vez de user.sub
    return this.leadsService.findAll(user.companyId, status, user.id, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leadsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser() user: any,
  ) {
    // Se o status estiver no body, usar o método de atualização de status
    if (updateLeadDto.status) {
      return this.leadsService.updateStatus(id, updateLeadDto.status, user.companyId);
    }
    return this.leadsService.update(id, updateLeadDto, user.companyId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: LeadStatus,
    @CurrentUser() user: any,
  ) {
    return this.leadsService.updateStatus(id, status, user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leadsService.remove(id, user.companyId);
  }
}

