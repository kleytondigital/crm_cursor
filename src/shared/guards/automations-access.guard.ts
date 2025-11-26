import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';

@Injectable()
export class AutomationsAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    // Super admin tem acesso total
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!user.companyId) {
      throw new UnauthorizedException('Tenant (empresa) não identificado.');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { automationsEnabled: true },
    });

    return company?.automationsEnabled ?? false;
  }
}

