import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { Public } from '@/shared/decorators/public.decorator';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto, @CurrentUser() user: any) {
    // Apenas SUPER_ADMIN pode criar empresas
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Apenas super administradores podem criar empresas');
    }
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    // Apenas SUPER_ADMIN pode listar todas as empresas (para gestão SaaS)
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Apenas super administradores podem acessar esta rota');
    }
    // Incluir empresas inativas para gestão completa
    return this.companiesService.findAll(true);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Apenas SUPER_ADMIN pode ver detalhes de qualquer empresa
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Apenas super administradores podem acessar esta rota');
    }
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto, @CurrentUser() user: any) {
    // Apenas SUPER_ADMIN pode atualizar empresas
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Apenas super administradores podem atualizar empresas');
    }
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    // Apenas SUPER_ADMIN pode desativar empresas
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Apenas super administradores podem desativar empresas');
    }
    return this.companiesService.remove(id);
  }
}

