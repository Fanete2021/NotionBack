import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PageCommentEntity } from './entities';
import type { PageCommentRealtimeEvent } from './types';

@Injectable()
export class PageCommentsRealtimeService {
  private listener: ((event: PageCommentRealtimeEvent) => void) | null = null;

  constructor(
    @InjectPinoLogger(PageCommentsRealtimeService.name)
    private readonly logger: PinoLogger,
  ) {}

  /** Открытые страницы подписываются сюда, чтобы не тянуть сокеты в модуль комментариев. */
  register(publish: (event: PageCommentRealtimeEvent) => void): void {
    this.listener = publish;
  }

  publish(
    actorId: string,
    action: 'created' | 'updated',
    comment: PageCommentEntity,
  ): void {
    this.safeEmit({
      pageId: comment.pageId,
      action,
      commentId: comment.id,
      actorId,
      comment,
    });
  }

  publishDeleted(actorId: string, pageId: string, commentId: string): void {
    this.safeEmit({ pageId, action: 'deleted', commentId, actorId });
  }

  private safeEmit(event: PageCommentRealtimeEvent): void {
    if (!this.listener) return;

    try {
      this.listener(event);
    } catch (error) {
      this.logger.warn(
        {
          action: 'page_comment_publish',
          pageId: event.pageId,
          commentId: event.commentId,
          userId: event.actorId,
          reason: error instanceof Error ? error.message : 'broadcast_failed',
        },
        'page comment broadcast failed',
      );
    }
  }
}
