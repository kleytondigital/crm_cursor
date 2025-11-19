import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super({
      // Desabilitar redirects do Passport
      session: false,
    });
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se a rota é pública, pular autenticação JWT completamente
    if (isPublic) {
      const request = context.switchToHttp().getRequest();
      const hasApiKey = request.headers['x-api-key'] || request.headers['X-API-Key'];
      if (hasApiKey) {
        console.log('[JwtAuthGuard] Rota pública com API Key, pulando autenticação JWT');
      }
      // Retornar true diretamente, sem chamar super.canActivate()
      // Isso evita que o Passport tente autenticar e cause redirecionamentos
      return true;
    }

    // Para rotas não públicas, usar autenticação JWT normal
    return super.canActivate(context);
  }

  // Sobrescrever handleRequest para evitar erros de redirect
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Se a rota é pública, não processar erros do Passport
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return user;
    }

    // Para rotas não públicas, usar comportamento padrão
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }
    return user;
  }
}

