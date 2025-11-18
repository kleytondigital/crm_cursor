import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { AttendanceTransferDto } from './dto/attendance-transfer.dto';
import { AttendanceCloseDto } from './dto/attendance-close.dto';
import { AttendancePriorityDto } from './dto/attendance-priority.dto';
import { AttendanceClaimDto } from './dto/attendance-claim.dto';
import { Roles } from '@/shared/decorators/roles.decorator';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { UserRole } from '@prisma/client';

@Controller('attendances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Get()
  async listAttendances(
    @Query() filters: AttendanceFilterDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.attendancesService.listAttendances(filters, {
      tenantId: user.companyId,
      userId: user.id, // Usar user.id em vez de user.sub
      role: user.role,
    });
    return { success: true, data };
  }

  @Get('stats')
  async stats(@CurrentUser() user: any) {
    const data = await this.attendancesService.getStats({
      tenantId: user.companyId,
      userId: user.id, // Usar user.id em vez de user.sub
      role: user.role,
    });
    return { success: true, data };
  }

  @Get('queue/next')
  async smartQueue(@CurrentUser() user: any) {
    const data = await this.attendancesService.getSmartQueue({
      tenantId: user.companyId,
      userId: user.id, // Usar user.id em vez de user.sub
      role: user.role,
    });
    return { success: true, data };
  }

  @Get('departments')
  async getUserDepartments(@CurrentUser() user: any) {
    // Endpoint para listar departamentos do usuário (útil para seleção quando tem múltiplos departamentos)
    const data = await this.attendancesService.getUserDepartments({
      tenantId: user.companyId,
      userId: user.id, // Usar user.id em vez de user.sub
      role: user.role,
    });
    return { success: true, data };
  }

  @Get('lead/:leadId')
  async getByLead(@Param('leadId') leadId: string, @CurrentUser() user: any) {
    const data = await this.attendancesService.getAttendancesByLead(leadId, {
      tenantId: user.companyId,
      userId: user.id,
      role: user.role,
    });
    return { success: true, data };
  }

  @Get(':id')
  async details(@Param('id') id: string, @CurrentUser() user: any) {
    // IMPORTANTE: Esta rota deve vir DEPOIS das rotas específicas (stats, queue/next, departments)
    // para evitar que "departments" seja interpretado como um ID
    const data = await this.attendancesService.getAttendance(id, {
      tenantId: user.companyId,
      userId: user.id, // Usar user.id em vez de user.sub
      role: user.role,
    });
    return { success: true, data };
  }

  @Post('lead/:leadId/claim')
  async claim(
    @Param('leadId') leadId: string,
    @CurrentUser() user: any,
    @Body() dto: AttendanceClaimDto,
  ) {
    const data = await this.attendancesService.claimAttendance(
      leadId,
      dto,
      {
        tenantId: user.companyId,
        userId: user.id, // Usar user.id em vez de user.sub
        role: user.role,
      },
    );
    return { success: true, data };
  }

  @Post(':id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body() dto: AttendanceTransferDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.attendancesService.transferAttendance(
      id,
      dto,
      {
        tenantId: user.companyId,
        userId: user.id, // Usar user.id em vez de user.sub
        role: user.role,
      },
    );
    return { success: true, data };
  }

  @Post(':id/close')
  async close(
    @Param('id') id: string,
    @Body() dto: AttendanceCloseDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.attendancesService.closeAttendance(id, dto, {
      tenantId: user.companyId,
      userId: user.id, // Usar user.id em vez de user.sub
      role: user.role,
    });
    return { success: true, data };
  }

  @Patch(':id/priority')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER)
  async changePriority(
    @Param('id') id: string,
    @Body() dto: AttendancePriorityDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.attendancesService.updatePriority(id, dto, {
      tenantId: user.companyId,
      userId: user.id, // Usar user.id em vez de user.sub
      role: user.role,
    });
    return { success: true, data };
  }

  @Post('sync')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async syncLeadsWithAttendances(@CurrentUser() user: any) {
    const data = await this.attendancesService.syncLeadsWithAttendances({
      tenantId: user.companyId,
      userId: user.id, // Usar user.id em vez de user.sub
      role: user.role,
    });
    return { success: true, data };
  }
}

