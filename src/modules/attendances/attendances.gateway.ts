import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false, // Não enviar credenciais (pode causar problemas com CORS)
  },
  namespace: '/attendances',
  transports: ['polling', 'websocket'], // Permitir polling e websocket
  allowEIO3: true, // Permitir cliente Socket.IO v3
  pingTimeout: 60000, // Timeout de ping (60 segundos)
  pingInterval: 25000, // Intervalo de ping (25 segundos)
})
export class AttendancesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AttendancesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const authHeader = client.handshake.headers.authorization;
      const authToken = client.handshake.auth?.token as string | undefined;
      let token: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (authToken && authToken.startsWith('Bearer ')) {
        token = authToken.substring(7);
      } else if (authToken) {
        token = authToken;
      } else {
        token = client.handshake.query.token as string;
      }

      if (!token) {
        this.logger.warn('Conexão rejeitada: token não fornecido');
        client.disconnect();
        return;
      }

      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        client.data.user = payload;
        client.data.tenantId = payload.companyId;
      } catch (error) {
        this.logger.warn('Conexão rejeitada: token inválido ou expirado');
        client.disconnect();
        return;
      }

      const tenantId = client.data.tenantId;
      if (!tenantId) {
        this.logger.warn('Conexão rejeitada: tenant não encontrado');
        client.disconnect();
        return;
      }

      client.join(`tenant:${tenantId}`);
      this.logger.log(`Cliente conectado ao atendimento: ${client.id}`);
    } catch (error) {
      this.logger.error(`Erro na conexão de atendimento: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const tenantId = client.data.tenantId;
    if (tenantId) {
      client.leave(`tenant:${tenantId}`);
    }
    this.logger.log(`Cliente desconectado do atendimento: ${client.id}`);
  }
}




