import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { RolesGuard } from '@/shared/guards/roles.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AssignDepartmentUserDto } from './dto/assign-department-user.dto';
import { Roles } from '@/shared/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async list(@CurrentUser() user: any) {
    const data = await this.departmentsService.listDepartments(
      user.companyId,
    );
    return { success: true, data };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.departmentsService.createDepartment(dto, {
      tenantId: user.companyId,
      userId: user.id,
    });
    return { success: true, data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.departmentsService.updateDepartment(id, dto, {
      tenantId: user.companyId,
      userId: user.id,
    });
    return { success: true, data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const data = await this.departmentsService.deleteDepartment(id, {
      tenantId: user.companyId,
      userId: user.id,
    });
    return { success: true, data };
  }

  @Post(':id/users')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async assignUser(
    @Param('id') id: string,
    @Body() dto: AssignDepartmentUserDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.departmentsService.assignUser(id, dto, {
      tenantId: user.companyId,
      userId: user.id,
    });
    return { success: true, data };
  }

  @Delete(':id/users/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.departmentsService.removeUser(id, userId, {
      tenantId: user.companyId,
      userId: user.id,
    });
    return { success: true, data };
  }
}




