import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { WsJwtGuard } from '@/shared/guards/ws-jwt.guard';
import { WsUser } from '@/shared/decorators/ws-user.decorator';
import { WsTenant } from '@/shared/decorators/ws-tenant.decorator';
import { Logger, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { SenderType } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false, // Não enviar credenciais (pode causar problemas com CORS)
  },
  namespace: '/messages',
  transports: ['polling', 'websocket'], // Permitir polling e websocket
  allowEIO3: true, // Permitir cliente Socket.IO v3
  pingTimeout: 60000, // Timeout de ping (60 segundos)
  pingInterval: 25000, // Intervalo de ping (25 segundos)
})
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private readonly connectedClients = new Map<string, Set<string>>(); // tenantId -> Set<socketId>

  constructor(
    private readonly messagesService: MessagesService,
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
        `Cliente conectado: ${client.id} - Usuário: ${user.email} - Tenant: ${tenantId}`,
      );

      // Notificar outros clientes do mesmo tenant
      client.to(`tenant:${tenantId}`).emit('user:connected', {
        userId: user.sub,
        email: user.email,
      });
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

    this.logger.log(`Cliente desconectado: ${client.id}`);

    if (user && tenantId) {
      // Notificar outros clientes do mesmo tenant
      client.to(`tenant:${tenantId}`).emit('user:disconnected', {
        userId: user.sub,
        email: user.email,
      });
    }
  }

  @SubscribeMessage('message:send')
  @UseGuards(WsJwtGuard)
  async handleMessage(
    @MessageBody() createMessageDto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
    @WsUser() user: any,
    @WsTenant() tenantId: string,
  ) {
    try {
      // Validar que o senderType é USER (apenas usuários autenticados podem enviar via WebSocket)
      if (createMessageDto.senderType !== SenderType.USER) {
        client.emit('message:error', {
          success: false,
          error: 'Apenas usuários autenticados podem enviar mensagens via WebSocket',
        });
        return;
      }

      // Criar a mensagem (validações de tenant e permissões são feitas no service)
      const message = await this.messagesService.create(
        createMessageDto,
        tenantId,
        user.sub,
        user.role,
      );

      // Emitir a nova mensagem para todos os clientes do mesmo tenant
      // e também para clientes na sala da conversa específica
      const messagePayload = {
        message,
        conversation: message.conversation,
        sender: {
          id: user.sub,
          email: user.email,
          name: user.name || user.email,
          role: user.role,
        },
        timestamp: new Date().toISOString(),
      };

      // Broadcast para o tenant inteiro
      this.server.to(`tenant:${tenantId}`).emit('message:new', messagePayload);

      // Broadcast específico para a conversa (caso clientes estejam na sala da conversa)
      this.server.to(`conversation:${createMessageDto.conversationId}`).emit('message:new', messagePayload);

      // Confirmar o envio para o cliente que enviou
      client.emit('message:sent', {
        success: true,
        message,
      });
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem: ${error.message}`, error.stack);
      client.emit('message:error', {
        success: false,
        error: error.message || 'Erro ao enviar mensagem',
      });
    }
  }

  @SubscribeMessage('conversation:join')
  @UseGuards(WsJwtGuard)
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
    @WsTenant() tenantId: string,
  ) {
    try {
      // Entrar na sala da conversa específica
      client.join(`conversation:${data.conversationId}`);
      this.logger.log(
        `Cliente ${client.id} entrou na conversa ${data.conversationId} do tenant ${tenantId}`,
      );

      return {
        event: 'conversation:joined',
        data: {
          success: true,
          conversationId: data.conversationId,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao entrar na conversa: ${error.message}`);
      return {
        event: 'conversation:error',
        data: {
          success: false,
          error: error.message,
        },
      };
    }
  }

  @SubscribeMessage('conversation:leave')
  @UseGuards(WsJwtGuard)
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      client.leave(`conversation:${data.conversationId}`);
      this.logger.log(`Cliente ${client.id} saiu da conversa ${data.conversationId}`);

      return {
        event: 'conversation:left',
        data: {
          success: true,
          conversationId: data.conversationId,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao sair da conversa: ${error.message}`);
      return {
        event: 'conversation:error',
        data: {
          success: false,
          error: error.message,
        },
      };
    }
  }

  // Método público para emitir novas mensagens (pode ser chamado por outros serviços)
  emitNewMessage(tenantId: string, conversation: any, message: any) {
    const payload = {
      message,
      conversation,
      timestamp: new Date().toISOString(),
    };

    this.server
      .to(`tenant:${tenantId}`)
      .to(`conversation:${conversation?.id ?? message?.conversationId}`)
      .emit('message:new', payload);
  }
}

