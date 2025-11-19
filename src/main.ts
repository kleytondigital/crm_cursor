import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Habilitar CORS
  app.enableCors({
    origin: true,
    credentials: false, // Não enviar credenciais (pode causar problemas com WebSocket)
    exposedHeaders: ['Content-Range', 'Accept-Ranges'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'X-API-Key', 'x-api-key'],
  });

  // Guard JWT global (rotas públicas usam @Public() decorator)
  // Arquivos estáticos são servidos pelo FilesController com @Public()
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Filter global para tratamento de erros
  app.useGlobalFilters(new HttpExceptionFilter());

  // Interceptor global para serialização
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );


  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 B2X CRM está rodando na porta ${port}`);
}

bootstrap();
