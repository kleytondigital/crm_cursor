import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Usuário inativo');
      }

      const { password: _, ...result } = user;
      return result;
    } catch (error: any) {
      // Verificar se é erro de tabela não encontrada
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        throw new UnauthorizedException('Banco de dados não configurado. Execute as migrations primeiro.');
      }
      // Re-lançar outros erros (incluindo UnauthorizedException)
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);

      const payload = {
        email: user.email,
        sub: user.id,
        companyId: user.companyId,
        role: user.role,
      };

      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
        },
      };
    } catch (error: any) {
      // Verificar se é erro de tabela não encontrada
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        throw new UnauthorizedException('Banco de dados não configurado. Execute as migrations primeiro.');
      }
      // Re-lançar outros erros
      throw error;
    }
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // O método create já retorna sem a senha, então não precisamos removê-la
    const payload = {
      email: user.email,
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: user,
    };
  }
}

