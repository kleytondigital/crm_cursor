import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AssignDepartmentUserDto } from './dto/assign-department-user.dto';

interface AuthContext {
  tenantId: string;
  userId: string;
}

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDepartments(tenantId: string) {
    const departments = await this.prisma.department.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        memberships: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return departments.map((department) => ({
      id: department.id,
      name: department.name,
      description: department.description,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      users: department.memberships.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        joinedAt: member.createdAt,
      })),
    }));
  }

  async createDepartment(
    dto: CreateDepartmentDto,
    context: AuthContext,
  ) {
    const existing = await this.prisma.department.findFirst({
      where: { tenantId: context.tenantId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Já existe um departamento com este nome');
    }

    // Criar o departamento e adicionar o usuário admin automaticamente
    const department = await this.prisma.department.create({
      data: {
        tenantId: context.tenantId,
        name: dto.name,
        description: dto.description,
        memberships: {
          create: {
            userId: context.userId,
            role: 'ADMIN',
          },
        },
      },
      include: {
        memberships: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return {
      id: department.id,
      name: department.name,
      description: department.description,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      users: department.memberships.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        joinedAt: member.createdAt,
      })),
    };
  }

  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
    context: AuthContext,
  ) {
    const department = await this.ensureDepartment(id, context.tenantId);

    if (dto.name && dto.name !== department.name) {
      const existing = await this.prisma.department.findFirst({
        where: {
          tenantId: context.tenantId,
          name: dto.name,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException('Já existe um departamento com este nome');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name ?? department.name,
        description:
          dto.description !== undefined
            ? dto.description
            : department.description,
      },
    });
  }

  async deleteDepartment(id: string, context: AuthContext) {
    await this.ensureDepartment(id, context.tenantId);

    await this.prisma.$transaction([
      this.prisma.departmentUser.deleteMany({
        where: { departmentId: id },
      }),
      this.prisma.attendance.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      }),
      this.prisma.department.delete({ where: { id } }),
    ]);

    return { deleted: true };
  }

  async assignUser(
    departmentId: string,
    dto: AssignDepartmentUserDto,
    context: AuthContext,
  ) {
    await this.ensureDepartment(departmentId, context.tenantId);

    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, companyId: context.tenantId },
    });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado no tenant');
    }

    const existing = await this.prisma.departmentUser.findFirst({
      where: { departmentId, userId: dto.userId },
    });

    if (existing) {
      return this.prisma.departmentUser.update({
        where: { id: existing.id },
        data: { role: dto.role },
      });
    }

    return this.prisma.departmentUser.create({
      data: {
        departmentId,
        userId: dto.userId,
        role: dto.role,
      },
    });
  }

  async removeUser(
    departmentId: string,
    userId: string,
    context: AuthContext,
  ) {
    await this.ensureDepartment(departmentId, context.tenantId);

    await this.prisma.departmentUser.deleteMany({
      where: { departmentId, userId },
    });

    await this.prisma.attendance.updateMany({
      where: {
        departmentId,
        assignedUserId: userId,
      },
      data: {
        assignedUserId: null,
        status: AttendanceStatus.TRANSFERRED,
      },
    });

    return { removed: true };
  }

  private async ensureDepartment(id: string, tenantId: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, tenantId },
    });
    if (!department) {
      throw new NotFoundException('Departamento não encontrado');
    }
    return department;
  }
}

