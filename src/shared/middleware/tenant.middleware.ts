import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Pular middleware para rotas de uploads (arquivos estáticos)
    if (req.path.startsWith('/uploads')) {
      return next();
    }

    // Pular middleware para Socket.IO (WebSocket não usa middleware HTTP)
    // O Socket.IO gerencia suas próprias conexões via handshake
    if (req.path.startsWith('/socket.io/')) {
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);

      if (payload.companyId) {
        const company = await this.prisma.company.findUnique({
          where: { id: payload.companyId },
        });

        if (!company || !company.isActive) {
          throw new UnauthorizedException('Empresa não encontrada ou inativa');
        }

        req['tenant'] = company;
        req['user'] = payload;
      }
    } catch (error) {
      // Se houver erro na verificação do token, apenas continua
      // O guard JWT irá tratar a autenticação adequadamente
    }

    next();
  }
}

