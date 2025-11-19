import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se a rota é pública, pular autenticação JWT
    if (isPublic) {
      // Verificar se tem API Key - se tiver, deixar o ApiKeyGuard tratar
      const hasApiKey = request.headers['x-api-key'] || request.headers['X-API-Key'];
      if (hasApiKey) {
        console.log('[JwtAuthGuard] Rota pública com API Key, pulando autenticação JWT');
      }
      return true;
    }

    return super.canActivate(context);
  }
}

