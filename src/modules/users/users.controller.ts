import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: any) {
    // Apenas SUPER_ADMIN pode criar usuários com role SUPER_ADMIN
    if (createUserDto.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Apenas super administradores podem criar outros super administradores');
    }
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    // Se o usuário for SUPER_ADMIN, retorna todos os usuários incluindo inativos (para gestão SaaS)
    // Caso contrário, retorna apenas usuários ativos da mesma empresa
    if (user.role === 'SUPER_ADMIN') {
      return this.usersService.findAll(undefined, true); // Retorna todos os usuários de todas as empresas, incluindo inativos
    }
    return this.usersService.findByCompany(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Se o usuário não for admin, verifica se pertence à mesma empresa
    if (user.role !== 'ADMIN') {
      return this.usersService.findOne(id, user.companyId);
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    // Se o usuário não for admin, só pode atualizar usuários da mesma empresa
    const companyId = user.role !== 'ADMIN' ? user.companyId : undefined;
    return this.usersService.update(id, updateUserDto, companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    // Se o usuário não for admin, só pode remover usuários da mesma empresa
    const companyId = user.role !== 'ADMIN' ? user.companyId : undefined;
    return this.usersService.remove(id, companyId);
  }
}

