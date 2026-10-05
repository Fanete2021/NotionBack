import { TokenPayload } from '@modules/auth/types';
import { UsersService } from '@modules/users/users.service';
import {
  YJS_MAX_UPDATE_BYTES,
  YjsDocService,
} from '@modules/pages/pages-content/yjs';
import { WorkspacesService } from '@modules/workspaces/workspaces.service';
import { OnModuleDestroy, UsePipes, ValidationPipe } from '@nestjs/common';
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
import { Subscription } from 'rxjs';
import { Server } from 'socket.io';
import { getCorsOrigins } from '../../config/cors';
import { PagePresenceDto } from './dto';
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
  implements OnGatewayInit, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly presence = new Map<string, Map<string, PresenceUser>>();

  private readonly socketPages = new Map<string, Set<string>>();

  /** Пары `socketId:pageId`, которым разрешено писать в документ. */
  private readonly editors = new Set<string>();

  private serverUpdatesSub?: Subscription;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @InjectPinoLogger(PagesGateway.name)
    private readonly logger: PinoLogger,
    private readonly pagesService: PagesService,
    private readonly workspacesService: WorkspacesService,
    private readonly yjsDocService: YjsDocService,
  ) {}

  onModuleDestroy(): void {
    this.serverUpdatesSub?.unsubscribe();
  }

  afterInit(server: Server): void {
    // Правки, сделанные сервером (восстановление версии), получают все участники.
    this.serverUpdatesSub = this.yjsDocService.serverUpdates$.subscribe(
      ({ pageId, update }) => {
        this.server
          .in(this.room(pageId))
          .emit('yjs:update', { pageId, update: Buffer.from(update) });
      },
    );

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

  async handleDisconnect(client: AuthedSocket) {
    const pages = this.socketPages.get(client.id);
    if (!pages) return;

    this.socketPages.delete(client.id);

    for (const pageId of pages) {
      this.editors.delete(this.editorKey(client.id, pageId));
      this.dropAwareness(pageId, client.id);
      this.removeFromPage(pageId, client.id);
      this.broadcastPresence(pageId);
      await this.releaseDoc(pageId);
    }
  }

  @SubscribeMessage('page:join')
  async handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() { pageId }: PagePresenceDto,
  ) {
    const user: PresenceUser | undefined = client.data.user;
    if (!user) return { ok: false };

    let canEdit: boolean;
    try {
      const page = await this.pagesService.findById(pageId);
      const role = await this.workspacesService.findMemberRole(
        page.workspaceId,
        user.id,
      );
      if (!role) return { ok: false, error: 'Forbidden' };
      canEdit = role !== Role.VIEWER;
    } catch {
      return { ok: false, error: 'Page not found' };
    }

    const alreadyJoined = this.socketPages.get(client.id)?.has(pageId);

    await client.join(this.room(pageId));

    try {
      // Повторный join не должен увеличивать счётчик ссылок на документ.
      const state = alreadyJoined
        ? await this.yjsDocService.getState(pageId)
        : await this.yjsDocService.acquire(pageId);
      this.sendSync(client.id, pageId, state);

      const awareness = this.yjsDocService.getAwarenessState(pageId);
      if (awareness) this.sendAwareness(client.id, pageId, awareness);
    } catch (e) {
      if (!alreadyJoined) await client.leave(this.room(pageId));
      this.logger.error(
        { action: 'yjs_load', pageId, err: e as unknown },
        'failed to load Yjs doc',
      );
      return { ok: false, error: 'Failed to load document' };
    }

    if (canEdit) this.editors.add(this.editorKey(client.id, pageId));
    else this.editors.delete(this.editorKey(client.id, pageId));

    if (!this.presence.has(pageId)) this.presence.set(pageId, new Map());
    this.presence.get(pageId)?.set(client.id, user);

    if (!this.socketPages.has(client.id))
      this.socketPages.set(client.id, new Set());
    this.socketPages.get(client.id)?.add(pageId);

    this.broadcastPresence(pageId);

    return { ok: true, users: this.getUsers(pageId), canEdit };
  }

  @SubscribeMessage('page:leave')
  async handleLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() { pageId }: PagePresenceDto,
  ) {
    await client.leave(this.room(pageId));

    const wasJoined = this.socketPages.get(client.id)?.delete(pageId);
    this.editors.delete(this.editorKey(client.id, pageId));
    if (wasJoined) this.dropAwareness(pageId, client.id);
    this.removeFromPage(pageId, client.id);

    this.broadcastPresence(pageId);

    if (wasJoined) await this.releaseDoc(pageId);

    return { ok: true };
  }

  @SubscribeMessage('yjs:update')
  handleYjsUpdate(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: YjsUpdatePayload,
  ) {
    const user: PresenceUser | undefined = client.data.user;
    const pageId = body?.pageId;

    if (!user || typeof pageId !== 'string') return { ok: false };

    if (!this.socketPages.get(client.id)?.has(pageId)) {
      return { ok: false, error: 'Join the page first' };
    }

    if (!this.editors.has(this.editorKey(client.id, pageId))) {
      return { ok: false, error: 'Read-only access' };
    }

    const update = this.toUint8Array(body.update);
    if (!update || update.byteLength === 0) {
      return { ok: false, error: 'Invalid update' };
    }
    if (update.byteLength > YJS_MAX_UPDATE_BYTES) {
      return { ok: false, error: 'Update is too large' };
    }

    try {
      this.yjsDocService.applyUpdate(pageId, update, user.id);
    } catch (e) {
      this.logger.warn(
        { action: 'yjs_update_rejected', pageId, reason: String(e) },
        'rejected Yjs update',
      );
      return { ok: false, error: 'Invalid update' };
    }

    this.server
      .in(this.room(pageId))
      .except(client.id)
      .emit('yjs:update', { pageId, update: Buffer.from(update) });

    return { ok: true };
  }

  /** Курсоры и выделения участников. Доступны и тем, у кого только чтение. */
  @SubscribeMessage('yjs:awareness')
  handleYjsAwareness(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: YjsUpdatePayload,
  ) {
    const pageId = body?.pageId;

    if (typeof pageId !== 'string') return { ok: false };

    if (!this.socketPages.get(client.id)?.has(pageId)) {
      return { ok: false, error: 'Join the page first' };
    }

    const update = this.toUint8Array(body.update);
    if (!update || update.byteLength === 0) {
      return { ok: false, error: 'Invalid update' };
    }
    if (update.byteLength > YJS_MAX_UPDATE_BYTES) {
      return { ok: false, error: 'Update is too large' };
    }

    try {
      this.yjsDocService.applyAwareness(pageId, update, client.id);
    } catch (e) {
      this.logger.warn(
        { action: 'yjs_awareness_rejected', pageId, reason: String(e) },
        'rejected awareness update',
      );
      return { ok: false, error: 'Invalid update' };
    }

    this.server
      .in(this.room(pageId))
      .except(client.id)
      .emit('yjs:awareness', { pageId, update: Buffer.from(update) });

    return { ok: true };
  }

  private sendAwareness(socketId: string, pageId: string, state: Uint8Array) {
    this.server
      .to(socketId)
      .emit('yjs:awareness', { pageId, update: Buffer.from(state) });
  }

  /** Убирает курсоры ушедшего сокета у остальных участников. */
  private dropAwareness(pageId: string, socketId: string) {
    const removal = this.yjsDocService.removeAwareness(pageId, socketId);
    if (!removal) return;

    this.server
      .in(this.room(pageId))
      .except(socketId)
      .emit('yjs:awareness', { pageId, update: Buffer.from(removal) });
  }

  private sendSync(socketId: string, pageId: string, state: Uint8Array) {
    this.server
      .to(socketId)
      .emit('yjs:sync', { pageId, update: Buffer.from(state) });
  }

  private async releaseDoc(pageId: string) {
    try {
      await this.yjsDocService.release(pageId);
    } catch (e) {
      this.logger.error(
        { action: 'yjs_release', pageId, err: e as unknown },
        'failed to release Yjs doc',
      );
    }
  }

  private editorKey(socketId: string, pageId: string) {
    return `${socketId}:${pageId}`;
  }

  private toUint8Array(value: unknown): Uint8Array | null {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return null;
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
