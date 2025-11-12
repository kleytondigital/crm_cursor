import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto) {
    // Bloquear criação de empresa com slug "sistema"
    if (createCompanyDto.slug === 'sistema') {
      throw new ForbiddenException('Não é permitido criar uma empresa com o slug "sistema"');
    }

    // Verificar se o slug já existe
    const existingCompany = await this.prisma.company.findUnique({
      where: { slug: createCompanyDto.slug },
    });

    if (existingCompany) {
      throw new ConflictException('Uma empresa com este slug já existe');
    }

    // Verificar se o email já existe (se fornecido)
    if (createCompanyDto.email) {
      const existingEmail = await this.prisma.company.findUnique({
        where: { email: createCompanyDto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Uma empresa com este email já existe');
      }
    }

    return this.prisma.company.create({
      data: createCompanyDto,
    });
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    
    return this.prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async findBySlug(slug: string) {
    const company = await this.prisma.company.findUnique({
      where: { slug },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findOne(id);

    // Empresa "Sistema" não pode ser editada (nome, slug, isActive) - apenas campos opcionais podem ser atualizados
    if (company.slug === 'sistema') {
      // Bloquear alteração de nome, slug e isActive
      if (updateCompanyDto.name || updateCompanyDto.slug) {
        throw new ForbiddenException('A empresa Sistema não pode ter nome ou slug alterados');
      }
      if (updateCompanyDto.isActive !== undefined && updateCompanyDto.isActive === false) {
        throw new ForbiddenException('A empresa Sistema não pode ser desativada');
      }
      // Permitir apenas atualização de campos opcionais (email, phone, document)
      // isActive sempre será true para empresa Sistema
      const allowedFields: any = {};
      if (updateCompanyDto.email !== undefined) {
        allowedFields.email = updateCompanyDto.email;
      }
      if (updateCompanyDto.phone !== undefined) {
        allowedFields.phone = updateCompanyDto.phone;
      }
      if (updateCompanyDto.document !== undefined) {
        allowedFields.document = updateCompanyDto.document;
      }
      // Se não houver campos para atualizar, retornar a empresa sem atualizar
      if (Object.keys(allowedFields).length === 0) {
        return company;
      }
      return this.prisma.company.update({
        where: { id },
        data: allowedFields,
      });
    }

    // Verificar se o slug já existe (se está sendo atualizado)
    if (updateCompanyDto.slug && updateCompanyDto.slug !== company.slug) {
      const existingCompany = await this.prisma.company.findUnique({
        where: { slug: updateCompanyDto.slug },
      });

      if (existingCompany) {
        throw new ConflictException('Uma empresa com este slug já existe');
      }
    }

    // Verificar se o email já existe (se está sendo atualizado)
    if (updateCompanyDto.email && updateCompanyDto.email !== company.email) {
      const existingEmail = await this.prisma.company.findUnique({
        where: { email: updateCompanyDto.email },
      });

      if (existingEmail) {
        throw new ConflictException('Uma empresa com este email já existe');
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
    });
  }

  async remove(id: string) {
    const company = await this.findOne(id);

    // Empresa "Sistema" não pode ser excluída ou desativada
    if (company.slug === 'sistema') {
      throw new ForbiddenException('A empresa Sistema não pode ser excluída ou desativada');
    }

    // Soft delete - apenas desativa a empresa
    return this.prisma.company.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

