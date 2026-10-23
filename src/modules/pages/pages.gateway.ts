import { TokenPayload } from '@modules/auth/types';
import { PageCommentsRealtimeService } from '@modules/page-comments/page-comments-realtime.service';
import { UsersService } from '@modules/users/users.service';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { OnModuleInit, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { Role } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Server } from 'socket.io';
import { getCorsOrigins } from '../../config/cors';
import { PagePresenceDto } from './dto';
import { PagesYjsService } from './pages-yjs.service';
import { PagesService } from './pages.service';
import type { AuthedSocket, PresenceUser } from './types';

interface YjsUpdatePayload {
  pageId: string;
  update: unknown;
}

@WebSocketGateway({
  namespace: 'pages',
  cors: { origin: getCorsOrigins(), credentials: true },
})
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) => new WsException(errors),
  }),
)
export class PagesGateway
  implements OnGatewayInit, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly presence = new Map<string, Map<string, PresenceUser>>();

  private readonly socketPages = new Map<string, Set<string>>();

  /** Страница → воркспейс, чтобы снять доступ при удалении участника. */
  private readonly pageWorkspace = new Map<string, string>();

  /**
   * Очередь событий сокета. Join, leave, disconnect и правки одного сокета
   * не пересекаются: счётчик документа и список участников меняются вместе.
   */
  private readonly socketTasks = new Map<string, Promise<void>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectPinoLogger(PagesGateway.name)
    private readonly logger: PinoLogger,
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
    private readonly pagesYjsService: PagesYjsService,
    private readonly pageCommentsRealtime: PageCommentsRealtimeService,
  ) {}

  onModuleInit(): void {
    this.workspacesService.registerPageSessionAccess({
      applyMembership: (workspaceId, userId, role) =>
        this.applyMembership(workspaceId, userId, role),
    });
    this.pageCommentsRealtime.register((event) => {
      this.server.to(this.room(event.pageId)).emit('page:comment', event);
    });
  }

  afterInit(server: Server): void {
    this.pagesYjsService.attach(() => this.server);

    server.use((client: AuthedSocket, next: (err?: Error) => void): void => {
      void (async (): Promise<void> => {
        try {
          const authToken: unknown = client.handshake.auth?.token;
          const headerToken: unknown = client.handshake.headers.authorization;

          const rawToken: string =
            (typeof authToken === 'string' && authToken) ||
            (typeof headerToken === 'string' && headerToken) ||
            '';

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
        } catch (error) {
          this.logger.warn(
            {
              action: 'page_presence_auth',
              reason: error instanceof Error ? error.message : 'invalid_token',
            },
            'access denied',
          );
          next(new Error('Unauthorized'));
        }
      })();
    });
  }

  handleDisconnect(client: AuthedSocket) {
    return this.runOnSocket(client.id, () => this.disconnect(client));
  }

  @SubscribeMessage('page:join')
  handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() { pageId }: PagePresenceDto,
  ) {
    return this.runOnSocket(client.id, () => this.join(client, pageId));
  }

  @SubscribeMessage('page:leave')
  handleLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() { pageId }: PagePresenceDto,
  ) {
    return this.runOnSocket(client.id, () => this.leave(client, pageId));
  }

  @SubscribeMessage('yjs:update')
  handleYjsUpdate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: YjsUpdatePayload,
  ) {
    return this.runOnSocket(client.id, () => this.onYjsUpdate(client, body));
  }

  /** Курсоры и выделения участников. Доступны и тем, у кого только чтение. */
  @SubscribeMessage('yjs:awareness')
  handleYjsAwareness(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: YjsUpdatePayload,
  ) {
    return this.runOnSocket(client.id, () => this.onYjsAwareness(client, body));
  }

  private async join(client: AuthedSocket, pageId: string) {
    if (!client.connected) return { ok: false };

    const user: PresenceUser | undefined = client.data.user;
    if (!user) return { ok: false };

    const alreadyJoined = this.socketPages.get(client.id)?.has(pageId) ?? false;
    const access = await this.authorize(user.id, pageId);
    if (!client.connected) return { ok: false };
    if (!access.ok) {
      if (alreadyJoined) await this.leave(client, pageId);
      return access;
    }
    const canEdit = access.canEdit;

    await client.join(this.room(pageId));
    if (!client.connected) {
      if (!alreadyJoined) await client.leave(this.room(pageId));
      return { ok: false };
    }

    try {
      await this.pagesYjsService.sync(client.id, pageId, alreadyJoined);
    } catch (error) {
      if (!alreadyJoined) await client.leave(this.room(pageId));
      this.logger.error(
        { action: 'yjs_load', pageId, err: error as unknown },
        'failed to load Yjs doc',
      );
      return { ok: false, error: 'Failed to load document' };
    }

    // Сокет умер, пока документ грузился: ссылку снимаем, в presence не пишем.
    if (!client.connected) {
      if (!alreadyJoined) await this.abandonJoin(client, pageId);
      return { ok: false };
    }

    this.pagesYjsService.setCanEdit(client.id, pageId, canEdit);
    this.pageWorkspace.set(pageId, access.workspaceId);

    if (!this.presence.has(pageId)) this.presence.set(pageId, new Map());
    this.presence.get(pageId)?.set(client.id, user);

    if (!this.socketPages.has(client.id))
      this.socketPages.set(client.id, new Set());
    this.socketPages.get(client.id)?.add(pageId);

    this.broadcastPresence(pageId);

    return { ok: true, users: this.getUsers(pageId), canEdit };
  }

  private async leave(client: AuthedSocket, pageId: string) {
    await client.leave(this.room(pageId));

    const wasJoined = this.socketPages.get(client.id)?.delete(pageId) ?? false;
    this.pagesYjsService.forgetEditor(client.id, pageId);
    if (wasJoined) this.pagesYjsService.removeCursor(pageId, client.id);
    this.removeFromPage(pageId, client.id);

    this.broadcastPresence(pageId);

    if (wasJoined) await this.pagesYjsService.release(pageId);

    return { ok: true };
  }

  private async disconnect(client: AuthedSocket) {
    const pages = this.socketPages.get(client.id);
    if (!pages) return;

    this.socketPages.delete(client.id);

    for (const pageId of pages) {
      this.pagesYjsService.forgetEditor(client.id, pageId);
      this.pagesYjsService.removeCursor(pageId, client.id);
      this.removeFromPage(pageId, client.id);
      this.broadcastPresence(pageId);
      await this.pagesYjsService.release(pageId);
    }
  }

  private async onYjsUpdate(client: AuthedSocket, body: YjsUpdatePayload) {
    const user: PresenceUser | undefined = client.data.user;
    const pageId = body?.pageId;

    if (!user || typeof pageId !== 'string') return { ok: false };

    if (!this.socketPages.get(client.id)?.has(pageId)) {
      return { ok: false, error: 'Join the page first' };
    }

    const access = await this.authorize(user.id, pageId);
    if (!client.connected) return { ok: false };
    if (!access.ok) {
      await this.leave(client, pageId);
      return access;
    }

    this.pagesYjsService.setCanEdit(client.id, pageId, access.canEdit);
    if (!access.canEdit) return { ok: false, error: 'Read-only access' };

    return this.pagesYjsService.applyUpdate({
      socketId: client.id,
      userId: user.id,
      pageId,
      update: body.update,
    });
  }

  private async onYjsAwareness(client: AuthedSocket, body: YjsUpdatePayload) {
    const user: PresenceUser | undefined = client.data.user;
    const pageId = body?.pageId;

    if (!user || typeof pageId !== 'string') return { ok: false };

    if (!this.socketPages.get(client.id)?.has(pageId)) {
      return { ok: false, error: 'Join the page first' };
    }

    const access = await this.authorize(user.id, pageId);
    if (!client.connected) return { ok: false };
    if (!access.ok) {
      await this.leave(client, pageId);
      return access;
    }

    return this.pagesYjsService.applyAwareness({
      socketId: client.id,
      pageId,
      update: body.update,
    });
  }

  /**
   * Новая роль участника на уже открытых страницах.
   * `null` снимает его с комнат: он больше не получает правки.
   */
  async applyMembership(
    workspaceId: string,
    userId: string,
    role: Role | null,
  ): Promise<void> {
    const targets: Array<{ socketId: string; pageId: string }> = [];
    for (const [pageId, sockets] of this.presence) {
      if (this.pageWorkspace.get(pageId) !== workspaceId) continue;
      for (const [socketId, present] of sockets) {
        if (present.id === userId) targets.push({ socketId, pageId });
      }
    }

    await Promise.all(
      targets.map(({ socketId, pageId }) =>
        this.runOnSocket(socketId, async () => {
          if (!this.presence.get(pageId)?.has(socketId)) return;
          if (role === null) {
            await this.dropSocket(socketId, pageId);
            return;
          }
          this.pagesYjsService.setCanEdit(
            socketId,
            pageId,
            role !== Role.VIEWER,
          );
        }),
      ),
    );
  }

  private async authorize(
    userId: string,
    pageId: string,
  ): Promise<
    | { ok: true; canEdit: boolean; workspaceId: string }
    | { ok: false; error: string }
  > {
    try {
      const page = await this.pagesService.findById(pageId);
      const role = await this.workspacesService.findMemberRole(
        page.workspaceId,
        userId,
      );
      if (!role) return { ok: false, error: 'Forbidden' };
      return {
        ok: true,
        canEdit: role !== Role.VIEWER,
        workspaceId: page.workspaceId,
      };
    } catch {
      return { ok: false, error: 'Page not found' };
    }
  }

  /** Убирает сокет со страницы, когда объекта сокета уже нет под рукой. */
  private async dropSocket(socketId: string, pageId: string): Promise<void> {
    this.server.in(socketId).socketsLeave(this.room(pageId));

    const wasJoined = this.socketPages.get(socketId)?.delete(pageId) ?? false;
    const pages = this.socketPages.get(socketId);
    if (pages && pages.size === 0) this.socketPages.delete(socketId);

    this.pagesYjsService.forgetEditor(socketId, pageId);
    if (wasJoined) this.pagesYjsService.removeCursor(pageId, socketId);
    this.removeFromPage(pageId, socketId);
    this.broadcastPresence(pageId);
    if (wasJoined) await this.pagesYjsService.release(pageId);
  }

  /** Join взял ссылку на документ, но сокет уже отключён. */
  private async abandonJoin(client: AuthedSocket, pageId: string) {
    this.pagesYjsService.forgetEditor(client.id, pageId);
    this.pagesYjsService.removeCursor(pageId, client.id);
    try {
      await client.leave(this.room(pageId));
    } catch {
      // Сокет уже закрыт, комнату снимает сам Socket.IO.
    }
    await this.pagesYjsService.release(pageId);
  }

  /**
   * Следующее событие сокета стартует после предыдущего.
   * Ошибка одного события очередь не останавливает.
   */
  private runOnSocket<T>(socketId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.socketTasks.get(socketId) ?? Promise.resolve();
    const current = previous.then(task);
    const done = current.then(
      () => undefined,
      () => undefined,
    );
    this.socketTasks.set(socketId, done);
    void done.then(() => {
      if (this.socketTasks.get(socketId) === done) {
        this.socketTasks.delete(socketId);
      }
    });
    return current;
  }

  private room(pageId: string): string {
    return `page:${pageId}`;
  }

  private removeFromPage(pageId: string, socketId: string) {
    const sockets = this.presence.get(pageId);
    if (!sockets) return;

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.presence.delete(pageId);
      this.pageWorkspace.delete(pageId);
    }
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
