import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/scheduler',
})
export class SchedulerGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SchedulerGateway.name);
  private readonly connectedClients = new Map<string, Set<string>>(); // tenantId -> Set<socketId>

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extrair token do header, query ou auth
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
        this.logger.warn(`Conexão rejeitada: token não fornecido`);
        client.disconnect();
        return;
      }

      // Verificar token JWT
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });

        // Adicionar informações do usuário ao socket
        client.data.user = payload;
        client.data.tenantId = payload.companyId;
      } catch (error) {
        this.logger.warn(`Conexão rejeitada: token inválido ou expirado`);
        client.disconnect();
        return;
      }

      const user = client.data.user;
      const tenantId = client.data.tenantId;

      if (!user || !tenantId) {
        this.logger.warn(`Conexão rejeitada: usuário ou tenant não encontrado`);
        client.disconnect();
        return;
      }

      // Adicionar cliente à lista de conectados do tenant
      if (!this.connectedClients.has(tenantId)) {
        this.connectedClients.set(tenantId, new Set());
      }
      this.connectedClients.get(tenantId).add(client.id);

      // Entrar em uma sala específica do tenant para broadcast
      client.join(`tenant:${tenantId}`);

      this.logger.log(
        `Cliente conectado ao scheduler: ${client.id} - Usuário: ${user.email} - Tenant: ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(`Erro na conexão: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user;
    const tenantId = client.data.tenantId;

    if (tenantId && this.connectedClients.has(tenantId)) {
      this.connectedClients.get(tenantId).delete(client.id);

      if (this.connectedClients.get(tenantId).size === 0) {
        this.connectedClients.delete(tenantId);
      }
    }

    this.logger.log(`Cliente desconectado do scheduler: ${client.id}`);
  }

  // Método público para emitir eventos de mensagem agendada enviada
  emitScheduledMessageSent(tenantId: string, message: any) {
    const payload = {
      message,
      timestamp: new Date().toISOString(),
    };

    this.server.to(`tenant:${tenantId}`).emit('scheduled:sent', payload);
  }

  // Método público para emitir eventos de mensagem agendada atualizada
  emitScheduledMessageUpdated(tenantId: string, message: any) {
    const payload = {
      message,
      timestamp: new Date().toISOString(),
    };

    this.server.to(`tenant:${tenantId}`).emit('scheduled:updated', payload);
  }

  // Método público para emitir eventos de campanha atualizada
  emitCampaignUpdated(tenantId: string, campaign: any) {
    const payload = {
      campaign,
      timestamp: new Date().toISOString(),
    };

    this.server.to(`tenant:${tenantId}`).emit('campaign:updated', payload);
  }
}




