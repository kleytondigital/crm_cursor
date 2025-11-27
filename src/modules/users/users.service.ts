import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // Verificar se o email já existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Um usuário com este email já existe');
    }

    // Verificar se a empresa existe
    const company = await this.prisma.company.findUnique({
      where: { id: createUserDto.companyId },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(companyId?: string, includeInactive = false) {
    const where: any = companyId ? { companyId } : {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Ordenar por nome da empresa manualmente
    return users.sort((a, b) => {
      const companyA = a.company?.name || '';
      const companyB = b.company?.name || '';
      if (companyA !== companyB) {
        return companyA.localeCompare(companyB);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async findOne(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const user = await this.prisma.user.findUnique({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            email: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              email: true,
              phone: true,
              document: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    } catch (error: any) {
      // Se a tabela não existe ou a coluna automationsEnabled não existe, tentar buscar sem a coluna
      if (error?.code === 'P2021' || error?.code === 'P2022' || error?.message?.includes('does not exist') || error?.message?.includes('automationsEnabled')) {
        console.warn('Tentando buscar usuário sem incluir campos opcionais:', error.message);
        
        // Tentar buscar apenas os campos essenciais do usuário
        try {
          const user = await this.prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              password: true,
              name: true,
              role: true,
              isActive: true,
              companyId: true,
              createdAt: true,
              updatedAt: true,
            },
          });
          
          if (!user) return null;
          
          // Buscar company separadamente se necessário, sem campos opcionais
          try {
            const company = await this.prisma.company.findUnique({
              where: { id: user.companyId },
              select: {
                id: true,
                name: true,
                slug: true,
                email: true,
                phone: true,
                document: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
            });
            
            return { ...user, company };
          } catch {
            return user;
          }
        } catch (fallbackError) {
          console.error('Erro ao buscar usuário:', fallbackError);
          return null;
        }
      }
      throw error;
    }
  }

  async findByCompany(companyId: string) {
    return this.prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserCompanyId?: string) {
    const user = await this.findOne(id);

    // Verificar se o usuário pertence à mesma empresa (se companyId foi fornecido)
    if (currentUserCompanyId && user.companyId !== currentUserCompanyId) {
      throw new ForbiddenException('Você não tem permissão para atualizar este usuário');
    }

    // Verificar se o email já existe (se está sendo atualizado)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Um usuário com este email já existe');
      }
    }

    // Verificar se a empresa existe (se está sendo atualizada)
    if (updateUserDto.companyId && updateUserDto.companyId !== user.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: updateUserDto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Empresa não encontrada');
      }
    }

    // Hash da senha se estiver sendo atualizada
    const data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async remove(id: string, currentUserCompanyId?: string) {
    const user = await this.findOne(id);

    // Verificar se o usuário pertence à mesma empresa (se companyId foi fornecido)
    if (currentUserCompanyId && user.companyId !== currentUserCompanyId) {
      throw new ForbiddenException('Você não tem permissão para remover este usuário');
    }

    // Soft delete - apenas desativa o usuário
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        companyId: true,
      },
    });
  }
}

