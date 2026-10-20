import {
  YJS_MAX_UPDATE_BYTES,
  YjsDocService,
  YjsDocumentTooLargeError,
} from '@modules/pages/pages-content/yjs';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Subscription } from 'rxjs';
import { Server } from 'socket.io';

interface YjsClientUpdate {
  socketId: string;
  userId: string;
  pageId: string;
  update: unknown;
}

interface YjsClientAwareness {
  socketId: string;
  pageId: string;
  update: unknown;
}

type YjsAck = { ok: true } | { ok: false; error?: string };

/**
 * Сокетная часть совместного редактирования: синхронизация документа,
 * рассылка правок и курсоров. Список участников страницы остаётся в гейтвее.
 */
@Injectable()
class PagesYjsService implements OnModuleDestroy {
  private readonly editors = new Set<string>();

  private serverUpdatesSub?: Subscription;

  private getServer: () => Server = () => {
    throw new Error('Pages realtime server is not ready');
  };

  constructor(
    private readonly yjsDocService: YjsDocService,
    @InjectPinoLogger(PagesYjsService.name)
    private readonly logger: PinoLogger,
  ) {}

  /** `getServer` читается в момент рассылки: Nest проставляет server после создания гейтвея. */
  attach(getServer: () => Server): void {
    this.getServer = getServer;
    this.serverUpdatesSub?.unsubscribe();
    this.serverUpdatesSub = this.yjsDocService.serverUpdates$.subscribe(
      ({ pageId, update }) => {
        this.getServer()
          .in(this.room(pageId))
          .emit('yjs:update', { pageId, update: Buffer.from(update) });
      },
    );
  }

  onModuleDestroy(): void {
    this.serverUpdatesSub?.unsubscribe();
    this.serverUpdatesSub = undefined;
  }

  /**
   * Отдаёт клиенту полное состояние. Для нового входа увеличивает счётчик ссылок.
   * Если после этого отправка падает, счётчик снимается здесь же.
   */
  async sync(
    socketId: string,
    pageId: string,
    alreadyJoined: boolean,
  ): Promise<void> {
    let acquired = false;
    try {
      const state = alreadyJoined
        ? await this.yjsDocService.getState(pageId)
        : await this.yjsDocService.acquire(pageId);
      acquired = !alreadyJoined;

      this.sendSync(socketId, pageId, state);

      const awareness = this.yjsDocService.getAwarenessState(pageId);
      if (awareness) this.sendAwareness(socketId, pageId, awareness);
    } catch (error) {
      if (acquired) await this.release(pageId);
      throw error;
    }
  }

  setCanEdit(socketId: string, pageId: string, canEdit: boolean): void {
    const key = this.editorKey(socketId, pageId);
    if (canEdit) this.editors.add(key);
    else this.editors.delete(key);
  }

  forgetEditor(socketId: string, pageId: string): void {
    this.editors.delete(this.editorKey(socketId, pageId));
  }

  removeCursor(pageId: string, socketId: string): void {
    const removal = this.yjsDocService.removeAwareness(pageId, socketId);
    if (!removal) return;

    this.getServer()
      .in(this.room(pageId))
      .except(socketId)
      .emit('yjs:awareness', { pageId, update: Buffer.from(removal) });
  }

  async release(pageId: string): Promise<void> {
    try {
      await this.yjsDocService.release(pageId);
    } catch (error) {
      this.logger.error(
        { action: 'yjs_release', pageId, err: error as unknown },
        'failed to release Yjs doc',
      );
    }
  }

  applyUpdate(input: YjsClientUpdate): YjsAck {
    if (!this.editors.has(this.editorKey(input.socketId, input.pageId))) {
      return { ok: false, error: 'Read-only access' };
    }

    const update = this.toUint8Array(input.update);
    if (!update || update.byteLength === 0) {
      return { ok: false, error: 'Invalid update' };
    }
    if (update.byteLength > YJS_MAX_UPDATE_BYTES) {
      return { ok: false, error: 'Update is too large' };
    }

    try {
      this.yjsDocService.applyUpdate(input.pageId, update, input.userId);
    } catch (error) {
      if (error instanceof YjsDocumentTooLargeError) {
        return { ok: false, error: 'Document is too large' };
      }
      this.logger.warn(
        {
          action: 'yjs_update_rejected',
          pageId: input.pageId,
          reason: String(error),
        },
        'rejected Yjs update',
      );
      return { ok: false, error: 'Invalid update' };
    }

    this.getServer()
      .in(this.room(input.pageId))
      .except(input.socketId)
      .emit('yjs:update', {
        pageId: input.pageId,
        update: Buffer.from(update),
      });

    return { ok: true };
  }

  applyAwareness(input: YjsClientAwareness): YjsAck {
    const update = this.toUint8Array(input.update);
    if (!update || update.byteLength === 0) {
      return { ok: false, error: 'Invalid update' };
    }
    if (update.byteLength > YJS_MAX_UPDATE_BYTES) {
      return { ok: false, error: 'Update is too large' };
    }

    try {
      this.yjsDocService.applyAwareness(input.pageId, update, input.socketId);
    } catch (error) {
      this.logger.warn(
        {
          action: 'yjs_awareness_rejected',
          pageId: input.pageId,
          reason: String(error),
        },
        'rejected awareness update',
      );
      return { ok: false, error: 'Invalid update' };
    }

    this.getServer()
      .in(this.room(input.pageId))
      .except(input.socketId)
      .emit('yjs:awareness', {
        pageId: input.pageId,
        update: Buffer.from(update),
      });

    return { ok: true };
  }

  private sendAwareness(
    socketId: string,
    pageId: string,
    state: Uint8Array,
  ): void {
    this.getServer()
      .to(socketId)
      .emit('yjs:awareness', { pageId, update: Buffer.from(state) });
  }

  private sendSync(socketId: string, pageId: string, state: Uint8Array): void {
    this.getServer()
      .to(socketId)
      .emit('yjs:sync', { pageId, update: Buffer.from(state) });
  }

  private editorKey(socketId: string, pageId: string): string {
    return `${socketId}:${pageId}`;
  }

  private toUint8Array(value: unknown): Uint8Array | null {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (Array.isArray(value) && value.every(this.isByte)) {
      return Uint8Array.from(value);
    }
    return null;
  }

  private isByte(value: unknown): value is number {
    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 255
    );
  }

  private room(pageId: string): string {
    return `page:${pageId}`;
  }
}

export { PagesYjsService };
export type { YjsAck };
