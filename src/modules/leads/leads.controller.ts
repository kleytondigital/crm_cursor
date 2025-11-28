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

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() createLeadDto: CreateLeadDto, @CurrentUser() user: any) {
    return this.leadsService.create(createLeadDto, user.companyId);
  }

  @Get()
  findAll(
    @Query('status') status: string,
    @Query('statusId') statusId: string,
    @CurrentUser() user: any,
  ) {
    // Usar user.id (retornado pelo JwtStrategy) em vez de user.sub
    return this.leadsService.findAll(user.companyId, status, statusId, user.id, user.role);
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
    // Se o statusId estiver no body, usar o método de atualização de statusId
    if ((updateLeadDto as any).statusId !== undefined) {
      return this.leadsService.updateStatusId(id, (updateLeadDto as any).statusId, user.companyId);
    }
    return this.leadsService.update(id, updateLeadDto, user.companyId);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @CurrentUser() user: any,
  ) {
    return this.leadsService.updateStatus(id, status, user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.leadsService.remove(id, user.companyId);
  }
}

