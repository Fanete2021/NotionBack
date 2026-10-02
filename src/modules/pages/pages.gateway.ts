import { TokenPayload } from '@modules/auth/types';
import { UsersService } from '@modules/users/users.service';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PagePresenceDto } from './dto';
import type { AuthedSocket, PresenceUser } from './types';

@WebSocketGateway({
  namespace: 'pages',
  cors: { origin: true, credentials: true },
})
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) => new WsException(errors),
  }),
)
export class PagesGateway implements OnGatewayInit, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly presence = new Map<string, Map<string, PresenceUser>>();

  private readonly socketPages = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server): void {
    server.use((client: AuthedSocket, next: (err?: Error) => void): void => {
      void (async (): Promise<void> => {
        try {
          const authToken: unknown = client.handshake.auth?.token;
          const headerToken: unknown = client.handshake.headers.authorization;

          const rawToken: string =
            typeof authToken === 'string' && authToken.length > 0
              ? authToken
              : typeof headerToken === 'string' && headerToken.length > 0
                ? headerToken
                : '';

          const token = rawToken.replace(/^Bearer\s+/i, '').trim();

          if (!token) {
            next(new Error('Unauthorized'));
            return;
          }

          const payload =
            await this.jwtService.verifyAsync<TokenPayload>(token);

          const user = await this.usersService.findOne(payload.sub);
          if (!user) {
            next(new Error('Unauthorized'));
            return;
          }

          client.data.user = {
            id: user.id,
            name: user.name,
            avatar: user.avatarUrl ?? null,
          } satisfies PresenceUser;

          next();
        } catch (e) {
          console.error('[PagesGateway] auth error:', e);
          next(new Error('Unauthorized'));
        }
      })();
    });
  }

  handleDisconnect(client: AuthedSocket) {
    const pages = this.socketPages.get(client.id);
    if (!pages) return;

    for (const pageId of pages) {
      this.removeFromPage(pageId, client.id);
      this.broadcastPresence(pageId);
    }

    this.socketPages.delete(client.id);
  }

  @SubscribeMessage('page:join')
  async handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() { pageId }: PagePresenceDto,
  ) {
    const user: PresenceUser | undefined = client.data.user;
    if (!user) return { ok: false };

    await client.join(this.room(pageId));

    if (!this.presence.has(pageId)) this.presence.set(pageId, new Map());
    this.presence.get(pageId)?.set(client.id, user);

    if (!this.socketPages.has(client.id))
      this.socketPages.set(client.id, new Set());
    this.socketPages.get(client.id)?.add(pageId);

    this.broadcastPresence(pageId);

    return { ok: true, users: this.getUsers(pageId) };
  }

  @SubscribeMessage('page:leave')
  async handleLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() { pageId }: PagePresenceDto,
  ) {
    await client.leave(this.room(pageId));

    this.removeFromPage(pageId, client.id);
    this.socketPages.get(client.id)?.delete(pageId);

    this.broadcastPresence(pageId);
    return { ok: true };
  }

  private room(pageId: string) {
    return `page:${pageId}`;
  }

  private removeFromPage(pageId: string, socketId: string) {
    const sockets = this.presence.get(pageId);
    if (!sockets) return;

    sockets.delete(socketId);

    if (sockets.size === 0) this.presence.delete(pageId);
  }

  private getUsers(pageId: string): PresenceUser[] {
    const sockets = this.presence.get(pageId);
    if (!sockets) return [];
    return [...new Map([...sockets.values()].map((u) => [u.id, u])).values()];
  }

  private broadcastPresence(pageId: string) {
    this.server
      .to(this.room(pageId))
      .emit('page:presence', { pageId, users: this.getUsers(pageId) });
  }
}
